from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from core.social import UsernameError, normalize_username, validate_username

Visibility = Literal["private", "followers", "public"]
FollowStatus = Literal["pending", "accepted"]
RelationshipState = Literal["self", "none", "requested", "following", "blocked"]


class SocialSettingsUpdate(BaseModel):
    """Account-level social settings, separate from the physical metrics form"""

    username: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=300)
    is_private: Optional[bool] = None
    default_workout_visibility: Optional[Visibility] = None
    default_routine_visibility: Optional[Visibility] = None

    @field_validator("username")
    @classmethod
    def check_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        try:
            return validate_username(value)
        except UsernameError as exc:
            raise ValueError(str(exc)) from exc


class PublicUserSummary(BaseModel):
    """The shape used in search results, follower lists and feed authors"""

    id: str
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_private: bool = True
    relationship: RelationshipState = "none"

    class Config:
        from_attributes = True


class PublicUserProfile(PublicUserSummary):
    """A full profile card, trimmed to what a non-owner is allowed to see"""

    bio: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0

    # False when the account is private and the viewer is not an accepted follower
    can_view_content: bool = False


class FollowResponse(BaseModel):
    """Result of a follow attempt, so the button knows which state to render"""

    following_id: str
    status: FollowStatus
    relationship: RelationshipState


class FollowRequestItem(BaseModel):
    """An incoming pending request awaiting the owner's decision"""

    follow_id: str
    user: PublicUserSummary
    created_at: Optional[datetime] = None


class VisibilityUpdate(BaseModel):
    """Change the visibility of one content row"""

    visibility: Visibility


class UsernameAvailability(BaseModel):
    username: str
    available: bool
    reason: Optional[str] = None


class UserSearchResults(BaseModel):
    query: str
    results: List[PublicUserSummary] = []


def clean_username_query(raw: str) -> str:
    """Search accepts a leading @ and any casing"""
    return normalize_username(raw)
