from typing import Optional

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from core.social import relationship_state
from core.social_queries import assert_not_blocked, get_follow, is_blocked_between, is_following
from models.profile import UserProfile
from schemas.social import PublicUserSummary


def social_router() -> APIRouter:
    """A router carrying the shared prefix, so every module registers the same one"""
    return APIRouter(prefix="/social", tags=["Social"])


def load_profile(db: Session, user_id: str) -> UserProfile:
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


def summarize(
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


def guard_graph_access(db: Session, viewer_id: str, target_id: str) -> None:
    """A private account's follower and following lists are followers-only"""
    if viewer_id == target_id:
        return

    assert_not_blocked(db, viewer_id, target_id)
    target = load_profile(db, target_id)
    if target.is_private and not is_following(db, viewer_id, target_id):
        raise HTTPException(status_code=403, detail="This account is private")
