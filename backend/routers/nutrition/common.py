"""
The parts of the nutrition API that touch the database

Target fallback and macro arithmetic live in `core/nutrition.py` and are unit
tested there. This module is the thin layer that reads a profile, applies
those numbers to a DailyLog/Meal row, and writes it back
"""

from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter
from sqlalchemy.orm import Session, joinedload

from core.nutrition import resolve_targets
from models.nutrition import DailyLog
from models.profile import UserProfile
from schemas.nutrition import DailyLogResponse


def nutrition_router() -> APIRouter:
    """A router carrying no prefix, so every module mounts at the API root"""
    return APIRouter(tags=["Nutrition"])


def get_profile(db: Session, user_id: str) -> UserProfile | None:
    return db.query(UserProfile).filter(UserProfile.user_id == user_id).first()


def get_log(db: Session, user_id: str, log_date: date) -> DailyLog | None:
    return (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.date == log_date)
        .first()
    )


def get_log_with_meals(db: Session, user_id: str, log_date: date) -> DailyLog | None:
    return (
        db.query(DailyLog)
        .options(joinedload(DailyLog.meals))
        .filter(DailyLog.date == log_date, DailyLog.user_id == user_id)
        .first()
    )


def empty_log_response(
    user_id: str, log_date: date, targets: dict
) -> DailyLogResponse:
    """A day with nothing logged yet, zeroed out but carrying real targets"""
    zeros = {
        f"total_{field}": 0
        for field in (
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
        )
    }
    return DailyLogResponse(
        id=0,
        user_id=UUID(str(user_id)),
        date=log_date,
        # A day with nothing logged is only complete once the user says so
        is_completed=False,
        meals=[],
        **zeros,
        **targets,
    )


def response_with_targets(log_entry: DailyLog, targets: dict) -> DailyLogResponse:
    """A saved log, with the caller's resolved targets layered on top"""
    response = DailyLogResponse.model_validate(log_entry)
    for field, value in targets.items():
        setattr(response, field, value)
    return response


__all__ = [
    "empty_log_response",
    "get_log",
    "get_log_with_meals",
    "get_profile",
    "nutrition_router",
    "resolve_targets",
    "response_with_targets",
]
