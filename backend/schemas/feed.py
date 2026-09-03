from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator
from core.feed import FeedError, normalize_comment
from schemas.social import PublicUserSummary, Visibility
from typing import Dict, Any

EventType = Literal["workout", "personal_record", "routine_shared"]

# Which authors a feed page is drawn from
FeedScope = Literal["following", "me", "user"]


class FeedEventItem(BaseModel):
    """One card in the feed, self-contained so a page needs no follow-up reads"""

    id: str
    event_type: EventType
    visibility: Visibility
    author: PublicUserSummary

    subject_type: Optional[str] = None
    subject_id: Optional[str] = None

    title: str
    payload: Dict[str, Any] = Field(default_factory=dict)

    like_count: int = 0
    comment_count: int = 0

    # Resolved for the caller, so the like button renders without a second call
    liked_by_me: bool = False

    occurred_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FeedPage(BaseModel):
    """
    A keyset page of events

    `next_cursor` is null when the page is the last one, which is what the
    client checks rather than comparing the item count to the limit
    """

    items: List[FeedEventItem] = []
    next_cursor: Optional[str] = None


class FeedLikeResult(BaseModel):
    """The state a like button should show after a toggle"""

    event_id: str
    liked_by_me: bool
    like_count: int


class FeedCommentCreate(BaseModel):
    body: str

    @field_validator("body")
    @classmethod
    def check_body(cls, value: str) -> str:
        try:
            return normalize_comment(value)
        except FeedError as exc:
            raise ValueError(str(exc)) from exc


class FeedCommentItem(BaseModel):
    id: str
    event_id: str
    author: PublicUserSummary
    body: str
    created_at: Optional[datetime] = None
    # True when the caller may delete it, as the comment's author or the
    # event's owner. Moderating your own post is the minimum a feed needs
    can_delete: bool = False

    class Config:
        from_attributes = True


class FeedShareRequest(BaseModel):
    event_type: str
    subject_id: str
    title: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    visibility: str = "followers"
