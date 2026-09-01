"""
Turning whatever the model returned into the shape the client expects.

The model is asked for strict JSON, but a model that is asked for strict JSON
still sometimes returns a fenced block, a preamble, or valid JSON with a field
missing. The client renders action buttons off these fields, so a malformed
reply must degrade into a plain text message rather than reach the UI half
built. Everything here is pure and fully covered by tests
"""

import json
import re
from typing import Any, Dict, List, Optional

ACTION_TYPES = {"UPDATE_GOALS", "UPDATE_PROFILE", "SET_BODY_FAT"}
MEAL_TYPES = {"breakfast", "lunch", "dinner", "snack"}

# A body fat estimate outside this range is a parsing failure, not a reading
MIN_BODY_FAT = 3.0
MAX_BODY_FAT = 70.0

_FENCE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def strip_code_fences(raw: str) -> str:
    """Remove a leading ```json and a trailing ``` if the model added them"""
    if not raw:
        return ""
    return _FENCE.sub("", raw).strip()


def extract_json_object(raw: str) -> Optional[Dict[str, Any]]:
    """
    Best effort at pulling one JSON object out of a model reply.

    Tries the whole string first, then the outermost braces, which recovers the
    common case of a sentence of preamble before the object
    """
    text = strip_code_fences(raw)
    if not text:
        return None

    for candidate in (text, _outermost_braces(text)):
        if not candidate:
            continue
        try:
            parsed = json.loads(candidate)
        except (ValueError, TypeError):
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


def _outermost_braces(text: str) -> Optional[str]:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start : end + 1]


def _clean_number(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number


def normalize_meal(meal: Any) -> Optional[Dict[str, Any]]:
    """
    Keep a suggested meal only if it has a name and at least one food.

    A meal with an empty foods array renders as a card with a log button that
    silently does nothing, which is worse than not showing the card
    """
    if not isinstance(meal, dict):
        return None
    foods = [f for f in (meal.get("foods") or []) if isinstance(f, dict)]
    if not foods:
        return None

    meal_type = str(meal.get("meal_type") or "lunch").lower()
    return {
        "title": str(meal.get("title") or "Suggested meal"),
        "meal_type": meal_type if meal_type in MEAL_TYPES else "lunch",
        "reason": meal.get("reason"),
        "foods": [
            {
                "food_name": str(f.get("food_name") or f.get("name") or "Food"),
                "serving_size": _clean_number(f.get("serving_size")) or 100.0,
                "serving_unit": str(f.get("serving_unit") or "g"),
                "calories": round(_clean_number(f.get("calories")) or 0),
                "protein_g": _clean_number(f.get("protein_g")) or 0.0,
                "carbs_g": _clean_number(f.get("carbs_g")) or 0.0,
                "fats_g": _clean_number(f.get("fats_g")) or 0.0,
                "fiber_g": _clean_number(f.get("fiber_g")) or 0.0,
                "sugar_g": _clean_number(f.get("sugar_g")) or 0.0,
            }
            for f in foods
        ],
    }


def normalize_routine(routine: Any) -> Optional[Dict[str, Any]]:
    """Keep a suggested routine only if it names at least one exercise"""
    if not isinstance(routine, dict):
        return None
    exercises = [e for e in (routine.get("exercises") or []) if isinstance(e, dict)]
    if not exercises:
        return None

    return {
        "name": str(routine.get("name") or "New routine"),
        "notes": routine.get("notes"),
        "exercises": [ex for ex in (normalize_exercise(e) for e in exercises) if ex],
    }


def normalize_exercise(exercise: Any) -> Optional[Dict[str, Any]]:
    """
    One suggested exercise, with its sets clamped to something loggable.

    Set count is capped because a model that miscounts can otherwise return
    forty sets and the client will happily render every one of them
    """
    if not isinstance(exercise, dict):
        return None
    name = exercise.get("name")
    if not name:
        return None

    raw_sets = [s for s in (exercise.get("sets") or []) if isinstance(s, dict)][:12]
    sets = [
        {
            "weight_kg": _clean_number(s.get("weight_kg")),
            "reps": _clean_number(s.get("reps")),
            "rir": _clean_number(s.get("rir")),
            "duration_minutes": _clean_number(s.get("duration_minutes")),
            "distance_km": _clean_number(s.get("distance_km")),
        }
        for s in raw_sets
    ]

    return {
        "name": str(name),
        "type": "cardio" if exercise.get("type") == "cardio" else "strength",
        "primary_muscle": exercise.get("primary_muscle"),
        "secondary_muscles": exercise.get("secondary_muscles"),
        "notes": exercise.get("notes") or exercise.get("reason"),
        "reason": exercise.get("reason"),
        "sets": sets or [{"weight_kg": None, "reps": None, "rir": None}],
    }


def normalize_body_fat(estimate: Any) -> Optional[Dict[str, Any]]:
    """
    A body fat reading, or nothing.

    The percent is required and range bounds are optional, because a model that
    gives a point estimate without a range is still useful and one that gives a
    range without an estimate is not
    """
    if not isinstance(estimate, dict):
        return None
    percent = _clean_number(estimate.get("estimate_percent"))
    if percent is None or not MIN_BODY_FAT <= percent <= MAX_BODY_FAT:
        return None

    low = _clean_number(estimate.get("range_low"))
    high = _clean_number(estimate.get("range_high"))
    confidence = str(estimate.get("confidence") or "low").lower()

    return {
        "estimate_percent": round(percent, 1),
        "range_low": round(low, 1) if low is not None else None,
        "range_high": round(high, 1) if high is not None else None,
        "confidence": confidence if confidence in {"low", "medium", "high"} else "low",
        "rationale": estimate.get("rationale"),
        "photos_used": int(_clean_number(estimate.get("photos_used")) or 0),
    }


def normalize_action(action: Any) -> Optional[Dict[str, Any]]:
    """Drop actions the client has no handler for rather than rendering a dud"""
    if not isinstance(action, dict):
        return None
    action_type = action.get("type")
    payload = action.get("payload")
    if action_type not in ACTION_TYPES or not isinstance(payload, dict) or not payload:
        return None
    return {"type": action_type, "payload": payload}


def normalize_reply(raw: str) -> Dict[str, Any]:
    """
    The single entry point. Always returns a full reply shape.

    When the JSON cannot be recovered the raw text becomes the message, so a
    model that answers in prose still reaches the user instead of erroring
    """
    parsed = extract_json_object(raw)
    if parsed is None:
        return empty_reply(strip_code_fences(raw) or "No response.")

    meals: List[Dict[str, Any]] = [
        m
        for m in (normalize_meal(x) for x in (parsed.get("suggested_meals") or []))
        if m
    ]
    raw_exercises = parsed.get("suggested_exercises") or []
    exercises: List[Dict[str, Any]] = [
        e for e in (normalize_exercise(x) for x in raw_exercises) if e
    ]

    return {
        "message": str(parsed.get("message") or "").strip() or "No response.",
        "action": normalize_action(parsed.get("action")),
        "suggested_meals": meals or None,
        "suggested_routine": normalize_routine(parsed.get("suggested_routine")),
        "suggested_exercises": exercises or None,
        "body_fat": normalize_body_fat(parsed.get("body_fat")),
    }


def empty_reply(message: str) -> Dict[str, Any]:
    """A reply carrying only text, used for errors and unparseable output"""
    return {
        "message": message,
        "action": None,
        "suggested_meals": None,
        "suggested_routine": None,
        "suggested_exercises": None,
        "body_fat": None,
    }
