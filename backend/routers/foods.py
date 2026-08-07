from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.orm.attributes import flag_modified
from typing import List
from uuid import UUID
from core.database import get_db
from core.security import get_current_user
from models.foods import CustomFood
from models.nutrition import Meal, DailyLog
from schemas.foods import CustomFoodCreate, CustomFoodResponse
from schemas.nutrition import MealResponse

router = APIRouter(prefix="/foods", tags=["Foods"])

@router.get("/custom", response_model=List[CustomFoodResponse])
def get_custom_foods(
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = UUID(current_user_id)
    return db.query(CustomFood).filter(
        or_(
            CustomFood.user_id == user_uuid,
            CustomFood.user_id.is_(None)
        )
    ).all()

@router.post("/custom", response_model=CustomFoodResponse, status_code=status.HTTP_201_CREATED)
def create_custom_food(
    food: CustomFoodCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = UUID(current_user_id)
    existing_food = db.query(CustomFood).filter(
        CustomFood.user_id == user_uuid,
        CustomFood.name.ilike(food.name)
    ).first()
    
    if existing_food:
        existing_servings = existing_food.custom_servings if existing_food.custom_servings else []
        new_servings = food.custom_servings if food.custom_servings else []
        
        merged_dict = {s["description"].lower(): s for s in existing_servings}
        for s in new_servings:
            merged_dict[s["description"].lower()] = s
            
        existing_food.custom_servings = list(merged_dict.values())
        flag_modified(existing_food, "custom_servings")
        db.commit()
        db.refresh(existing_food)
        return existing_food
    else:
        new_food = CustomFood(**food.model_dump(), user_id=user_uuid)
        db.add(new_food)
        db.commit()
        db.refresh(new_food)
        return new_food

@router.put("/custom/{food_id}", response_model=CustomFoodResponse)
def update_custom_food(
    food_id: UUID,
    food: CustomFoodCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = UUID(current_user_id)
    existing_food = db.query(CustomFood).filter(
        CustomFood.id == food_id, 
        CustomFood.user_id == user_uuid
    ).first()
    
    if not existing_food:
        raise HTTPException(status_code=404, detail="Not found or not authorized.")
        
    existing_servings = existing_food.custom_servings if existing_food.custom_servings else []
    new_servings = food.custom_servings if food.custom_servings else []
    
    merged_dict = {s["description"].lower(): s for s in existing_servings}
    for s in new_servings:
        merged_dict[s["description"].lower()] = s
        
    existing_food.custom_servings = list(merged_dict.values())
    flag_modified(existing_food, "custom_servings")
    
    existing_food.name = food.name
    existing_food.serving_size = food.serving_size
    existing_food.serving_unit = food.serving_unit
    existing_food.calories = food.calories
    existing_food.protein_g = food.protein_g
    existing_food.carbs_g = food.carbs_g
    existing_food.fats_g = food.fats_g
    existing_food.saturated_fats_g = food.saturated_fats_g
    existing_food.fiber_g = food.fiber_g
    existing_food.sugar_g = food.sugar_g
    existing_food.potassium_mg = food.potassium_mg
    existing_food.sodium_mg = food.sodium_mg
    existing_food.iron_mg = food.iron_mg
    existing_food.vitamin_d_mcg = food.vitamin_d_mcg
    existing_food.zinc_mg = food.zinc_mg
    existing_food.magnesium_mg = food.magnesium_mg
    existing_food.calcium_mg = food.calcium_mg
    existing_food.cholesterol_mg = food.cholesterol_mg
    
    db.commit()
    db.refresh(existing_food)
    return existing_food

@router.get("/recent", response_model=List[MealResponse])
def get_recent_foods(
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = UUID(current_user_id)
    recent_meals = db.query(Meal).join(DailyLog).filter(DailyLog.user_id == str(user_uuid)).order_by(Meal.id.desc()).limit(50).all()
    
    seen_names = set()
    unique_recent = []
    for meal in recent_meals:
        name_key = meal.name.strip().lower()
        if name_key not in seen_names:
            seen_names.add(name_key)
            unique_recent.append(meal)
            if len(unique_recent) >= 15: break
                
    return unique_recent

@router.delete("/custom/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_food(
    food_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_uuid = UUID(current_user_id)
    food = db.query(CustomFood).filter(CustomFood.id == food_id, CustomFood.user_id == user_uuid).first()
    if not food: raise HTTPException(status_code=404)
    db.delete(food)
    db.commit()
    return None