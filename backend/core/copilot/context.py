"""
Reading the user's data out of the database and handing it to the pure
summarisers.

This module is the only place the copilot touches the database. Every query is
scoped to the calling user's id, and the row objects never leave here: what
comes out is plain dicts, already trimmed to what the model needs
"""

from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session, joinedload

from models.nutrition import DailyLog
from models.profile import UserProfile, WeightLog
from models.workouts import Exercise, WorkoutSession, WorkoutTemplate

from core.copilot import summaries

# How far back the muscle volume tally reaches. Two weeks is long enough to
# show a neglected muscle group and short enough to reflect the current block
VOLUME_WINDOW_DAYS = 14

MAX_LIBRARY_EXERCISES = 120
MAX_LIBRARY_FOODS = 40

# Mirrors the fallbacks in routers/nutrition.py so the copilot sees the same
# targets the dashboard shows when a profile row is incomplete
TARGET_FALLBACKS: Dict[str, float] = {
    "calories": 2500,
    "protein_g": 180,
    "carbs_g": 300,
    "fats_g": 70,
    "saturated_fats_g": 20,
    "fiber_g": 30,
    "sugar_g": 50,
    "potassium_mg": 4000,
    "sodium_mg": 2300,
    "iron_mg": 8.0,
    "vitamin_d_mcg": 25.0,
    "zinc_mg": 11.0,
    "magnesium_mg": 400.0,
    "calcium_mg": 1200.0,
    "cholesterol_mg": 300.0,
    "water_ml": 3000,
}


def _row_to_dict(row: Any, fields: List[str]) -> Dict[str, Any]:
    """Named attributes off an ORM row, with dates stringified"""
    result: Dict[str, Any] = {}
    for field in fields:
        value = getattr(row, field, None)
        result[field] = str(value) if isinstance(value, date) else value
    return result


def load_profile(db: Session, user_id: str) -> Optional[UserProfile]:
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()


def build_day_log(
    db: Session, user_id: str, log_date: date, profile: Optional[UserProfile]
) -> Dict[str, Any]:
    """
    One day of nutrition as a flat dict of total_* and target_* keys.

    Built to match the DailyLogResponse the frontend already consumes, so the
    remaining-macro arithmetic the copilot does is the same arithmetic the
    dashboard rings show
    """
    log = (
        db.query(DailyLog)
        .options(joinedload(DailyLog.meals))
        .filter(DailyLog.user_id == user_id, DailyLog.date == log_date)
        .first()
    )

    flat: Dict[str, Any] = {"date": str(log_date)}
    for key in summaries.NUTRIENT_KEYS:
        flat[f"total_{key}"] = getattr(log, f"total_{key}", 0) or 0
        target = getattr(profile, f"target_{key}", None) if profile else None
        flat[f"target_{key}"] = target or TARGET_FALLBACKS.get(key, 0)

    meal_fields = [
        "name",
        "meal_type",
        "serving_size",
        "serving_unit",
        "calories",
        "protein_g",
        "carbs_g",
        "fats_g",
    ]
    flat["meals"] = (
        [_row_to_dict(m, meal_fields) for m in log.meals] if log else []
    )
    return flat


def load_sessions(db: Session, user_id: str, since: date) -> List[Dict[str, Any]]:
    """Completed sessions newer than the cutoff, newest first"""
    rows = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status == "completed",
            WorkoutSession.start_time >= since,
        )
        .order_by(WorkoutSession.start_time.desc())
        .limit(40)
        .all()
    )
    return [
        {
            "name": row.name,
            "start_time": str(row.start_time) if row.start_time else "",
            "duration_seconds": row.duration_seconds,
            "exercises": row.exercises or [],
        }
        for row in rows
    ]


def load_exercise_library(db: Session, user_id: str) -> List[Dict[str, Any]]:
    """
    The exercises this user can pick from: the seeded global set plus their own.

    Named exercises matter more than they look. When the model suggests one from
    this list the client can match it by name and inherit its tracking_fields,
    so the set inputs render correctly instead of defaulting to weight and reps
    """
    rows = (
        db.query(Exercise)
        .filter((Exercise.user_id == user_id) | (Exercise.user_id.is_(None)))
        .order_by(Exercise.name.asc())
        .limit(MAX_LIBRARY_EXERCISES)
        .all()
    )
    return [
        {
            "name": row.name,
            "type": row.type,
            "primary_muscle": row.primary_muscle,
            "equipment": row.equipment,
        }
        for row in rows
    ]


def load_routine_names(db: Session, user_id: str) -> List[str]:
    rows = (
        db.query(WorkoutTemplate.name)
        .filter(WorkoutTemplate.user_id == user_id)
        .order_by(WorkoutTemplate.created_at.desc())
        .limit(30)
        .all()
    )
    return [row[0] for row in rows]


def load_weight_logs(db: Session, user_id: str) -> List[Dict[str, Any]]:
    rows = (
        db.query(WeightLog)
        .filter(WeightLog.user_id == user_id)
        .order_by(WeightLog.date.desc())
        .limit(30)
        .all()
    )
    return [_row_to_dict(r, ["date", "weight_kg", "photo_url"]) for r in rows]


def build_context(
    db: Session,
    user_id: str,
    log_date: date,
    live_workout: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Everything the copilot knows, in one dict.

    Read once per message rather than cached. The user may have logged a meal
    thirty seconds ago and the whole point of the feature is that the answer
    accounts for it
    """
    profile = load_profile(db, user_id)
    day_log = build_day_log(db, user_id, log_date, profile)
    sessions = load_sessions(db, user_id, log_date - timedelta(days=VOLUME_WINDOW_DAYS))
    library = load_exercise_library(db, user_id)
    weight_logs = load_weight_logs(db, user_id)

    muscle_by_exercise = {
        ex["name"]: ex["primary_muscle"] for ex in library if ex.get("primary_muscle")
    }

    return {
        "today": str(log_date),
        "profile": summaries.profile_summary(
            _row_to_dict(
                profile,
                [
                    "first_name",
                    "gender",
                    "age",
                    "height_cm",
                    "weight_kg",
                    "activity_level",
                    "goal_type",
                    "body_fat_percentage",
                ],
            )
            if profile
            else None
        ),
        "consumed_nutrients": summaries.consumed_nutrients(day_log),
        "target_nutrients": summaries.target_nutrients(day_log),
        "remaining_nutrients": summaries.remaining_nutrients(day_log),
        "meals_logged_today": summaries.meals_by_type(day_log["meals"]),
        "recent_workouts": summaries.recent_sessions(sessions),
        "muscle_volume_14d": summaries.muscle_volume(sessions, muscle_by_exercise),
        "exercise_library": library,
        "routine_names": load_routine_names(db, user_id),
        "weight_history": weight_logs[:10],
        "progress_photos": summaries.photo_timeline(weight_logs),
        "live_workout": summaries.live_workout_summary(live_workout),
    }
