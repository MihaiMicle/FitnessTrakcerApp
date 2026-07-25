from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = Field(None, pattern="^(male|female)$")
    age: Optional[int] = Field(None, gt=0, lt=120)
    height_cm: Optional[float] = Field(None, gt=50, lt=300)
    weight_kg: Optional[float] = Field(None, gt=20, lt=400)
    activity_level: Optional[str] = Field(None, pattern="^(sedentary|light|moderate|active|athlete)$")
    goal: Optional[str] = Field(None, pattern="^(cut|maintain|bulk)$")
    
    # Custom Macro Target Overrides
    target_calories: Optional[int] = Field(None, gt=500, lt=10000)
    target_protein_g: Optional[int] = Field(None, gt=0, lt=1000)
    target_carbs_g: Optional[int] = Field(None, gt=0, lt=1500)
    target_fats_g: Optional[int] = Field(None, gt=0, lt=500)
    
    # Toggle for algorithm vs. manual custom override
    auto_calculate: bool = False


class UserProfileResponse(BaseModel):
    """How the user profile looks when sent back to the Next.js frontend."""
    id: UUID
    email: Optional[str] = None
    name: Optional[str] = None
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: Optional[str] = None
    goal: Optional[str] = None
    target_calories: Optional[int] = None
    target_protein_g: Optional[int] = None
    target_carbs_g: Optional[int] = None
    target_fats_g: Optional[int] = None

    class Config:
        from_attributes = True  # Allows Pydantic to read directly from SQLAlchemy ORM models