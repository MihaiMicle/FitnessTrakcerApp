from datetime import date
from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class ProfileUpdateRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female)$")
    age: Optional[int] = Field(None, gt=0, lt=120)
    birth_date: Optional[date] = None
    height_cm: Optional[float] = Field(None, gt=50, lt=300)
    weight_kg: Optional[float] = Field(None, gt=20, lt=400)
    activity_level: Optional[float] = Field(None, ge=1.0, le=3.0)
    goal_type: Optional[str] = Field(None, pattern="^(cut|maintain|bulk)$")
    
    # Custom Macro Target Overrides
    target_calories: Optional[int] = Field(None, gt=500, lt=10000)
    target_protein_g: Optional[int] = Field(None, gt=0, lt=1000)
    target_carbs_g: Optional[int] = Field(None, gt=0, lt=1500)
    target_fats_g: Optional[int] = Field(None, gt=0, lt=500)

    auto_calculate: bool = False
    avatar_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: UUID
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    birth_date: Optional[date] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[float] = None
    goal_type: Optional[str] = None
    avatar_url: Optional[str] = None
    
    target_calories: Optional[int] = None
    target_protein_g: Optional[int] = None
    target_carbs_g: Optional[int] = None
    target_fats_g: Optional[int] = None
    target_saturated_fats_g: Optional[float] = None
    target_fiber_g: Optional[float] = None
    target_sugar_g: Optional[float] = None
    target_potassium_mg: Optional[float] = None
    target_sodium_mg: Optional[float] = None
    target_iron_mg: Optional[float] = None
    target_vitamin_d_mcg: Optional[float] = None
    target_zinc_mg: Optional[float] = None
    target_magnesium_mg: Optional[float] = None
    target_calcium_mg: Optional[float] = None
    target_cholesterol_mg: Optional[float] = None

    class Config:
        from_attributes = True