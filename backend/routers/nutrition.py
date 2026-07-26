from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional
from uuid import UUID

from core.database import get_db
from core.security import get_current_user
from models.nutrition import DailyLog, Meal
from schemas.nutrition import (
    DailyLogCreate, 
    DailyLogResponse, 
    MealCreate, 
    MealResponse
)

router = APIRouter(tags=["Nutrition"])

# Daily Log Endpoints
@router.get("/logs/{log_date}", response_model=DailyLogResponse)
def get_log_by_date(
    log_date: date,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the nutrition log for a specific date (e.g., /logs/2026-07-25).
    If no log exists for today yet, return a clean default object with 0s 
    so the Next.js frontend receives a 200 OK instead of crashing on a 404.
    """
    user_uuid = UUID(current_user_id)
    log_entry = db.query(DailyLog).filter(
        DailyLog.user_id == user_uuid,
        DailyLog.date == log_date
    ).first()

    if not log_entry:
        return DailyLogResponse(
            id=0,
            user_id=user_uuid,
            date=log_date,
            total_calories=0,
            total_protein_g=0,
            total_carbs_g=0,
            total_fats_g=0
        )
        
    return log_entry


@router.post("/log", response_model=DailyLogResponse)
@router.post("/logs", response_model=DailyLogResponse)
def log_daily_nutrition(
    payload: DailyLogCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or update a nutrition log for a specific date. 
    If a log already exists for that date, it updates the totals.
    """
    user_uuid = UUID(current_user_id)
    
    existing_log = db.query(DailyLog).filter(
        DailyLog.user_id == user_uuid,
        DailyLog.date == payload.date
    ).first()

    if existing_log:
        if payload.total_calories is not None: existing_log.total_calories = payload.total_calories
        if payload.total_protein_g is not None: existing_log.total_protein_g = payload.total_protein_g
        if payload.total_carbs_g is not None: existing_log.total_carbs_g = payload.total_carbs_g
        if payload.total_fats_g is not None: existing_log.total_fats_g = payload.total_fats_g
        log_entry = existing_log
    else:
        log_entry = DailyLog(
            user_id=user_uuid,
            date=payload.date,
            total_calories=payload.total_calories or 0,
            total_protein_g=payload.total_protein_g or 0,
            total_carbs_g=payload.total_carbs_g or 0,
            total_fats_g=payload.total_fats_g or 0
        )
        db.add(log_entry)

    db.commit()
    db.refresh(log_entry)
    return log_entry


@router.get("/logs", response_model=List[DailyLogResponse])
def get_nutrition_logs(
    limit: int = Query(30, ge=1, le=365, description="Number of past days to retrieve"),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve recent nutrition logs, ordered by date descending."""
    user_uuid = UUID(current_user_id)
    logs = db.query(DailyLog).filter(
        DailyLog.user_id == user_uuid
    ).order_by(DailyLog.date.desc()).limit(limit).all()
    
    return logs


# Meal Endpoints
@router.post("/meals", response_model=MealResponse, status_code=status.HTTP_201_CREATED)
def create_meal(
    meal: MealCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Log a new individual meal. Automatically finds or creates the DailyLog 
    for that date and adds the meal's macros to the daily totals.
    """
    user_uuid = UUID(current_user_id)
    
    # Find or create the DailyLog for the date of the meal
    daily_log = db.query(DailyLog).filter(
        DailyLog.user_id == user_uuid,
        DailyLog.date == meal.date
    ).first()

    if not daily_log:
        daily_log = DailyLog(
            user_id=user_uuid,
            date=meal.date,
            total_calories=0,
            total_protein_g=0,
            total_carbs_g=0,
            total_fats_g=0

        )
        db.add(daily_log)
        db.commit()
        db.refresh(daily_log)

    # Create the Meal entry linked to that DailyLog
    new_meal = Meal(
        **meal.dict(exclude={"date"}),
        daily_log_id=daily_log.id
    )
    db.add(new_meal)

    # Automatically add macros to the daily totals
    daily_log.total_calories += meal.calories
    daily_log.total_protein_g += meal.protein_g
    daily_log.total_carbs_g += meal.carbs_g
    daily_log.total_fats_g += meal.fats_g

    db.commit()
    db.refresh(new_meal)
    return new_meal


@router.get("/meals/{log_date}", response_model=List[MealResponse])
def get_meals_by_date(
    log_date: date,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all logged meals for a specific date."""
    user_uuid = UUID(current_user_id)
    
    daily_log = db.query(DailyLog).filter(
        DailyLog.user_id == user_uuid,
        DailyLog.date == log_date
    ).first()

    if not daily_log:
        return []

    meals = db.query(Meal).filter(Meal.daily_log_id == daily_log.id).all()
    return meals


@router.delete("/meals/{meal_id}", status_code=200)
def delete_meal(
    meal_id: UUID, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    # Find the meal
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=404, detail="Meal not found")
    
    # Subtract its macros from the daily log so goal bars update
    log = db.query(DailyLog).filter(DailyLog.id == meal.daily_log_id).first()
    if log:
        log.total_calories = max(0, log.total_calories - meal.calories)
        log.total_protein_g = max(0.0, log.total_protein_g - meal.protein_g)
        log.total_carbs_g = max(0.0, log.total_carbs_g - meal.carbs_g)
        log.total_fats_g = max(0.0, log.total_fats_g - meal.fats_g)
    
    # Delete from database and save changes
    db.delete(meal)
    db.commit()
    
    return {"success": True, "message": "Meal deleted successfully"}