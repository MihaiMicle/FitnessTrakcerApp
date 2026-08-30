"""Blocking a user, which also tears down any follow edges between them"""

from typing import List

from fastapi import Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.social import REL_BLOCKED
from core.social_queries import recount_follows
from models.profile import UserProfile
from models.social import Follow, UserBlock
from schemas.social import PublicUserSummary

from .common import load_profile, social_router

router = social_router()


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

    load_profile(db, user_id)

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
