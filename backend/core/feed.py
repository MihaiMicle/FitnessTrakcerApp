"""
Pure activity-feed rules: event identity, record detection and cursors

Nothing here touches the database or SQLAlchemy. Every function takes plain
values and returns plain values, so the rules that decide what deserves a feed
entry can be tested exhaustively without a session. `routers/social/feed.py`
holds the SQLAlchemy side and calls into this module for the decisions

Two invariants matter most in this file:

* `dedupe_key` is what keeps emission idempotent. A workout session is written
  with PUT to a client-generated id, so the same finished workout arrives many
  times as the offline queue drains. The key is unique per user, so a replayed
  save updates one event instead of posting the same workout again

* records are only claimed against work the user has already logged. A first
  ever session is not twenty personal records, it is a baseline

Mirrors frontend/lib/feed/events.ts, which formats the same payloads
"""

from __future__ import annotations

import base64
import binascii
from datetime import datetime, timezone
from typing import Any, Iterable, Mapping, Optional, Sequence

# Kinds of activity the feed can carry. Progress photos are deliberately absent:
# weight logs default to private and body photos are not bulk-opened
EVENT_WORKOUT = "workout"
EVENT_PERSONAL_RECORD = "personal_record"
EVENT_ROUTINE_SHARED = "routine_shared"
EVENT_MEAL_SHARED = "meal_shared"
EVENT_RECIPE_SHARED = "recipe_shared"
EVENT_DIARY_SHARED = "diary_shared"

EVENT_TYPES = (
    EVENT_WORKOUT,
    EVENT_PERSONAL_RECORD,
    EVENT_ROUTINE_SHARED,
    EVENT_MEAL_SHARED,
    EVENT_RECIPE_SHARED,
    EVENT_DIARY_SHARED,
)

# What a personal record was set on
RECORD_ESTIMATED_1RM = "estimated_1rm"

# Epley coefficient, the same one frontend/lib/workouts/records.ts ranks with
EPLEY = 0.0333

# A record has to clear the old mark by more than floating point noise
RECORD_EPSILON = 0.01

COMMENT_MAX_LENGTH = 500

FEED_PAGE_SIZE = 20
FEED_MAX_PAGE_SIZE = 50

# More than this from one session and it stops reading as an achievement
MAX_RECORDS_PER_SESSION = 3

# A set only counts when the user ticked it off
_TRUTHY = (True, 1, "1", "true", "True")


class FeedError(ValueError):
    """Raised when a feed input cannot be used"""


def _number(value: Any) -> float:
    """Coerce a JSONB value to a float, treating anything unusable as zero"""
    if isinstance(value, bool) or value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _is_completed(entry: Mapping[str, Any]) -> bool:
    return entry.get("completed") in _TRUTHY


def epley_1rm(weight: float, reps: float) -> float:
    """Estimated one rep max, zero when either input is missing"""
    if weight <= 0 or reps <= 0:
        return 0.0
    return weight * (1 + EPLEY * reps)


def normalize_event_type(value: Optional[str], fallback: str = EVENT_WORKOUT) -> str:
    """Coerce a stored or client-supplied event type to a known one"""
    if isinstance(value, str) and value in EVENT_TYPES:
        return value
    return fallback


def dedupe_key(event_type: str, subject_id: Any, detail: Optional[str] = None) -> str:
    """
    The per-user identity of an event

    Emission upserts on this key, so re-saving a workout that is already in the
    feed edits the existing row. Without it every drain of the offline queue
    would post the same workout to every follower again
    """
    key = f"{normalize_event_type(event_type)}:{subject_id}"
    if detail:
        return f"{key}:{detail}"
    return key


def completed_sets(exercises: Optional[Iterable[Mapping[str, Any]]]) -> list[dict]:
    """
    Flatten the session's JSONB exercises into the sets that actually happened

    Warmups are kept out of records but left in the volume total, because a
    warmup is real work the user did and a record should not be
    """
    rows: list[dict] = []
    for exercise in exercises or []:
        if not isinstance(exercise, Mapping):
            continue

        name = str(exercise.get("name") or "").strip()
        for entry in exercise.get("sets") or []:
            if not isinstance(entry, Mapping) or not _is_completed(entry):
                continue

            rows.append(
                {
                    "exercise": name,
                    "set_type": str(entry.get("set_type") or "working"),
                    "weight_kg": _number(entry.get("weight_kg")),
                    "reps": _number(entry.get("reps")),
                    "distance_km": _number(entry.get("distance_km")),
                    "duration_minutes": _number(entry.get("duration_minutes")),
                }
            )
    return rows


def workout_totals(exercises: Optional[Iterable[Mapping[str, Any]]]) -> dict:
    """Headline numbers for a workout card, computed from completed sets only"""
    rows = completed_sets(exercises)

    volume = sum(row["weight_kg"] * row["reps"] for row in rows)
    return {
        "exercise_count": len({row["exercise"] for row in rows if row["exercise"]}),
        "set_count": len(rows),
        "total_reps": int(sum(row["reps"] for row in rows)),
        "total_volume_kg": round(volume, 1),
        "total_distance_km": round(sum(row["distance_km"] for row in rows), 2),
    }


def best_efforts(rows: Sequence[Mapping[str, Any]]) -> dict[str, dict]:
    """
    The strongest set per exercise, ranked by estimated one rep max

    Working sets only. Ranking by 1RM rather than raw weight means a heavier
    single and a lighter set of ten are compared on the same scale
    """
    best: dict[str, dict] = {}

    for row in rows:
        name = str(row.get("exercise") or "").strip()
        if not name or str(row.get("set_type") or "working") == "warmup":
            continue

        weight = _number(row.get("weight_kg"))
        reps = _number(row.get("reps"))
        one_rm = epley_1rm(weight, reps)
        if one_rm <= 0:
            continue

        current = best.get(name)
        if current is None or one_rm > current["one_rm"]:
            best[name] = {
                "exercise": name,
                "weight_kg": round(weight, 2),
                "reps": int(reps),
                "one_rm": round(one_rm, 2),
            }

    return best


def detect_records(
    current: Mapping[str, Mapping[str, Any]],
    previous: Mapping[str, Mapping[str, Any]],
    limit: int = MAX_RECORDS_PER_SESSION,
) -> list[dict]:
    """
    Which of this session's best efforts beat everything logged before it

    An exercise with no history is not a record. The very first session would
    otherwise announce a personal best on every movement in it, which is noise
    and devalues the ones that mean something later
    """
    records: list[dict] = []

    for name, effort in current.items():
        prior = previous.get(name)
        if not prior:
            continue

        previous_1rm = _number(prior.get("one_rm"))
        if previous_1rm <= 0:
            continue
        if effort["one_rm"] <= previous_1rm + RECORD_EPSILON:
            continue

        records.append(
            {
                "exercise": name,
                "kind": RECORD_ESTIMATED_1RM,
                "weight_kg": effort["weight_kg"],
                "reps": effort["reps"],
                "one_rm": effort["one_rm"],
                "previous_one_rm": round(previous_1rm, 2),
                "improvement_kg": round(effort["one_rm"] - previous_1rm, 2),
            }
        )

    # Biggest jump first, so a truncated list keeps the most impressive lifts
    records.sort(key=lambda record: record["improvement_kg"], reverse=True)
    return records[: max(0, limit)]


def build_workout_title(name: Optional[str]) -> str:
    """The headline for a finished workout"""
    cleaned = (name or "").strip()
    return cleaned or "Workout"


def build_record_title(record: Mapping[str, Any]) -> str:
    """The headline for a personal record"""
    exercise = str(record.get("exercise") or "").strip() or "Exercise"
    return f"New PR: {exercise}"


def build_routine_title(name: Optional[str]) -> str:
    """The headline for a shared routine"""
    cleaned = (name or "").strip()
    return f"Shared a routine: {cleaned}" if cleaned else "Shared a routine"


def normalize_comment(raw: Optional[str]) -> str:
    """Trim and length-check a comment, raising FeedError when unusable"""
    body = (raw or "").strip()

    if not body:
        raise FeedError("Comment cannot be empty")
    if len(body) > COMMENT_MAX_LENGTH:
        raise FeedError(f"Comment must be at most {COMMENT_MAX_LENGTH} characters")

    return body


def clamp_page_size(value: Optional[int]) -> int:
    """Keep a client-supplied limit inside the range the index can serve"""
    if not value or value < 1:
        return FEED_PAGE_SIZE
    return min(value, FEED_MAX_PAGE_SIZE)


def encode_cursor(occurred_at: Optional[datetime], event_id: Any) -> Optional[str]:
    """
    Pack the sort key of the last row into an opaque page token

    Keyset rather than OFFSET, because the feed grows at the head. With OFFSET,
    a workout posted between two page loads shifts everything down and the user
    sees a row twice
    """
    if occurred_at is None or event_id is None:
        return None

    moment = occurred_at
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)

    raw = f"{moment.astimezone(timezone.utc).isoformat()}|{event_id}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii")


def decode_cursor(token: Optional[str]) -> Optional[tuple[datetime, str]]:
    """
    Unpack a page token, or None when it is missing or malformed

    A bad cursor returns None rather than raising, so a stale token from an old
    client serves the first page instead of a 500
    """
    if not token:
        return None

    try:
        raw = base64.urlsafe_b64decode(token.encode("ascii")).decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return None

    moment_text, separator, event_id = raw.partition("|")
    if not separator or not event_id:
        return None

    try:
        moment = datetime.fromisoformat(moment_text)
    except ValueError:
        return None

    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)

    return moment, event_id
