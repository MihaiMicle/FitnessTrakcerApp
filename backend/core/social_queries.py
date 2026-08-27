"""
Database side of the social rules

`core/social.py` decides who may see what. This module turns those decisions
into SQLAlchemy so a listing endpoint filters in the database instead of
loading rows and discarding them in Python

Every read endpoint that returns another user's content should go through
`visible_content_filter`, and every write endpoint that acts on another user
should call `assert_not_blocked` first
"""

from __future__ import annotations

from typing import Optional, Sequence

from fastapi import HTTPException, status
from sqlalchemy import and_, false, or_, select
from sqlalchemy.orm import Session

from core.social import (
    FOLLOW_ACCEPTED,
    VISIBILITY_FOLLOWERS,
    VISIBILITY_PUBLIC,
)
from models.profile import UserProfile
from models.social import Follow, UserBlock


def get_follow(db: Session, follower_id: str, following_id: str) -> Optional[Follow]:
    """The follow edge from follower to following, in any state"""
    return (
        db.query(Follow)
        .filter(
            Follow.follower_id == follower_id,
            Follow.following_id == following_id,
        )
        .first()
    )


def is_following(db: Session, follower_id: Optional[str], following_id: str) -> bool:
    """True only for an accepted follow, never a pending request"""
    if not follower_id:
        return False
    if follower_id == following_id:
        return True

    edge = get_follow(db, follower_id, following_id)
    return edge is not None and edge.status == FOLLOW_ACCEPTED


def is_blocked_between(db: Session, user_a: Optional[str], user_b: str) -> bool:
    """
    True when either user has blocked the other

    Blocks are checked symmetrically. A blocked viewer must not see the
    blocker's content, and a blocker must not be shown the blocked user either
    """
    if not user_a or user_a == user_b:
        return False

    return (
        db.query(UserBlock.id)
        .filter(
            or_(
                and_(UserBlock.blocker_id == user_a, UserBlock.blocked_id == user_b),
                and_(UserBlock.blocker_id == user_b, UserBlock.blocked_id == user_a),
            )
        )
        .first()
        is not None
    )


def blocked_user_ids(db: Session, viewer_id: str) -> list[str]:
    """Every user id the viewer cannot interact with, in either direction"""
    rows = (
        db.query(UserBlock.blocker_id, UserBlock.blocked_id)
        .filter(
            or_(UserBlock.blocker_id == viewer_id, UserBlock.blocked_id == viewer_id)
        )
        .all()
    )
    return [
        blocked_id if blocker_id == viewer_id else blocker_id
        for blocker_id, blocked_id in rows
    ]


def accepted_following_ids(db: Session, viewer_id: str) -> list[str]:
    """Users the viewer follows with an accepted edge"""
    rows = (
        db.query(Follow.following_id)
        .filter(Follow.follower_id == viewer_id, Follow.status == FOLLOW_ACCEPTED)
        .all()
    )
    return [row[0] for row in rows]


def visible_content_filter(db: Session, model, viewer_id: Optional[str]):
    """
    A WHERE clause restricting `model` rows to what `viewer_id` may read

    `model` must expose `user_id` and `visibility` columns. The clause covers
    three cases: the viewer's own rows, followers-only rows from accounts the
    viewer follows, and public rows from accounts that are not private. Blocked
    users are excluded from every case except the viewer's own rows
    """
    # Correlated subquery so a private account hides its public rows too.
    # correlate() is required or the outer table joins into the subquery's own
    # FROM clause and the EXISTS matches against every row in the table
    owner_is_private = (
        select(UserProfile.user_id)
        .where(
            UserProfile.user_id == model.user_id,
            UserProfile.is_private.is_(True),
        )
        .correlate(model)
        .exists()
    )

    public_from_open_account = and_(
        model.visibility == VISIBILITY_PUBLIC,
        ~owner_is_private,
    )

    if not viewer_id:
        return public_from_open_account

    excluded = blocked_user_ids(db, viewer_id)
    followed = accepted_following_ids(db, viewer_id)

    followers_only = (
        and_(
            model.visibility.in_([VISIBILITY_FOLLOWERS, VISIBILITY_PUBLIC]),
            model.user_id.in_(followed),
        )
        if followed
        else false()
    )

    others = or_(followers_only, public_from_open_account)
    if excluded:
        others = and_(others, model.user_id.notin_(excluded))

    return or_(model.user_id == viewer_id, others)


def assert_not_blocked(db: Session, viewer_id: str, target_id: str) -> None:
    """
    Reject an interaction when a block exists in either direction

    Returns 404 rather than 403 so the response does not confirm that the
    target account exists
    """
    if is_blocked_between(db, viewer_id, target_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")


def recount_follows(db: Session, user_ids: Sequence[str]) -> None:
    """
    Recompute the denormalised counters for the given users

    Counters exist so a profile card does not need two COUNT queries. They are
    recomputed rather than incremented because a follow, unfollow, request
    accept and block all move them and drift is hard to notice
    """
    for user_id in {uid for uid in user_ids if uid}:
        profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
        if not profile:
            continue

        profile.followers_count = (
            db.query(Follow.id)
            .filter(Follow.following_id == user_id, Follow.status == FOLLOW_ACCEPTED)
            .count()
        )
        profile.following_count = (
            db.query(Follow.id)
            .filter(Follow.follower_id == user_id, Follow.status == FOLLOW_ACCEPTED)
            .count()
        )
