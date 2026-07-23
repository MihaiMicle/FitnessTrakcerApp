from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import date
from typing import Optional, Literal, Any
from models import GoalEnum, ActivityLevelEnum, GenderEnum

# Properties required from the frontend during onboarding
class UserProfileCreate(BaseModel):
    email: EmailStr
    birth_date: date
    gender: GenderEnum
    activity_level: ActivityLevelEnum
    primary_goal: GoalEnum
    preferred_units: Literal["metric", "imperial"] = "metric" # UI Preference

    # Metric optional in the raw request so imperial users don't have to send them
    height_cm: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    
    # Optional imperial inputs from frontend
    height_ft: Optional[int] = Field(None, ge=0)
    height_in: Optional[float] = Field(None, ge=0, lt=12)
    weight_lbs: Optional[float] = Field(None, gt=0)

    @model_validator(mode='before')
    @classmethod
    def convert_imperial_to_metric(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data  # Skip if not a dict (e.g., already a model instance)

        units = data.get("preferred_units", "metric")
        
        if units == "imperial":
            lbs = data.get("weight_lbs")
            ft = data.get("height_ft", 0)
            inches = data.get("height_in", 0)
            
            if not lbs or (not ft and not inches):
                raise ValueError("If using imperial units, weight_lbs and height_ft/height_in are required.")
            
            # Convert pounds to kilograms (1 lb = 0.45359237 kg)
            data["weight_kg"] = round(lbs * 0.45359237, 2)
            
            # Convert feet/inches to centimeters (1 inch = 2.54 cm)
            total_inches = (ft * 12) + inches
            data["height_cm"] = round(total_inches * 2.54, 2)
            
        elif units == "metric":
            if not data.get("weight_kg") or not data.get("height_cm"):
                raise ValueError("If using metric units, weight_kg and height_cm are required.")
                
        return data


class UserProfileUpdate(BaseModel):
    activity_level: Optional[ActivityLevelEnum] = None
    primary_goal: Optional[GoalEnum] = None
    preferred_units: Optional[Literal["metric", "imperial"]] = None
    
    # Optional Metric inputs
    height_cm: Optional[float] = Field(None, gt=0)
    weight_kg: Optional[float] = Field(None, gt=0)
    
    # Optional Imperial inputs
    height_ft: Optional[int] = Field(None, ge=0)
    height_in: Optional[float] = Field(None, ge=0, lt=12)
    weight_lbs: Optional[float] = Field(None, gt=0)

    @model_validator(mode='before')
    @classmethod
    def convert_imperial_to_metric(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data  # Skip if not a dict (e.g., already a model instance)

        # Only convert if imperial values are explicitly being updated
        if data.get("weight_lbs") is not None:
            data["weight_kg"] = round(data["weight_lbs"] * 0.45359237, 2)
            
        if data.get("height_ft") is not None and data.get("height_in") is not None:
            total_inches = (data["height_ft"] * 12) + data["height_in"]
            data["height_cm"] = round(total_inches * 2.54, 2)
            
        return data

    
# Properties returned back to the frontend (including auto-calculated IDs and macros)
class UserProfileResponse(UserProfileCreate):
    id: int
    target_calories: Optional[int] = None
    target_protein_g: Optional[int] = None
    target_carbs_g: Optional[int] = None
    target_fats_g: Optional[int] = None

    class Config:
        from_attributes = True  # Allows Pydantic to read SQLAlchemy model objects