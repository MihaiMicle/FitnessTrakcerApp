"""Finding other users and viewing a public profile"""

from fastapi import Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from core.social import normalize_username
from core.social_queries import assert_not_blocked, blocked_user_ids, is_following
from models.profile import UserProfile
from schemas.social import PublicUserProfile, UserSearchResults

from .common import social_router, summarize

router = social_router()


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
        results=[summarize(db, p, current_user_id) for p in profiles],
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
    profile = db.query(UserProfile).filter(UserProfile.username == handle).first()
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    assert_not_blocked(db, current_user_id, profile.user_id)

    summary = summarize(db, profile, current_user_id)
    is_self = profile.user_id == current_user_id
    can_view = (
        is_self
        or not profile.is_private
        or is_following(db, current_user_id, profile.user_id)
    )

    return PublicUserProfile(
        **summary.model_dump(),
        bio=profile.bio,
        followers_count=profile.followers_count or 0,
        following_count=profile.following_count or 0,
        can_view_content=can_view,
    )
