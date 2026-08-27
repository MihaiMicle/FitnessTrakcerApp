"""
Pure social rules: content visibility and username normalisation

Nothing here touches the database or SQLAlchemy. Every function takes plain
values and returns plain values, so the access-control rules can be tested
exhaustively without a session. `core/social_queries.py` holds the SQLAlchemy
side and calls into this module for the actual decisions

The single most important invariant in this file: a viewer sees a piece of
content only when `can_view` returns True. Routers must not hand-roll their own
version of that check
"""

from __future__ import annotations

import re
from typing import Optional

# Visibility levels, ordered from most closed to most open
VISIBILITY_PRIVATE = "private"
VISIBILITY_FOLLOWERS = "followers"
VISIBILITY_PUBLIC = "public"

VISIBILITY_LEVELS = (VISIBILITY_PRIVATE, VISIBILITY_FOLLOWERS, VISIBILITY_PUBLIC)

# Rank used to clamp one visibility against another. Higher means more open
_VISIBILITY_RANK = {
    VISIBILITY_PRIVATE: 0,
    VISIBILITY_FOLLOWERS: 1,
    VISIBILITY_PUBLIC: 2,
}

# Follow edge states. A follow of a private account starts pending
FOLLOW_PENDING = "pending"
FOLLOW_ACCEPTED = "accepted"
FOLLOW_STATES = (FOLLOW_PENDING, FOLLOW_ACCEPTED)

# Relationship of a viewer to another user, returned by the profile endpoints
REL_SELF = "self"
REL_NONE = "none"
REL_REQUESTED = "requested"
REL_FOLLOWING = "following"
REL_BLOCKED = "blocked"

USERNAME_MIN_LENGTH = 3
USERNAME_MAX_LENGTH = 30

_USERNAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")

# Names that would collide with routes or impersonate the product
RESERVED_USERNAMES = frozenset(
    {
        "admin",
        "administrator",
        "api",
        "app",
        "auth",
        "explore",
        "feed",
        "fitnesstracker",
        "help",
        "login",
        "logout",
        "me",
        "moderator",
        "new",
        "profile",
        "root",
        "search",
        "settings",
        "signup",
        "social",
        "staff",
        "support",
        "system",
        "user",
        "users",
        "workouts",
    }
)


class UsernameError(ValueError):
    """Raised when a candidate username cannot be used"""


def normalize_visibility(value: Optional[str], fallback: str = VISIBILITY_PRIVATE) -> str:
    """Coerce a stored or user-supplied value to a known level"""
    if isinstance(value, str) and value in _VISIBILITY_RANK:
        return value
    return fallback


def effective_visibility(content_visibility: Optional[str], owner_is_private: bool) -> str:
    """
    Clamp a row's visibility against the owner's account setting

    A private account never exposes public content. Clamping at read time
    instead of rewriting every row means toggling the account private takes
    effect immediately and toggling it back restores the original per-row
    choice
    """
    level = normalize_visibility(content_visibility)
    if owner_is_private and _VISIBILITY_RANK[level] > _VISIBILITY_RANK[VISIBILITY_FOLLOWERS]:
        return VISIBILITY_FOLLOWERS
    return level


def can_view(
    *,
    viewer_id: Optional[str],
    owner_id: Optional[str],
    visibility: Optional[str],
    owner_is_private: bool = False,
    is_follower: bool = False,
    is_blocked: bool = False,
) -> bool:
    """
    Decide whether `viewer_id` may read a piece of content owned by `owner_id`

    `viewer_id` is None for anonymous callers. `is_follower` must mean an
    accepted follow, never a pending one. `is_blocked` covers a block in either
    direction
    """
    if owner_id is None:
        return False

    # The owner always sees their own content, including while blocked
    if viewer_id is not None and viewer_id == owner_id:
        return True

    if is_blocked:
        return False

    level = effective_visibility(visibility, owner_is_private)

    if level == VISIBILITY_PUBLIC:
        return True
    if level == VISIBILITY_FOLLOWERS:
        return viewer_id is not None and is_follower
    return False


def visible_levels_for(
    *,
    viewer_id: Optional[str],
    owner_id: Optional[str],
    is_follower: bool = False,
    is_blocked: bool = False,
) -> tuple[str, ...]:
    """
    The levels a viewer can read from one owner

    Used to turn a per-row check into a single `IN (...)` clause when listing
    """
    if owner_id is not None and viewer_id == owner_id:
        return VISIBILITY_LEVELS
    if is_blocked:
        return ()
    if viewer_id is not None and is_follower:
        return (VISIBILITY_FOLLOWERS, VISIBILITY_PUBLIC)
    return (VISIBILITY_PUBLIC,)


def relationship_state(
    *,
    viewer_id: Optional[str],
    target_id: str,
    follow_status: Optional[str] = None,
    is_blocked: bool = False,
) -> str:
    """Describe the viewer's relationship to a target user for the UI"""
    if viewer_id is not None and viewer_id == target_id:
        return REL_SELF
    if is_blocked:
        return REL_BLOCKED
    if follow_status == FOLLOW_ACCEPTED:
        return REL_FOLLOWING
    if follow_status == FOLLOW_PENDING:
        return REL_REQUESTED
    return REL_NONE


def initial_follow_status(target_is_private: bool) -> str:
    """A follow of a private account waits for approval, otherwise it is live"""
    return FOLLOW_PENDING if target_is_private else FOLLOW_ACCEPTED


def normalize_username(raw: Optional[str]) -> str:
    """
    Lowercase and trim a candidate username

    Normalisation is separate from validation so the same string is stored,
    compared and looked up
    """
    if raw is None:
        return ""
    return raw.strip().lstrip("@").lower()


def validate_username(raw: Optional[str]) -> str:
    """Normalise and check a username, raising UsernameError when unusable"""
    username = normalize_username(raw)

    if len(username) < USERNAME_MIN_LENGTH:
        raise UsernameError(
            f"Username must be at least {USERNAME_MIN_LENGTH} characters"
        )
    if len(username) > USERNAME_MAX_LENGTH:
        raise UsernameError(f"Username must be at most {USERNAME_MAX_LENGTH} characters")
    if not _USERNAME_PATTERN.match(username):
        raise UsernameError(
            "Username must start with a letter and use only letters, numbers and underscores"
        )
    if username in RESERVED_USERNAMES:
        raise UsernameError("That username is reserved")

    return username


def is_valid_username(raw: Optional[str]) -> bool:
    """Boolean form of validate_username for checks that should not raise"""
    try:
        validate_username(raw)
    except UsernameError:
        return False
    return True
