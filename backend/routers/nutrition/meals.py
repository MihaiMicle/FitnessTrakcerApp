from datetime import date
from typing import List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.nutrition import (
    MACRO_FIELDS,
    add_macros,
    apply_macro_delta,
    meal_macros,
    subtract_macros,
)
from core.security import get_current_user
from models.nutrition import DailyLog, Meal
from schemas.nutrition import MealCreate, MealResponse

from .common import get_log, nutrition_router

router = nutrition_router()

# A freshly created log has nothing on it yet, one zero per tracked field
ZERO_TOTALS = {f"total_{field}": 0 for field in MACRO_FIELDS}
ZERO_TOTALS["total_water_ml"] = 0


def _totals_of(log: DailyLog) -> dict:
    return {field: getattr(log, f"total_{field}") for field in MACRO_FIELDS}


def _apply_totals(log: DailyLog, totals: dict) -> None:
    for field, value in totals.items():
        setattr(log, f"total_{field}", value)


@router.post("/meals", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
def create_meal(
    meal: MealCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Log a new individual meal. Automatically finds or creates the DailyLog
    for that date and adds the meal's macros to the daily totals.
    """
    user_uuid = UUID(current_user_id)

    # Find or create the DailyLog for the date of the meal
    daily_log = get_log(db, user_uuid, meal.date)
    if not daily_log:
        daily_log = DailyLog(user_id=user_uuid, date=meal.date, **ZERO_TOTALS)
        db.add(daily_log)
        db.commit()
        db.refresh(daily_log)

    # Create the Meal entry linked to that DailyLog
    new_meal = Meal(**meal.model_dump(exclude={"date"}), daily_log_id=daily_log.id)
    db.add(new_meal)

    # Automatically add the new meal's macros to the daily totals
    _apply_totals(daily_log, add_macros(_totals_of(daily_log), meal_macros(new_meal)))

    db.commit()
    db.refresh(new_meal)
    return new_meal


@router.get("/meals/{log_date}", response_model=List[MealResponse])
def get_meals_by_date(
    log_date: date,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all logged meals for a specific date."""
    user_uuid = UUID(current_user_id)
    daily_log = get_log(db, user_uuid, log_date)
    if not daily_log:
        return []

    return db.query(Meal).filter(Meal.daily_log_id == daily_log.id).all()


@router.put("/meals/{meal_id}", response_model=MealResponse)
def update_meal(
    meal_id: UUID,
    payload: MealCreate,
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user),
):
    """Update an already logged meal and adjust daily totals using the delta."""
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    daily_log = db.query(DailyLog).filter(DailyLog.id == meal.daily_log_id).first()
    if daily_log:
        old_macros = meal_macros(meal)
        new_macros = {field: getattr(payload, field) for field in MACRO_FIELDS}
        # Calculate the difference between the old macros and the new macros
        _apply_totals(
            daily_log,
            apply_macro_delta(_totals_of(daily_log), old_macros, new_macros),
        )

    # Apply the new payload data to the meal record
    update_data = payload.model_dump(exclude={"date"})
    for key, value in update_data.items():
        setattr(meal, key, value)

    db.commit()
    db.refresh(meal)
    return meal


@router.delete("/meals/{meal_id}", status_code=200)
def delete_meal(
    meal_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    # Find the meal
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")

    # Subtract its macros from the daily log so goal bars update
    log = db.query(DailyLog).filter(DailyLog.id == meal.daily_log_id).first()
    if log:
        _apply_totals(log, subtract_macros(_totals_of(log), meal_macros(meal)))

    # Delete from database and save changes
    db.delete(meal)
    db.commit()
    return {"success": True, "message": "Meal deleted successfully"}
