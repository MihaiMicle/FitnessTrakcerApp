"""The activity feed: reading events, liking them and commenting on them"""

from typing import List, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from core.database import get_db
from core.feed import clamp_page_size, decode_cursor, encode_cursor
from core.feed_queries import recount_engagement
from core.security import get_current_user
from core.social import relationship_state
from core.social_queries import (
    accepted_following_ids,
    assert_not_blocked,
    blocked_user_ids,
    visible_content_filter,
)
from models.feed import FeedComment, FeedEvent, FeedLike
from models.profile import UserProfile
from models.social import Follow, UserBlock
from schemas.feed import (
    FeedCommentCreate,
    FeedCommentItem,
    FeedEventItem,
    FeedLikeResult,
    FeedPage,
)
from schemas.social import PublicUserSummary

from .common import load_profile, social_router

router = social_router()


def _author_map(
    db: Session, user_ids: List[str], viewer_id: str
) -> dict[str, PublicUserSummary]:
    """
    Build the author summary for every id on the page in a fixed number of
    queries

    `common.summarize` runs two lookups per profile, which is fine for a
    follower list and not fine for a feed page: twenty cards would be sixty
    round trips. The relationship data is loaded in bulk here instead
    """
    ids = [uid for uid in dict.fromkeys(user_ids) if uid]
    if not ids:
        return {}

    profiles = db.query(UserProfile).filter(UserProfile.user_id.in_(ids)).all()

    follow_status = dict(
        db.query(Follow.following_id, Follow.status)
        .filter(Follow.follower_id == viewer_id, Follow.following_id.in_(ids))
        .all()
    )

    block_rows = (
        db.query(UserBlock.blocker_id, UserBlock.blocked_id)
        .filter(
            or_(
                and_(UserBlock.blocker_id == viewer_id, UserBlock.blocked_id.in_(ids)),
                and_(UserBlock.blocked_id == viewer_id, UserBlock.blocker_id.in_(ids)),
            )
        )
        .all()
    )
    blocked = {
        blocked_id if blocker_id == viewer_id else blocker_id
        for blocker_id, blocked_id in block_rows
    }

    return {
        profile.user_id: PublicUserSummary(
            id=profile.user_id,
            username=profile.username,
            first_name=profile.first_name,
            last_name=profile.last_name,
            avatar_url=profile.avatar_url,
            is_private=bool(profile.is_private),
            relationship=relationship_state(
                viewer_id=viewer_id,
                target_id=profile.user_id,
                follow_status=follow_status.get(profile.user_id),
                is_blocked=profile.user_id in blocked,
            ),
        )
        for profile in profiles
    }


def _fallback_author(user_id: str) -> PublicUserSummary:
    """A deleted or unreadable profile still needs a card that renders"""
    return PublicUserSummary(id=user_id)


def _load_visible_event(db: Session, event_id: UUID, viewer_id: str) -> FeedEvent:
    """
    Fetch an event the viewer is allowed to read

    404 rather than 403 when the event exists but is closed to them, so probing
    ids cannot map out a private account's activity
    """
    event = (
        db.query(FeedEvent)
        .filter(
            FeedEvent.id == event_id,
            visible_content_filter(db, FeedEvent, viewer_id),
        )
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Post not found")
    return event


def _liked_event_ids(db: Session, event_ids: List, viewer_id: str) -> set:
    """Which of the page's events the viewer has already liked"""
    if not event_ids:
        return set()

    rows = (
        db.query(FeedLike.event_id)
        .filter(FeedLike.user_id == viewer_id, FeedLike.event_id.in_(event_ids))
        .all()
    )
    return {row[0] for row in rows}


@router.get("/feed", response_model=FeedPage)
def get_feed(
    scope: str = Query("following", pattern="^(following|me|user)$"),
    user_id: Optional[str] = Query(None),
    cursor: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    A page of activity, newest first

    `following` is the home feed and includes the caller's own activity, which
    is what makes a new account's feed non-empty and lets the author see how
    their post reads. `me` is the profile timeline, `user` is someone else's

    Visibility is applied by the same clause every other content listing uses,
    so a followers-only workout is filtered in the database rather than loaded
    and discarded
    """
    query = db.query(FeedEvent).filter(
        visible_content_filter(db, FeedEvent, current_user_id)
    )

    if scope == "me":
        query = query.filter(FeedEvent.user_id == current_user_id)
    elif scope == "user":
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        assert_not_blocked(db, current_user_id, user_id)
        load_profile(db, user_id)
        query = query.filter(FeedEvent.user_id == user_id)
    else:
        authors = accepted_following_ids(db, current_user_id) + [current_user_id]
        excluded = blocked_user_ids(db, current_user_id)
        query = query.filter(FeedEvent.user_id.in_(authors))
        if excluded:
            query = query.filter(FeedEvent.user_id.notin_(excluded))

    position = decode_cursor(cursor)
    if position:
        moment, last_id = position
        try:
            last_uuid = UUID(last_id)
        except (ValueError, AttributeError):
            last_uuid = None

        if last_uuid is not None:
            # Keyset on the full sort key, or two events sharing a timestamp
            # would drop one of them at the page boundary
            query = query.filter(
                or_(
                    FeedEvent.occurred_at < moment,
                    and_(FeedEvent.occurred_at == moment, FeedEvent.id < last_uuid),
                )
            )

    page_size = clamp_page_size(limit)
    events = (
        query.order_by(FeedEvent.occurred_at.desc(), FeedEvent.id.desc())
        .limit(page_size + 1)
        .all()
    )

    # One extra row is fetched purely to answer "is there another page"
    has_more = len(events) > page_size
    events = events[:page_size]

    authors = _author_map(db, [event.user_id for event in events], current_user_id)
    liked = _liked_event_ids(db, [event.id for event in events], current_user_id)

    items = [
        FeedEventItem(
            id=str(event.id),
            event_type=event.event_type,
            visibility=event.visibility,
            author=authors.get(event.user_id) or _fallback_author(event.user_id),
            subject_type=event.subject_type,
            subject_id=event.subject_id,
            title=event.title,
            payload=event.payload or {},
            like_count=event.like_count or 0,
            comment_count=event.comment_count or 0,
            liked_by_me=event.id in liked,
            occurred_at=event.occurred_at,
        )
        for event in events
    ]

    next_cursor = (
        encode_cursor(events[-1].occurred_at, events[-1].id)
        if has_more and events
        else None
    )
    return FeedPage(items=items, next_cursor=next_cursor)


@router.post("/feed/{event_id}/like", response_model=FeedLikeResult)
def like_event(
    event_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Like an event, idempotently: liking twice leaves one row"""
    event = _load_visible_event(db, event_id, current_user_id)

    existing = (
        db.query(FeedLike)
        .filter(FeedLike.event_id == event.id, FeedLike.user_id == current_user_id)
        .first()
    )
    if not existing:
        db.add(FeedLike(event_id=event.id, user_id=current_user_id))
        db.flush()
        recount_engagement(db, [event.id])
        db.commit()
        db.refresh(event)

    return FeedLikeResult(
        event_id=str(event.id), liked_by_me=True, like_count=event.like_count or 0
    )


@router.delete("/feed/{event_id}/like", response_model=FeedLikeResult)
def unlike_event(
    event_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a like

    Returns the resulting state rather than 204 so the button can settle on the
    server's count instead of guessing after an optimistic update
    """
    event = _load_visible_event(db, event_id, current_user_id)

    existing = (
        db.query(FeedLike)
        .filter(FeedLike.event_id == event.id, FeedLike.user_id == current_user_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.flush()
        recount_engagement(db, [event.id])
        db.commit()
        db.refresh(event)

    return FeedLikeResult(
        event_id=str(event.id), liked_by_me=False, like_count=event.like_count or 0
    )


@router.get("/feed/{event_id}/comments", response_model=List[FeedCommentItem])
def list_comments(
    event_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Comments on an event, oldest first

    Comments from users in a block relationship with the caller are dropped.
    Blocking has to hide the blocked user everywhere, not only on their own
    posts, or a thread becomes a way around it
    """
    event = _load_visible_event(db, event_id, current_user_id)

    excluded = set(blocked_user_ids(db, current_user_id))
    comments = (
        db.query(FeedComment)
        .filter(FeedComment.event_id == event.id)
        .order_by(FeedComment.created_at.asc())
        .all()
    )
    comments = [c for c in comments if c.user_id not in excluded]

    authors = _author_map(db, [c.user_id for c in comments], current_user_id)
    return [
        FeedCommentItem(
            id=str(comment.id),
            event_id=str(event.id),
            author=authors.get(comment.user_id) or _fallback_author(comment.user_id),
            body=comment.body,
            created_at=comment.created_at,
            can_delete=current_user_id in (comment.user_id, event.user_id),
        )
        for comment in comments
    ]


@router.post(
    "/feed/{event_id}/comments",
    response_model=FeedCommentItem,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    event_id: UUID,
    payload: FeedCommentCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Post a comment on an event the caller can read"""
    event = _load_visible_event(db, event_id, current_user_id)
    assert_not_blocked(db, current_user_id, event.user_id)

    comment = FeedComment(
        event_id=event.id, user_id=current_user_id, body=payload.body
    )
    db.add(comment)
    db.flush()
    recount_engagement(db, [event.id])
    db.commit()
    db.refresh(comment)

    authors = _author_map(db, [current_user_id], current_user_id)
    return FeedCommentItem(
        id=str(comment.id),
        event_id=str(event.id),
        author=authors.get(current_user_id) or _fallback_author(current_user_id),
        body=comment.body,
        created_at=comment.created_at,
        can_delete=True,
    )


@router.delete(
    "/feed/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_comment(
    comment_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a comment, as its author or as the owner of the post

    The post owner needs this because they cannot block their way out of a
    single unwanted reply on their own workout
    """
    comment = db.query(FeedComment).filter(FeedComment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    event = db.query(FeedEvent).filter(FeedEvent.id == comment.event_id).first()
    owner_id = event.user_id if event else None

    if current_user_id not in (comment.user_id, owner_id):
        raise HTTPException(status_code=404, detail="Comment not found")

    event_id = comment.event_id
    db.delete(comment)
    db.flush()
    recount_engagement(db, [event_id])
    db.commit()
    return None
