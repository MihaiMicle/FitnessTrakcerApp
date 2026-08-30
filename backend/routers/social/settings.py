"""Handle, privacy flag and per-content visibility defaults for the signed-in user"""

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

from core.database import get_db
from core.security import get_current_user
from core.social import (
    FOLLOW_ACCEPTED,
    FOLLOW_PENDING,
    UsernameError,
    normalize_username,
    validate_username,
)
from core.social_queries import recount_follows
from models.profile import UserProfile
from models.social import Follow
from schemas.social import SocialSettingsUpdate, UsernameAvailability

from .common import load_profile, social_router

router = social_router()


@router.get("/me/settings")
def get_my_social_settings(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """The authenticated user's own handle, privacy flag and content defaults"""
    profile = load_profile(db, current_user_id)
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
    profile = load_profile(db, current_user_id)
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
