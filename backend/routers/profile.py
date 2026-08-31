from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from typing import List
import os
from supabase import create_client

from core.calculations import calculate_macros
from core.database import get_db
from core.security import get_current_user
from models.profile import UserProfile, WeightLog
from schemas.profile import (
    ProfileUpdateRequest,
    UserProfileResponse,
    WeightLogCreate,
    WeightLogResponse,
)
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from models.foods import CustomFood
from models.nutrition import DailyLog
from models.workouts import WorkoutSession, WorkoutTemplate
from models.health import HealthConnection, HealthSample

router = APIRouter(prefix="/profile", tags=["Profile"])


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


@router.get("/me/export")
def export_user_data(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Compiles all user data into a JSON file for GDPR compliance."""
    user_uuid = UUID(current_user_id)

    # Query all personal data
    profile = (
        db.query(UserProfile).filter(UserProfile.user_id == str(user_uuid)).first()
    )
    weight_logs = db.query(WeightLog).filter(WeightLog.user_id == str(user_uuid)).all()
    daily_logs = db.query(DailyLog).filter(DailyLog.user_id == str(user_uuid)).all()
    custom_foods = db.query(CustomFood).filter(CustomFood.user_id == user_uuid).all()
    workouts = (
        db.query(WorkoutSession).filter(WorkoutSession.user_id == current_user_id).all()
    )
    routines = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.user_id == current_user_id)
        .all()
    )

    # Health data is special category data under GDPR, so an export that left
    # it out would be the one omission that actually matters
    health_connections = (
        db.query(HealthConnection)
        .filter(HealthConnection.user_id == current_user_id)
        .all()
    )
    health_samples = (
        db.query(HealthSample)
        .filter(HealthSample.user_id == current_user_id)
        .order_by(HealthSample.start_at.asc())
        .all()
    )

    # Helper to safely convert SQLAlchemy objects to dictionaries
    def alchemy_to_dict(obj):
        if not obj:
            return None
        data = dict(obj.__dict__)
        data.pop("_sa_instance_state", None)
        return data

    # Construct the payload
    export_payload = {
        "profile": alchemy_to_dict(profile),
        "weight_history": [alchemy_to_dict(w) for w in weight_logs],
        "nutrition_logs": [alchemy_to_dict(l) for l in daily_logs],
        "custom_foods": [alchemy_to_dict(f) for f in custom_foods],
        "workout_sessions": [alchemy_to_dict(w) for w in workouts],
        "workout_routines": [alchemy_to_dict(r) for r in routines],
        "health_connections": [alchemy_to_dict(c) for c in health_connections],
        "health_samples": [alchemy_to_dict(s) for s in health_samples],
    }

    # jsonable_encoder automatically handles UUIDs and datetime strings
    encoded_data = jsonable_encoder(export_payload)

    return JSONResponse(
        content=encoded_data,
        headers={
            "Content-Disposition": "attachment; filename=fitness_tracker_data_export.json"
        },
    )
