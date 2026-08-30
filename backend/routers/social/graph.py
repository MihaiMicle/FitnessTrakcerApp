"""Following, unfollowing and reading the follower and following lists"""

from typing import List, Optional

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.social import FOLLOW_ACCEPTED, initial_follow_status, relationship_state
from core.social_queries import assert_not_blocked, get_follow, recount_follows
from models.profile import UserProfile
from models.social import Follow
from schemas.social import FollowResponse, PublicUserSummary

from .common import guard_graph_access, load_profile, social_router, summarize

router = social_router()


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

    target = load_profile(db, user_id)
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
    guard_graph_access(db, current_user_id, target_id)

    profiles = (
        db.query(UserProfile)
        .join(Follow, Follow.follower_id == UserProfile.user_id)
        .filter(Follow.following_id == target_id, Follow.status == FOLLOW_ACCEPTED)
        .order_by(Follow.created_at.desc())
        .all()
    )
    return [summarize(db, p, current_user_id) for p in profiles]


@router.get("/following", response_model=List[PublicUserSummary])
def list_following(
    user_id: Optional[str] = Query(None),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accounts the given user follows, defaulting to the caller"""
    target_id = user_id or current_user_id
    guard_graph_access(db, current_user_id, target_id)

    profiles = (
        db.query(UserProfile)
        .join(Follow, Follow.following_id == UserProfile.user_id)
        .filter(Follow.follower_id == target_id, Follow.status == FOLLOW_ACCEPTED)
        .order_by(Follow.created_at.desc())
        .all()
    )
    return [summarize(db, p, current_user_id) for p in profiles]
