"""
Rules for accepting writes from the offline queue

The client generates the workout session id, which is what makes the write path
idempotent: a queued save is a PUT to a known id, so replaying it after a
timeout updates the same row instead of creating a second workout

Because the id comes from the device, the session may not exist yet when the
first save arrives. `PUT /workouts/{id}` therefore upserts, and this module
holds the parts of that decision that need no database

Mirrors frontend/lib/offline/draft.ts, which builds the payload
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Mapping, Optional
from uuid import UUID

DEFAULT_NAME = "Workout"
DEFAULT_STATUS = "in_progress"

# Fields a client is allowed to set when its save creates the session
CREATABLE_FIELDS = (
    "name",
    "status",
    "start_time",
    "end_time",
    "duration_seconds",
    "exercises",
    "visibility",
)


def normalize_client_id(value: Any) -> Optional[UUID]:
    """A client supplied id, or None when it is not a usable UUID"""
    if isinstance(value, UUID):
        return value
    if not isinstance(value, str):
        return None
    try:
        return UUID(value)
    except (ValueError, AttributeError):
        return None


def creation_defaults(
    payload: Mapping[str, Any], now: Optional[datetime] = None
) -> dict:
    """
    Fill in what a session needs to exist

    A queued save is written on a phone that may have been offline for the whole
    workout, so anything the payload leaves out is filled here rather than
    stored as null and broken later. `start_time` falls back to now because a
    session with no start cannot be timed or ordered
    """
    moment = now or datetime.now(timezone.utc)

    data = {key: payload[key] for key in CREATABLE_FIELDS if key in payload}

    if not data.get("name"):
        data["name"] = DEFAULT_NAME
    if not data.get("status"):
        data["status"] = DEFAULT_STATUS
    if data.get("start_time") is None:
        data["start_time"] = moment
    if data.get("duration_seconds") is None:
        data["duration_seconds"] = 0
    if data.get("exercises") is None:
        data["exercises"] = []

    return data
