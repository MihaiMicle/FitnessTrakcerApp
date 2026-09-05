"""
Turning a session's exercises JSONB into normalized `workout_sets` rows

The live logger writes one JSON array per session (`WorkoutSession.exercises`).
This module is the pure part of `sync_workout_sets`: given that array it
returns the rows to insert, with no database or SQLAlchemy import, so the
shape of a normalized set can be pinned with plain dicts and no session
"""

from __future__ import annotations

from typing import Any, Iterable, Mapping, Optional

from core.rest import resolve_rest_seconds

DEFAULT_EXERCISE_NAME = "Unknown Exercise"
DEFAULT_SET_NUMBER = 1
DEFAULT_SET_TYPE = "working"

# Carried straight from a set entry onto the row, blank strings folded to None
# so an empty text input does not become a stored "" value
NULLABLE_FIELDS = (
    "weight_kg",
    "reps",
    "rir",
    "duration_minutes",
    "distance_km",
    "incline",
    "speed",
    "difficulty",
)


def _clean(value: Any) -> Any:
    """An empty string means "not entered", not a literal empty value"""
    return None if value == "" else value


def build_workout_sets(
    session_id: Any,
    user_id: Any,
    exercises: Optional[Iterable[Mapping[str, Any]]],
) -> list[dict]:
    """
    Flatten a session's exercises into the rows `workout_sets` should hold

    One dict per logged set, in the order they appear in the JSONB. The
    caller is responsible for clearing any rows already synced for the
    session, so a re-sync does not leave duplicates behind
    """
    rows: list[dict] = []
    for exercise in exercises or []:
        exercise_name = exercise.get("name", DEFAULT_EXERCISE_NAME)

        for entry in exercise.get("sets", []):
            row = {
                "session_id": session_id,
                "user_id": user_id,
                "exercise_name": exercise_name,
                "set_number": entry.get("set", DEFAULT_SET_NUMBER),
                "set_type": entry.get("set_type", DEFAULT_SET_TYPE),
                "completed": entry.get("completed", False),
                "rest_seconds": resolve_rest_seconds(exercise, entry),
            }
            for field in NULLABLE_FIELDS:
                row[field] = _clean(entry.get(field))
            rows.append(row)

    return rows
