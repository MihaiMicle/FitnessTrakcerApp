from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from typing import List
import os
from supabase import create_client

from core.database import get_db
from core.security import get_current_user
from models.profile import UserProfile, WeightLog
from schemas.profile import (
    ProfileUpdateRequest,
    UserProfileResponse,
    WeightLogCreate,
    WeightLogResponse,
)

router = APIRouter(prefix="/profile", tags=["Profile"])


def calculate_macros(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    activity_level: float,
    goal: str,
    body_fat_percentage: float = None,
):
    """
    Calculates TDEE and recommended macronutrient splits based on the best available formula.
    Uses Katch-McArdle if body fat is known, defaults to Mifflin-St Jeor otherwise.
    """
    # Base BMR Calculation Engine
    if body_fat_percentage is not None and body_fat_percentage > 0:
        # Katch-McArdle Formula (Highly accurate using Lean Body Mass)
        lean_body_mass = weight_kg * (1 - (body_fat_percentage / 100))
        bmr = 370 + (21.6 * lean_body_mass)
    else:
        # Mifflin-St Jeor Formula (Standard Baseline)
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
        bmr += 5 if gender == "male" else -161

    # Activity Multiplier
    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "athlete": 1.9,
    }
    tdee = bmr * float(activity_level)

    # Goal Adjustment
    if goal == "cut":
        target_calories = int(tdee - 500)  # Standard 500 kcal deficit
    elif goal == "bulk":
        target_calories = int(tdee + 300)  # Lean bulk surplus
    else:
        target_calories = int(tdee)  # Maintain

    # Ensure calories don't drop to dangerous levels
    target_calories = max(target_calories, 1200)

    # Macro Split (High protein hypertrophy-friendly distribution)
    # Protein: ~2.2g per kg of bodyweight
    target_protein = int(weight_kg * 2.2)
    # Fats: ~25% of total daily calories (9 kcal per gram)
    target_fats = int((target_calories * 0.25) / 9)
    # Carbs: Remainder of calories (4 kcal per gram)
    remaining_calories = target_calories - ((target_protein * 4) + (target_fats * 9))
    target_carbs = max(int(remaining_calories / 4), 0)

    target_sugar = round(target_carbs * 0.10, 1)  # ~10% of carbs from sugar
    target_fiber = round(target_carbs * 0.14, 1)  # ~14% of carbs from fiber
    target_saturated_fats = round(
        target_fats * 0.25, 1
    )  # max ~25% of fats from saturated fats

    # App-Calculated Micro Baselines
    target_iron = 8.0
    target_zinc = 11.0
    target_calcium = 1200.0
    target_vitamin_d = 25.0
    target_cholesterol = 300.0

    # Dynamic Water Calculation (Bodyweight in kg x 35ml)
    target_water = int(weight_kg * 35)

    if activity_level >= 1.55:
        target_sodium = 3500.0  # Active / Heavy Training Target
        target_potassium = 4500.0  # Active / Heavy Training Target
        target_magnesium = 450.0  # Active / Heavy Training Target
    else:
        target_sodium = 2300.0  # Daily Baseline Target
        target_potassium = 4000.0  # Daily Baseline Target
        target_magnesium = 350.0  # Daily Baseline Target

    return (
        target_calories,
        target_protein,
        target_carbs,
        target_fats,
        target_saturated_fats,
        target_fiber,
        target_sugar,
        target_potassium,
        target_sodium,
        target_iron,
        target_zinc,
        target_magnesium,
        target_calcium,
        target_vitamin_d,
        target_cholesterol,
        target_water,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Fetch the authenticated user's profile."""
    user_uuid = UUID(current_user_id)
    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == str(user_uuid)).first()
    )

    # If no profile exists, throw a 404 to trigger the wizard
    if not profile:
        raise HTTPException(
            status_code=404, detail="Profile not found. Needs onboarding."
        )

    return profile


@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile metrics and apply automatic or manual macro calculations."""
    user_uuid = UUID(current_user_id)

    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == str(user_uuid)).first()
    )
    if not profile:
        profile = UserProfile(user_id=str(user_uuid))
        db.add(profile)

    # Update basic physical metrics from payload
    update_data = payload.model_dump(exclude_unset=True)
    for field in [
        "first_name",
        "last_name",
        "gender",
        "age",
        "birth_date",
        "avatar_url",
        "height_cm",
        "weight_kg",
        "activity_level",
        "goal_type",
        "body_fat_percentage",
    ]:
        if field in update_data:
            setattr(profile, field, update_data[field])

    # Determine Macro Targets: Algorithm vs Manual Override
    if payload.auto_calculate:
        # Check that all required fields are present for the formula
        required_fields = [
            profile.weight_kg,
            profile.height_cm,
            profile.age,
            profile.gender,
            profile.activity_level,
            profile.goal_type,
        ]

        if not all(required_fields):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot auto-calculate: missing physical metrics (weight, height, age, gender, activity, or goal).",
            )

        (
            cals,
            p,
            c,
            f,
            sat_fats,
            fiber,
            sugar,
            potassium,
            sodium,
            iron,
            zinc,
            mag,
            calcium,
            vit_d,
            chol,
            water,
        ) = calculate_macros(
            profile.weight_kg,
            profile.height_cm,
            profile.age,
            profile.gender,
            profile.activity_level,
            profile.goal_type,
            profile.body_fat_percentage,
        )

        (
            profile.target_calories,
            profile.target_protein_g,
            profile.target_carbs_g,
            profile.target_fats_g,
        ) = (cals, p, c, f)

        (
            profile.target_sugar_g,
            profile.target_fiber_g,
            profile.target_saturated_fats_g,
        ) = (sugar, fiber, sat_fats)

        (
            profile.target_potassium_mg,
            profile.target_sodium_mg,
            profile.target_iron_mg,
        ) = (potassium, sodium, iron)

        (
            profile.target_zinc_mg,
            profile.target_magnesium_mg,
            profile.target_calcium_mg,
        ) = (zinc, mag, calcium)

        (
            profile.target_vitamin_d_mcg,
            profile.target_cholesterol_mg,
            profile.target_water_ml,
        ) = (vit_d, chol, water)

    else:
        # Manual overrides take precedence when auto_calculate is False
        if payload.target_calories is not None:
            profile.target_calories = payload.target_calories
        if payload.target_protein_g is not None:
            profile.target_protein_g = payload.target_protein_g
        if payload.target_carbs_g is not None:
            profile.target_carbs_g = payload.target_carbs_g
            profile.target_sugar_g = round(payload.target_carbs_g * 0.10, 1)
            profile.target_fiber_g = round(payload.target_carbs_g * 0.14, 1)
        if payload.target_fats_g is not None:
            profile.target_fats_g = payload.target_fats_g
            profile.target_saturated_fats_g = round(payload.target_fats_g * 0.25, 1)
        if payload.target_water_ml is not None:
            profile.target_water_ml = payload.target_water_ml

    db.commit()
    db.refresh(profile)
    return profile


@router.post("/weight", response_model=WeightLogResponse)
def log_weight(
    payload: WeightLogCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new weight log and updates the user's current weight in their profile."""
    user_uuid = UUID(current_user_id)

    existing = (
        db.query(WeightLog)
        .filter(WeightLog.user_id == str(user_uuid), WeightLog.date == payload.date)
        .first()
    )

    if existing:
        existing.weight_kg = payload.weight_kg
        if payload.photo_url:
            existing.photo_url = payload.photo_url
        db.commit()
        db.refresh(existing)
        log_entry = existing
    else:
        log_entry = WeightLog(
            user_id=str(user_uuid),
            date=payload.date,
            weight_kg=payload.weight_kg,
            photo_url=payload.photo_url,
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == str(user_uuid)).first()
    )
    if profile:
        profile.weight_kg = payload.weight_kg
        db.commit()

    return log_entry


@router.delete("/weight/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_weight_log(
    log_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a specific weight log."""
    weight_log = (
        db.query(WeightLog)
        .filter(WeightLog.id == log_id, WeightLog.user_id == current_user_id)
        .first()
    )

    if not weight_log:
        raise HTTPException(status_code=404, detail="Weight log not found")

    db.delete(weight_log)
    db.commit()
    return None


@router.get("/weight", response_model=List[WeightLogResponse])
def get_weight_logs(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Returns all historical weight logs for charting and the physique photo gallery."""
    user_uuid = UUID(current_user_id)
    return (
        db.query(WeightLog)
        .filter(WeightLog.user_id == str(user_uuid))
        .order_by(WeightLog.date.asc())
        .all()
    )


@router.delete("/me")
def delete_account(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Deletes the user's profile and completely removes them from Supabase Auth."""
    try:
        user_uuid = UUID(current_user_id)

        # Delete all app data (Profile, Meals, Custom Foods)
        db_user = (
            db.query(UserProfile).filter(UserProfile.user_id == str(user_uuid)).first()
        )
        if db_user:
            db.delete(db_user)
            db.commit()

        # Delete the actual login credentials from Supabase Auth
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

        if supabase_url and supabase_service_key:
            supabase_admin = create_client(supabase_url, supabase_service_key)
            supabase_admin.auth.admin.delete_user(str(user_uuid))

        return {"message": "Account data and login credentials wiped successfully."}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Database error during deletion: {str(e)}"
        )
