from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from core.database import get_db
from core.security import get_current_user
from core.social import (
    FOLLOW_ACCEPTED,
    FOLLOW_PENDING,
    REL_BLOCKED,
    UsernameError,
    initial_follow_status,
    normalize_username,
    relationship_state,
    validate_username,
)
from core.social_queries import (
    assert_not_blocked,
    blocked_user_ids,
    get_follow,
    is_blocked_between,
    is_following,
    recount_follows,
)
from models.profile import UserProfile
from models.social import Follow, UserBlock
from schemas.social import (
    FollowRequestItem,
    FollowResponse,
    PublicUserProfile,
    PublicUserSummary,
    SocialSettingsUpdate,
    UsernameAvailability,
    UserSearchResults,
)

router = APIRouter(prefix="/social", tags=["Social"])


def _load_profile(db: Session, user_id: str) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


def _summarize(
    db: Session, profile: UserProfile, viewer_id: Optional[str]
) -> PublicUserSummary:
    """Build the list-item shape, resolving the viewer's relationship to it"""
    edge = get_follow(db, viewer_id, profile.user_id) if viewer_id else None
    return PublicUserSummary(
        id=profile.user_id,
        username=profile.username,
        first_name=profile.first_name,
        last_name=profile.last_name,
        avatar_url=profile.avatar_url,
        is_private=bool(profile.is_private),
        relationship=relationship_state(
            viewer_id=viewer_id,
            target_id=profile.user_id,
            follow_status=edge.status if edge else None,
            is_blocked=is_blocked_between(db, viewer_id, profile.user_id),
        ),
    )


# Settings


@router.get("/me/settings")
def get_my_social_settings(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """The authenticated user's own handle, privacy flag and content defaults"""
    profile = _load_profile(db, current_user_id)
    pending = (
        db.query(Follow.id)
        .filter(Follow.following_id == current_user_id, Follow.status == FOLLOW_PENDING)
        .count()
    )
    return {
        "username": profile.username,
        "bio": profile.bio,
        "is_private": bool(profile.is_private),
        "default_workout_visibility": profile.default_workout_visibility,
        "default_routine_visibility": profile.default_routine_visibility,
        "followers_count": profile.followers_count or 0,
        "following_count": profile.following_count or 0,
        "pending_requests_count": pending,
    }


@router.put("/me/settings")
def update_my_social_settings(
    payload: SocialSettingsUpdate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update handle, privacy and per-content defaults

    Going from private to public auto-accepts every pending request, which is
    what the toggle implies: there is nothing left to approve
    """
    profile = _load_profile(db, current_user_id)
    data = payload.model_dump(exclude_unset=True)

    if "username" in data and data["username"] != profile.username:
        taken = (
            db.query(UserProfile.user_id)
            .filter(
                UserProfile.username == data["username"],
                UserProfile.user_id != current_user_id,
            )
            .first()
        )
        if taken:
            raise HTTPException(status_code=409, detail="Username already taken")
        profile.username = data["username"]

    for field in ("bio", "default_workout_visibility", "default_routine_visibility"):
        if field in data:
            setattr(profile, field, data[field])

    if "is_private" in data:
        was_private = bool(profile.is_private)
        profile.is_private = data["is_private"]

        if was_private and not profile.is_private:
            db.query(Follow).filter(
                Follow.following_id == current_user_id,
                Follow.status == FOLLOW_PENDING,
            ).update(
                {Follow.status: FOLLOW_ACCEPTED, Follow.responded_at: func.now()},
                synchronize_session=False,
            )

    db.flush()
    recount_follows(db, [current_user_id])
    db.commit()
    db.refresh(profile)

    return get_my_social_settings(current_user_id=current_user_id, db=db)


@router.get("/username-available", response_model=UsernameAvailability)
def check_username(
    username: str = Query(..., min_length=1),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Live check for the handle picker, applying the same rules as the writer"""
    try:
        candidate = validate_username(username)
    except UsernameError as exc:
        return UsernameAvailability(
            username=normalize_username(username), available=False, reason=str(exc)
        )

    taken = (
        db.query(UserProfile.user_id)
        .filter(
            UserProfile.username == candidate,
            UserProfile.user_id != current_user_id,
        )
        .first()
    )
    return UsernameAvailability(
        username=candidate,
        available=taken is None,
        reason="Username already taken" if taken else None,
    )


# Discovery


@router.get("/users/search", response_model=UserSearchResults)
def search_users(
    q: str = Query(..., min_length=2, max_length=50),
    limit: int = Query(20, ge=1, le=50),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Find users by handle or name

    Blocked users are dropped in either direction, and accounts without a
    username are not discoverable at all
    """
    term = f"%{normalize_username(q)}%"
    excluded = blocked_user_ids(db, current_user_id)

    query = (
        db.query(UserProfile)
        .filter(
            UserProfile.username.isnot(None),
            UserProfile.user_id != current_user_id,
            or_(
                UserProfile.username.ilike(term),
                UserProfile.first_name.ilike(term),
                UserProfile.last_name.ilike(term),
            ),
        )
        .order_by(UserProfile.username.asc())
    )
    if excluded:
        query = query.filter(UserProfile.user_id.notin_(excluded))

    profiles = query.limit(limit).all()
    return UserSearchResults(
        query=q,
        results=[_summarize(db, p, current_user_id) for p in profiles],
    )


@router.get("/users/{username}", response_model=PublicUserProfile)
def get_user_profile(
    username: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    A public profile card by handle

    The card itself is always returned so a private account is still findable
    and followable. `can_view_content` tells the client whether to request the
    user's workouts or render a locked state instead
    """
    handle = normalize_username(username)
    profile = (
        db.query(UserProfile).filter(UserProfile.username == handle).first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    assert_not_blocked(db, current_user_id, profile.user_id)

    summary = _summarize(db, profile, current_user_id)
    is_self = profile.user_id == current_user_id
    can_view = is_self or not profile.is_private or is_following(
        db, current_user_id, profile.user_id
    )

    return PublicUserProfile(
        **summary.model_dump(),
        bio=profile.bio,
        followers_count=profile.followers_count or 0,
        following_count=profile.following_count or 0,
        can_view_content=can_view,
    )


# Follow graph


@router.post("/follow/{user_id}", response_model=FollowResponse)
def follow_user(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Follow a user, or request to follow when their account is private

    Idempotent: following someone twice returns the existing edge rather than
    resetting an accepted follow back to pending
    """
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")

    target = _load_profile(db, user_id)
    assert_not_blocked(db, current_user_id, user_id)

    edge = get_follow(db, current_user_id, user_id)
    if not edge:
        edge = Follow(
            follower_id=current_user_id,
            following_id=user_id,
            status=initial_follow_status(bool(target.is_private)),
        )
        db.add(edge)
        db.flush()
        recount_follows(db, [current_user_id, user_id])
        db.commit()
        db.refresh(edge)

    return FollowResponse(
        following_id=user_id,
        status=edge.status,
        relationship=relationship_state(
            viewer_id=current_user_id, target_id=user_id, follow_status=edge.status
        ),
    )


@router.delete("/follow/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unfollow_user(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unfollow, or withdraw a pending request. Both delete the same row"""
    edge = get_follow(db, current_user_id, user_id)
    if not edge:
        raise HTTPException(status_code=404, detail="You are not following this user")

    db.delete(edge)
    db.flush()
    recount_follows(db, [current_user_id, user_id])
    db.commit()
    return None


@router.delete("/followers/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_follower(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Drop someone who follows you

    Needed alongside blocking: removing a follower revokes their access to
    followers-only content without the heavier consequences of a block
    """
    edge = get_follow(db, user_id, current_user_id)
    if not edge:
        raise HTTPException(status_code=404, detail="That user does not follow you")

    db.delete(edge)
    db.flush()
    recount_follows(db, [current_user_id, user_id])
    db.commit()
    return None


@router.get("/followers", response_model=List[PublicUserSummary])
def list_followers(
    user_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accepted followers of the given user, defaulting to the caller

    Another user's follower list is only readable when their content is
    readable, so a private account's graph stays closed
    """
    target_id = user_id or current_user_id
    _guard_graph_access(db, current_user_id, target_id)

    profiles = (
        db.query(UserProfile)
        .join(Follow, Follow.follower_id == UserProfile.user_id)
        .filter(Follow.following_id == target_id, Follow.status == FOLLOW_ACCEPTED)
        .order_by(Follow.created_at.desc())
        .all()
    )
    return [_summarize(db, p, current_user_id) for p in profiles]


@router.get("/following", response_model=List[PublicUserSummary])
def list_following(
    user_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accounts the given user follows, defaulting to the caller"""
    target_id = user_id or current_user_id
    _guard_graph_access(db, current_user_id, target_id)

    profiles = (
        db.query(UserProfile)
        .join(Follow, Follow.following_id == UserProfile.user_id)
        .filter(Follow.follower_id == target_id, Follow.status == FOLLOW_ACCEPTED)
        .order_by(Follow.created_at.desc())
        .all()
    )
    return [_summarize(db, p, current_user_id) for p in profiles]


def _guard_graph_access(db: Session, viewer_id: str, target_id: str) -> None:
    """A private account's follower and following lists are followers-only"""
    if viewer_id == target_id:
        return

    assert_not_blocked(db, viewer_id, target_id)
    target = _load_profile(db, target_id)
    if target.is_private and not is_following(db, viewer_id, target_id):
        raise HTTPException(status_code=403, detail="This account is private")


# Follow requests


@router.get("/requests", response_model=List[FollowRequestItem])
def list_follow_requests(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Incoming requests waiting on the caller's approval"""
    rows = (
        db.query(Follow, UserProfile)
        .join(UserProfile, UserProfile.user_id == Follow.follower_id)
        .filter(
            Follow.following_id == current_user_id, Follow.status == FOLLOW_PENDING
        )
        .order_by(Follow.created_at.desc())
        .all()
    )
    return [
        FollowRequestItem(
            follow_id=str(edge.id),
            user=_summarize(db, profile, current_user_id),
            created_at=edge.created_at,
        )
        for edge, profile in rows
    ]


@router.post("/requests/{user_id}/accept", response_model=FollowResponse)
def accept_follow_request(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a pending request, granting access to followers-only content"""
    edge = get_follow(db, user_id, current_user_id)
    if not edge or edge.status != FOLLOW_PENDING:
        raise HTTPException(status_code=404, detail="No pending request from that user")

    edge.status = FOLLOW_ACCEPTED
    edge.responded_at = func.now()
    db.flush()
    recount_follows(db, [current_user_id, user_id])
    db.commit()

    return FollowResponse(
        following_id=current_user_id,
        status=FOLLOW_ACCEPTED,
        relationship=relationship_state(
            viewer_id=user_id, target_id=current_user_id, follow_status=FOLLOW_ACCEPTED
        ),
    )


@router.post("/requests/{user_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
def reject_follow_request(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Decline a pending request by deleting the edge"""
    edge = get_follow(db, user_id, current_user_id)
    if not edge or edge.status != FOLLOW_PENDING:
        raise HTTPException(status_code=404, detail="No pending request from that user")

    db.delete(edge)
    db.commit()
    return None


# Blocking


@router.post("/block/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def block_user(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Block a user and tear down any follow edges between the two

    Removing the edges matters because visibility is evaluated per request: a
    surviving accepted follow would keep granting followers-only access if the
    block were ever lifted
    """
    if user_id == current_user_id:
        raise HTTPException(status_code=400, detail="You cannot block yourself")

    _load_profile(db, user_id)

    existing = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == current_user_id, UserBlock.blocked_id == user_id
        )
        .first()
    )
    if not existing:
        db.add(UserBlock(blocker_id=current_user_id, blocked_id=user_id))

    db.query(Follow).filter(
        or_(
            (Follow.follower_id == current_user_id)
            & (Follow.following_id == user_id),
            (Follow.follower_id == user_id)
            & (Follow.following_id == current_user_id),
        )
    ).delete(synchronize_session=False)

    db.flush()
    recount_follows(db, [current_user_id, user_id])
    db.commit()
    return None


@router.delete("/block/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_user(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lift a block. Follows are not restored, the user must follow again"""
    existing = (
        db.query(UserBlock)
        .filter(
            UserBlock.blocker_id == current_user_id, UserBlock.blocked_id == user_id
        )
        .first()
    )
    if not existing:
        raise HTTPException(status_code=404, detail="That user is not blocked")

    db.delete(existing)
    db.commit()
    return None


@router.get("/blocks", response_model=List[PublicUserSummary])
def list_blocked_users(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Users the caller has blocked, for the settings screen"""
    profiles = (
        db.query(UserProfile)
        .join(UserBlock, UserBlock.blocked_id == UserProfile.user_id)
        .filter(UserBlock.blocker_id == current_user_id)
        .order_by(UserBlock.created_at.desc())
        .all()
    )
    return [
        PublicUserSummary(
            id=p.user_id,
            username=p.username,
            first_name=p.first_name,
            last_name=p.last_name,
            avatar_url=p.avatar_url,
            is_private=bool(p.is_private),
            relationship=REL_BLOCKED,
        )
        for p in profiles
    ]
