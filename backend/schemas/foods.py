from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from uuid import UUID

class CustomFoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    serving_size: float = 100.0
    serving_unit: str = "g"
    custom_servings: Optional[List[Dict[str, Any]]] = [] 
    calories: int = 0
    protein_g: float = 0.0
    carbs_g: float = 0.0
    fats_g: float = 0.0
    saturated_fats_g: float = 0.0
    fiber_g: float = 0.0
    sugar_g: float = 0.0
    potassium_mg: float = 0.0
    sodium_mg: float = 0.0
    iron_mg: float = 0.0
    vitamin_d_mcg: float = 0.0
    zinc_mg: float = 0.0
    magnesium_mg: float = 0.0
    calcium_mg: float = 0.0
    cholesterol_mg: float = 0.0

class CustomFoodResponse(CustomFoodCreate):
    id: UUID
    user_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)