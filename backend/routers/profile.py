from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from core.database import get_db
from core.security import get_current_user
from models.profile import UserProfile
from schemas.profile import ProfileUpdateRequest, UserProfileResponse

router = APIRouter(prefix="/profile", tags=["Profile"])

def calculate_mifflin_st_jeor(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    activity_level: float,
    goal: str,
):
    """
    Calculates TDEE and recommended macronutrient splits based on the Mifflin-St Jeor equation.
    """
    # Base BMR Calculation
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
        target_calories = int(tdee - 300)  # Standard 300 kcal deficit
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
    
    target_sugar = round(target_carbs * 0.10, 1) # ~10% of carbs from sugar
    target_fiber = round(target_carbs * 0.14, 1) # ~14% of carbs from fiber
    target_saturated_fats = round(target_fats * 0.25, 1) # max ~25% of fats from saturated fats

    target_iron = 8.0
    target_zinc = 11.0
    target_calcium = 1200.0
    target_vitamin_d = 25.0
    target_cholesterol = 300.0
    
    if activity_level >= 1.55:
        target_sodium = 3500.0     # Active / Heavy Training Target
        target_potassium = 4500.0  # Active / Heavy Training Target
        target_magnesium = 450.0   # Active / Heavy Training Target
    else:
        target_sodium = 2300.0     # Daily Baseline Target
        target_potassium = 4000.0  # Daily Baseline Target
        target_magnesium = 350.0   # Daily Baseline Target

    return (
        target_calories, target_protein, target_carbs, target_fats, 
        target_saturated_fats, target_fiber, target_sugar, 
        target_potassium, target_sodium, target_iron, target_zinc, 
        target_magnesium, target_calcium, target_vitamin_d, target_cholesterol
    )

@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Fetch the authenticated user's profile, creating a blank one if it doesn't exist."""
    user_uuid = UUID(current_user_id)
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    
    if not profile:
        profile = UserProfile(user_id=user_uuid)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
    return profile

@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile metrics and apply automatic or manual macro calculations."""
    user_uuid = UUID(current_user_id)
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_uuid).first()
    
    if not profile:
        profile = UserProfile(user_id=user_uuid)
        db.add(profile)
        
    # Update basic physical metrics from payload
    update_data = payload.model_dump(exclude_unset=True)
    for field in [
        "first_name", "last_name", "gender", "age", "birth_date",
        "avatar_url", "height_cm", "weight_kg", "activity_level", "goal_type",
    ]:
        if field in update_data:
            setattr(profile, field, update_data[field])
            
    # Determine Macro Targets: Algorithm vs Manual Override
    if payload.auto_calculate:
        # Check that all required fields are present for the formula
        required_fields = [
            profile.weight_kg, profile.height_cm, profile.age,
            profile.gender, profile.activity_level, profile.goal_type,
        ]
        if not all(required_fields):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot auto-calculate: missing physical metrics (weight, height, age, gender, activity, or goal).",
            )
            
        cals, p, c, f, sugar, fiber, sat_fats, potassium, sodium, iron, zinc, magnesium, calcium, vitamin_d, cholesterol = calculate_mifflin_st_jeor(
            profile.weight_kg, profile.height_cm, profile.age,
            profile.gender, profile.activity_level, profile.goal_type,
        )
        
        profile.target_calories = cals
        profile.target_protein_g = p
        profile.target_carbs_g = c
        profile.target_fats_g = f
        profile.target_sugar_g = sugar
        profile.target_fiber_g = fiber
        profile.target_saturated_fats_g = sat_fats
        profile.target_potassium_mg = potassium
        profile.target_sodium_mg = sodium
        profile.target_iron_mg = iron
        profile.target_zinc_mg = zinc
        profile.target_magnesium_mg = magnesium
        profile.target_calcium_mg = calcium
        profile.target_vitamin_d_mcg = vitamin_d
        profile.target_cholesterol_mg = cholesterol
    else:
        # Manual overrides take precedence when auto_calculate is False
        if payload.target_calories is not None: 
            profile.target_calories = payload.target_calories
        if payload.target_protein_g is not None: 
            profile.target_protein_g = payload.target_protein_g
        if payload.target_carbs_g is not None:
            profile.target_carbs_g = payload.target_carbs_g
            # Automatically adjust sugar and fiber based on manual carbs
            profile.target_sugar_g = round(payload.target_carbs_g * 0.10, 1)
            profile.target_fiber_g = round(payload.target_carbs_g * 0.14, 1)
        if payload.target_fats_g is not None:
            profile.target_fats_g = payload.target_fats_g
            # Automatically adjust saturated fats based on manual fats
            profile.target_saturated_fats_g = round(payload.target_fats_g * 0.25, 1)
            
    db.commit()
    db.refresh(profile)
    return profile