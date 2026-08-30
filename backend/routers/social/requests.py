"""Approving or rejecting the follow requests a private account receives"""

from typing import List

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from core.database import get_db
from core.security import get_current_user
from core.social import FOLLOW_ACCEPTED, FOLLOW_PENDING, relationship_state
from core.social_queries import get_follow, recount_follows
from models.profile import UserProfile
from models.social import Follow
from schemas.social import FollowRequestItem, FollowResponse

from .common import social_router, summarize

router = social_router()


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
            user=summarize(db, profile, current_user_id),
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
