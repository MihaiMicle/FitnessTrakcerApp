from datetime import date
from typing import List
from uuid import UUID

from fastapi import Depends, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.nutrition import DailyLog
from schemas.nutrition import (
    CompleteDayRequest,
    DailyLogCreate,
    DailyLogResponse,
    WaterLogRequest,
)

from .common import (
    empty_log_response,
    get_log,
    get_log_with_meals,
    get_profile,
    nutrition_router,
    resolve_targets,
    response_with_targets,
)

router = nutrition_router()


@router.get("/logs/{log_date}", response_model=DailyLogResponse)
def get_log_by_date(
    log_date: date,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch the nutrition log for a specific date (e.g., /logs/2026-07-25),
    bundled with the user's custom macro targets from their profile.
    """
    targets = resolve_targets(get_profile(db, current_user_id))
    log_entry = get_log_with_meals(db, current_user_id, log_date)

    if not log_entry:
        return empty_log_response(current_user_id, log_date, targets)

    is_past_day = log_date < date.today()
    if is_past_day and not log_entry.is_completed:
        log_entry.is_completed = True
        db.commit()
        db.refresh(log_entry)

    return response_with_targets(log_entry, targets)


@router.post("/log", response_model=DailyLogResponse)
@router.post("/logs", response_model=DailyLogResponse)
def log_daily_nutrition(
    payload: DailyLogCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update a nutrition log for a specific date.
    If a log already exists for that date, it updates the totals.
    """
    user_uuid = UUID(current_user_id)
    existing_log = get_log(db, user_uuid, payload.date)

    if existing_log:
        for field in (
            "total_calories",
            "total_protein_g",
            "total_carbs_g",
            "total_fats_g",
            "total_saturated_fats_g",
            "total_fiber_g",
            "total_sugar_g",
            "total_potassium_mg",
            "total_sodium_mg",
            "total_iron_mg",
            "total_vitamin_d_mcg",
            "total_zinc_mg",
            "total_magnesium_mg",
            "total_calcium_mg",
            "total_cholesterol_mg",
            "total_water_ml",
        ):
            value = getattr(payload, field)
            if value is not None:
                setattr(existing_log, field, value)

        log_entry = existing_log
    else:
        log_entry = DailyLog(
            user_id=user_uuid,
            date=payload.date,
            total_calories=payload.total_calories or 0,
            total_protein_g=payload.total_protein_g or 0,
            total_carbs_g=payload.total_carbs_g or 0,
            total_fats_g=payload.total_fats_g or 0,
            total_saturated_fats_g=payload.total_saturated_fats_g or 0,
            total_fiber_g=payload.total_fiber_g or 0,
            total_sugar_g=payload.total_sugar_g or 0,
            total_potassium_mg=payload.total_potassium_mg or 0,
            total_sodium_mg=payload.total_sodium_mg or 0,
            total_iron_mg=payload.total_iron_mg or 0,
            total_vitamin_d_mcg=payload.total_vitamin_d_mcg or 0,
            total_zinc_mg=payload.total_zinc_mg or 0,
            total_magnesium_mg=payload.total_magnesium_mg or 0,
            total_calcium_mg=payload.total_calcium_mg or 0,
            total_cholesterol_mg=payload.total_cholesterol_mg or 0,
            total_water_ml=payload.total_water_ml or 0,
        )
        db.add(log_entry)

    db.commit()
    db.refresh(log_entry)
    return log_entry


@router.post("/water", response_model=DailyLogResponse)
def log_water_intake(
    payload: WaterLogRequest,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Safely increments the daily water total without touching food macros."""
    user_uuid = UUID(current_user_id)
    log_entry = get_log(db, user_uuid, payload.date)

    if log_entry:
        log_entry.total_water_ml += payload.amount_ml
    else:
        log_entry = DailyLog(
            user_id=user_uuid, date=payload.date, total_water_ml=payload.amount_ml
        )
        db.add(log_entry)

    db.commit()
    db.refresh(log_entry)

    # We still need to attach the target to the response
    targets = resolve_targets(get_profile(db, str(user_uuid)))
    response = DailyLogResponse.model_validate(log_entry)
    response.target_water_ml = targets["target_water_ml"]
    return response


@router.get("/logs", response_model=List[DailyLogResponse])
def get_nutrition_logs(
    limit: int = Query(30, ge=1, le=365, description="Number of past days to retrieve"),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve recent nutrition logs, ordered by date descending."""
    user_uuid = UUID(current_user_id)
    return (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_uuid)
        .order_by(DailyLog.date.desc())
        .limit(limit)
        .all()
    )


@router.post("/logs/{log_date}/toggle-complete", response_model=DailyLogResponse)
def toggle_log_complete(
    log_date: date,
    payload: CompleteDayRequest,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Manually mark a daily nutrition diary as completed or open."""
    user_uuid = UUID(current_user_id)
    log_entry = get_log(db, str(user_uuid), log_date)

    if not log_entry:
        # Create the daily log if the user completes before logging any food
        log_entry = DailyLog(
            user_id=str(user_uuid),
            date=log_date,
            is_completed=payload.is_completed,
        )
        db.add(log_entry)
    else:
        log_entry.is_completed = payload.is_completed

    db.commit()
    db.refresh(log_entry)
    return get_log_by_date(log_date=log_date, current_user_id=current_user_id, db=db)
