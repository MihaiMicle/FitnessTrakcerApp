"""
Pure shaping of the data the copilot is allowed to see.

Nothing here touches the database, the network or the model. Everything takes
plain dicts and returns plain dicts, so the whole context contract is testable
without a session, a connection or an API key
"""

from typing import Any, Dict, List, Optional

# Every nutrient the app tracks, in the order the prompt lists them. The daily
# log stores each one twice, as total_<key> and target_<key>
NUTRIENT_KEYS = [
    "calories",
    "protein_g",
    "carbs_g",
    "fats_g",
    "saturated_fats_g",
    "fiber_g",
    "sugar_g",
    "potassium_mg",
    "sodium_mg",
    "iron_mg",
    "vitamin_d_mcg",
    "zinc_mg",
    "magnesium_mg",
    "calcium_mg",
    "cholesterol_mg",
    "water_ml",
]

# The four the model is told to hit exactly. The rest are guidance
PRIMARY_KEYS = ["calories", "protein_g", "carbs_g", "fats_g"]

MAX_RECENT_MEALS = 25
MAX_RECENT_SESSIONS = 8
MAX_PHOTOS = 4


def _num(value: Any, fallback: float = 0.0) -> float:
    """Coerce anything the ORM or a JSONB blob hands us into a float"""
    if value is None:
        return fallback
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def remaining_nutrients(log: Dict[str, Any]) -> Dict[str, float]:
    """
    Target minus consumed, for every tracked nutrient.

    The sign is kept deliberately. A negative number is the model's only signal
    that the user is already over on something, and clamping it at zero would
    let it happily suggest another 600 calories on a day that is already blown
    """
    remaining: Dict[str, float] = {}
    for key in NUTRIENT_KEYS:
        target = _num(log.get(f"target_{key}"))
        consumed = _num(log.get(f"total_{key}"))
        remaining[key] = round(target - consumed, 2)
    return remaining


def consumed_nutrients(log: Dict[str, Any]) -> Dict[str, float]:
    """Just the totals, unprefixed, for a compact prompt"""
    return {key: round(_num(log.get(f"total_{key}")), 2) for key in NUTRIENT_KEYS}


def target_nutrients(log: Dict[str, Any]) -> Dict[str, float]:
    """Just the targets, unprefixed"""
    return {key: round(_num(log.get(f"target_{key}")), 2) for key in NUTRIENT_KEYS}


def meals_by_type(meals: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """
    Group the day's meals under their meal_type.

    The model needs this to answer "what should I have for dinner" without
    suggesting something already eaten at lunch
    """
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for meal in meals[:MAX_RECENT_MEALS]:
        meal_type = str(meal.get("meal_type") or "other").lower()
        unit = meal.get("serving_unit") or "g"
        grouped.setdefault(meal_type, []).append(
            {
                "name": meal.get("name") or meal.get("food_name") or "Unnamed",
                "serving": f"{_num(meal.get('serving_size'))}{unit}",
                "calories": round(_num(meal.get("calories"))),
                "protein_g": round(_num(meal.get("protein_g")), 1),
                "carbs_g": round(_num(meal.get("carbs_g")), 1),
                "fats_g": round(_num(meal.get("fats_g")), 1),
            }
        )
    return grouped


def top_set(sets: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    The heaviest completed set, which is the one number a lifter actually
    remembers. Uncompleted sets are planned, not performed, so they never count
    """
    best: Optional[Dict[str, Any]] = None
    for entry in sets:
        if not entry.get("completed"):
            continue
        if best is None or _num(entry.get("weight_kg")) > _num(best.get("weight_kg")):
            best = entry
    if best is None:
        return None
    return {
        "weight_kg": _num(best.get("weight_kg")),
        "reps": best.get("reps"),
        "set_type": best.get("set_type") or "working",
    }


def session_summary(session: Dict[str, Any]) -> Dict[str, Any]:
    """One completed workout, flattened to what a coach would glance at"""
    lines = []
    for exercise in session.get("exercises") or []:
        sets = exercise.get("sets") or []
        lines.append(
            {
                "name": exercise.get("name") or "Unknown",
                "note": exercise.get("notes") or None,
                "sets_completed": sum(1 for s in sets if s.get("completed")),
                "sets_planned": len(sets),
                "top_set": top_set(sets),
            }
        )
    return {
        "name": session.get("name") or "Workout",
        "date": str(session.get("start_time") or session.get("created_at") or ""),
        "duration_minutes": round(_num(session.get("duration_seconds")) / 60, 1),
        "exercises": lines,
    }


def recent_sessions(sessions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """The last few workouts, newest first, capped so the prompt stays small"""
    return [session_summary(s) for s in sessions[:MAX_RECENT_SESSIONS]]


def muscle_volume(
    sessions: List[Dict[str, Any]], muscle_by_exercise: Dict[str, str]
) -> Dict[str, int]:
    """
    Completed sets per muscle across the given sessions.

    This is what lets the copilot answer "what should I do next" with something
    better than a guess: it can see that chest has had eleven sets this week and
    posterior delts have had none
    """
    counts: Dict[str, int] = {}
    for session in sessions:
        for exercise in session.get("exercises") or []:
            muscle = muscle_by_exercise.get(exercise.get("name") or "")
            if not muscle:
                continue
            done = sum(1 for s in (exercise.get("sets") or []) if s.get("completed"))
            if done:
                counts[muscle] = counts.get(muscle, 0) + done
    return counts


def live_workout_summary(live: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    The session open on the user's screen right now.

    Sent by the client rather than read from the database on purpose: an offline
    workout has not reached the server yet, and the copilot should still see it
    """
    if not live:
        return None
    return {
        "name": live.get("name") or "Workout",
        "elapsed_minutes": round(_num(live.get("elapsed_seconds")) / 60, 1),
        "exercises": [
            {
                "name": ex.get("name") or "Unknown",
                "type": ex.get("type") or "strength",
                "sets_completed": sum(
                    1 for s in (ex.get("sets") or []) if s.get("completed")
                ),
                "sets_planned": len(ex.get("sets") or []),
                "top_set": top_set(ex.get("sets") or []),
            }
            for ex in (live.get("exercises") or [])
        ],
    }


def photo_timeline(weight_logs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Progress photos paired with the bodyweight recorded the same day.

    A photo without its weight is close to useless for a body fat estimate, so
    entries missing a URL are dropped rather than sent as a bare date
    """
    timeline: List[Dict[str, Any]] = []
    for entry in weight_logs:
        url = entry.get("photo_url")
        if not url:
            continue
        timeline.append(
            {
                "date": str(entry.get("date") or ""),
                "weight_kg": _num(entry.get("weight_kg")),
                "photo_url": url,
            }
        )
        if len(timeline) >= MAX_PHOTOS:
            break
    return timeline


def profile_summary(profile: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """The physical facts the model needs, and nothing else from the row"""
    if not profile:
        return {}
    return {
        "first_name": profile.get("first_name"),
        "gender": profile.get("gender"),
        "age": profile.get("age"),
        "height_cm": profile.get("height_cm"),
        "weight_kg": profile.get("weight_kg"),
        "activity_level": profile.get("activity_level"),
        "goal_type": profile.get("goal_type"),
        "body_fat_percentage": profile.get("body_fat_percentage"),
    }
