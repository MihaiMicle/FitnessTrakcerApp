"""
Rest timing rules, mirroring frontend/lib/workouts/rest.ts

The frontend owns the running timer. This module exists so the rest a user
actually took is written to the normalized `workout_sets` table instead of
staying locked inside the JSONB blob, which is what phase 4's per-exercise
statistics will need

Three things decide a rest, most specific first:

  1. set["rest_seconds"]              an override on one individual set
  2. exercise["rest_by_type"][type]   the exercise's rest for that set type
  3. DEFAULT_REST_SECONDS[type]       the app default for that set type

Keep the defaults here in step with the TypeScript ones. `test_rest.py` pins
them so a change on one side shows up as a failing test rather than as two
clients disagreeing about how long a drop set rests
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

DEFAULT_SET_TYPE = "working"
SET_TYPES = ("working", "W", "D", "F")

# Seconds, used when neither the set nor the exercise says otherwise
DEFAULT_REST_SECONDS = {
    "working": 90,
    "W": 30,
    "D": 10,
    "F": 120,
}

MAX_REST_SECONDS = 3600


def normalize_set_type(value: Any) -> str:
    """Anything unrecognised counts as a working set"""
    return value if value in SET_TYPES else DEFAULT_SET_TYPE


def clamp_rest_seconds(seconds: Any) -> Optional[int]:
    """Round into range, or None when the value is not a usable number"""
    # bool is an int subclass and is never a real rest value
    if isinstance(seconds, bool) or not isinstance(seconds, (int, float)):
        return None
    if seconds != seconds:  # NaN
        return None
    return int(min(max(round(seconds), 0), MAX_REST_SECONDS))


def exercise_rest_seconds(
    exercise: Optional[Mapping[str, Any]], set_type: Any
) -> int:
    """The exercise's rest for a set type, ignoring any per-set override"""
    resolved_type = normalize_set_type(set_type)
    by_type = (exercise or {}).get("rest_by_type") or {}
    if isinstance(by_type, Mapping):
        clamped = clamp_rest_seconds(by_type.get(resolved_type))
        if clamped is not None:
            return clamped
    return DEFAULT_REST_SECONDS[resolved_type]


def resolve_rest_seconds(
    exercise: Optional[Mapping[str, Any]],
    workout_set: Optional[Mapping[str, Any]],
) -> int:
    """The rest that actually applies to one set"""
    override = clamp_rest_seconds((workout_set or {}).get("rest_seconds"))
    if override is not None:
        return override
    return exercise_rest_seconds(exercise, (workout_set or {}).get("set_type"))
