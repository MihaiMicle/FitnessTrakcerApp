from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from datetime import date
from typing import List, Optional
from uuid import UUID

from core.database import get_db
from core.security import get_current_user
from models.nutrition import DailyLog, Meal
from schemas.nutrition import DailyLogCreate, DailyLogResponse, MealCreate, MealResponse
from models.profile import UserProfile

router = APIRouter(tags=["Nutrition"])

# Daily Log Endpoints
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
    user_uuid = UUID(current_user_id)
    
    # Fetch the user's saved targets from their profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    
    # Set fallback defaults just in case a new user has no profile yet
    t_cals = profile.target_calories if profile and profile.target_calories else 2500
    t_prot = profile.target_protein_g if profile and profile.target_protein_g else 180
    t_carbs = profile.target_carbs_g if profile and profile.target_carbs_g else 300
    t_fats = profile.target_fats_g if profile and profile.target_fats_g else 70
    t_sat_fats = profile.target_saturated_fats_g if profile and profile.target_saturated_fats_g else 20
    t_fiber = profile.target_fiber_g if profile and profile.target_fiber_g else 30
    t_sugar = profile.target_sugar_g if profile and profile.target_sugar_g else 50
    t_potassium = profile.target_potassium_mg if profile and profile.target_potassium_mg else 3500
    t_sodium = profile.target_sodium_mg if profile and profile.target_sodium_mg else 2300
    t_iron = profile.target_iron_mg if profile and profile.target_iron_mg else 8.0
    t_vitamin_d = profile.target_vitamin_d_mcg if profile and profile.target_vitamin_d_mcg else 25.0
    t_zinc = profile.target_zinc_mg if profile and profile.target_zinc_mg else 11.0
    t_magnesium = profile.target_magnesium_mg if profile and profile.target_magnesium_mg else 400.0
    t_calcium = profile.target_calcium_mg if profile and profile.target_calcium_mg else 1200.0
    t_cholesterol = profile.target_cholesterol_mg if profile and profile.target_cholesterol_mg else 300.0

    # Fetch today's log entry
    log_entry = (
        db.query(DailyLog)
        .options(joinedload(DailyLog.meals))
        .filter(DailyLog.date == log_date, DailyLog.user_id == user_uuid)
        .first()
    )

    # If no log exists for today, return clean 0 defaults WITH the targets
    if not log_entry:
        return DailyLogResponse(
            id=0,
            user_id=str(user_uuid),
            date=log_date,
            total_calories=0,
            total_protein_g=0,
            total_carbs_g=0,
            total_fats_g=0,
            total_saturated_fats_g=0,
            total_fiber_g=0,
            total_sugar_g=0,
            total_potassium_mg=0,
            total_sodium_mg=0,
            total_iron_mg=0,
            total_vitamin_d_mcg=0,
            total_zinc_mg=0,
            total_magnesium_mg=0,
            total_calcium_mg=0,
            total_cholesterol_mg=0,
            target_calories=t_cals,
            target_protein_g=t_prot,
            target_carbs_g=t_carbs,
            target_fats_g=t_fats,
            target_saturated_fats_g=t_sat_fats,
            target_fiber_g=t_fiber,
            target_sugar_g=t_sugar,
            target_potassium_mg=t_potassium,
            target_sodium_mg=t_sodium,
            target_iron_mg=t_iron,
            target_vitamin_d_mcg=t_vitamin_d,
            target_zinc_mg=t_zinc,
            target_magnesium_mg=t_magnesium,
            target_calcium_mg=t_calcium,
            target_cholesterol_mg=t_cholesterol
        )

    response = DailyLogResponse.model_validate(log_entry)
    
    response.target_calories = t_cals
    response.target_protein_g = t_prot
    response.target_carbs_g = t_carbs
    response.target_fats_g = t_fats
    response.target_saturated_fats_g = t_sat_fats
    response.target_fiber_g = t_fiber
    response.target_sugar_g = t_sugar
    response.target_potassium_mg = t_potassium
    response.target_sodium_mg = t_sodium
    response.target_iron_mg = t_iron
    response.target_vitamin_d_mcg = t_vitamin_d
    response.target_zinc_mg = t_zinc
    response.target_magnesium_mg = t_magnesium
    response.target_calcium_mg = t_calcium
    response.target_cholesterol_mg = t_cholesterol
    
    return response

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
    existing_log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_uuid, DailyLog.date == payload.date)
        .first()
    )

    if existing_log:
        if payload.total_calories is not None:
            existing_log.total_calories = payload.total_calories
        if payload.total_protein_g is not None:
            existing_log.total_protein_g = payload.total_protein_g
        if payload.total_carbs_g is not None:
            existing_log.total_carbs_g = payload.total_carbs_g
        if payload.total_fats_g is not None:
            existing_log.total_fats_g = payload.total_fats_g
        if payload.total_saturated_fats_g is not None:
            existing_log.total_saturated_fats_g = payload.total_saturated_fats_g
        if payload.total_fiber_g is not None:
            existing_log.total_fiber_g = payload.total_fiber_g
        if payload.total_sugar_g is not None:
            existing_log.total_sugar_g = payload.total_sugar_g
        if payload.total_potassium_mg is not None:
            existing_log.total_potassium_mg = payload.total_potassium_mg
        if payload.total_sodium_mg is not None:
            existing_log.total_sodium_mg = payload.total_sodium_mg
        if payload.total_iron_mg is not None:
            existing_log.total_iron_mg = payload.total_iron_mg
        if payload.total_vitamin_d_mcg is not None:
            existing_log.total_vitamin_d_mcg = payload.total_vitamin_d_mcg
        if payload.total_zinc_mg is not None:
            existing_log.total_zinc_mg = payload.total_zinc_mg
        if payload.total_magnesium_mg is not None:
            existing_log.total_magnesium_mg = payload.total_magnesium_mg
        if payload.total_calcium_mg is not None:
            existing_log.total_calcium_mg = payload.total_calcium_mg
        if payload.total_cholesterol_mg is not None:
            existing_log.total_cholesterol_mg = payload.total_cholesterol_mg
            
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
        )
        db.add(log_entry)
        
    db.commit()
    db.refresh(log_entry)
    return log_entry

@router.get("/logs", response_model=List[DailyLogResponse])
def get_nutrition_logs(
    limit: int = Query(30, ge=1, le=365, description="Number of past days to retrieve"),
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve recent nutrition logs, ordered by date descending."""
    user_uuid = UUID(current_user_id)
    logs = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_uuid)
        .order_by(DailyLog.date.desc())
        .limit(limit)
        .all()
    )
    return logs

# Meal Endpoints
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
    daily_log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_uuid, DailyLog.date == meal.date)
        .first()
    )
    
    if not daily_log:
        daily_log = DailyLog(
            user_id=user_uuid,
            date=meal.date,
            total_calories=0,
            total_protein_g=0,
            total_carbs_g=0,
            total_fats_g=0,
            total_saturated_fats_g=0,
            total_fiber_g=0,
            total_sugar_g=0,
            total_potassium_mg=0,
            total_sodium_mg=0,
            total_iron_mg=0,
            total_vitamin_d_mcg=0,
            total_zinc_mg=0,
            total_magnesium_mg=0,
            total_calcium_mg=0,
            total_cholesterol_mg=0,
        )
        db.add(daily_log)
        db.commit()
        db.refresh(daily_log)
        
    # Create the Meal entry linked to that DailyLog
    new_meal = Meal(**meal.model_dump(exclude={"date"}), daily_log_id=daily_log.id)
    db.add(new_meal)
    
    # Automatically add macros to the daily totals
    daily_log.total_calories += meal.calories
    daily_log.total_protein_g += meal.protein_g
    daily_log.total_carbs_g += meal.carbs_g
    daily_log.total_fats_g += meal.fats_g
    daily_log.total_saturated_fats_g += meal.saturated_fats_g
    daily_log.total_fiber_g += meal.fiber_g
    daily_log.total_sugar_g += meal.sugar_g
    daily_log.total_potassium_mg += meal.potassium_mg
    daily_log.total_sodium_mg += meal.sodium_mg
    daily_log.total_iron_mg += meal.iron_mg
    daily_log.total_vitamin_d_mcg += meal.vitamin_d_mcg
    daily_log.total_zinc_mg += meal.zinc_mg
    daily_log.total_magnesium_mg += meal.magnesium_mg
    daily_log.total_calcium_mg += meal.calcium_mg
    daily_log.total_cholesterol_mg += meal.cholesterol_mg
    
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
    daily_log = (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_uuid, DailyLog.date == log_date)
        .first()
    )
    if not daily_log:
        return []
    
    meals = db.query(Meal).filter(Meal.daily_log_id == daily_log.id).all()
    return meals

@router.delete("/meals/{meal_id}", status_code=200)
def delete_meal(
    meal_id: UUID, 
    db: Session = Depends(get_db), 
    current_user=Depends(get_current_user)
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
        log.total_saturated_fats_g = max(0.0, log.total_saturated_fats_g - meal.saturated_fats_g)
        log.total_fiber_g = max(0.0, log.total_fiber_g - meal.fiber_g)
        log.total_sugar_g = max(0.0, log.total_sugar_g - meal.sugar_g)
        log.total_potassium_mg = max(0.0, log.total_potassium_mg - meal.potassium_mg)
        log.total_sodium_mg = max(0.0, log.total_sodium_mg - meal.sodium_mg)
        log.total_iron_mg = max(0.0, log.total_iron_mg - meal.iron_mg)
        log.total_vitamin_d_mcg = max(0.0, log.total_vitamin_d_mcg - meal.vitamin_d_mcg)
        log.total_zinc_mg = max(0.0, log.total_zinc_mg - meal.zinc_mg)
        log.total_magnesium_mg = max(0.0, log.total_magnesium_mg - meal.magnesium_mg)
        log.total_calcium_mg = max(0.0, log.total_calcium_mg - meal.calcium_mg)
        log.total_cholesterol_mg = max(0.0, log.total_cholesterol_mg - meal.cholesterol_mg)
        
    # Delete from database and save changes
    db.delete(meal)
    db.commit()
    return {"success": True, "message": "Meal deleted successfully"}