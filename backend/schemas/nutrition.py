from pydantic import BaseModel, Field, AliasChoices, computed_field, ConfigDict
from typing import Optional, List
from datetime import date
from uuid import UUID


# Daily Log Schemas
class DailyLogCreate(BaseModel):
    date: date
    total_calories: Optional[int] = 0
    total_protein_g: Optional[float] = 0.0
    total_carbs_g: Optional[float] = 0.0
    total_fats_g: Optional[float] = 0.0

    target_calories: Optional[int] = 2500
    target_protein_g: Optional[float] = 180
    target_carbs_g: Optional[float] = 300
    target_fats_g: Optional[float] = 70


class DailyLogResponse(BaseModel):
    id: int
    user_id: UUID  
    date: date
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    
    target_calories: int = 0
    target_protein_g: float = 0.0
    target_carbs_g: float = 0.0
    target_fats_g: float = 0.0
    
    meals: List["MealResponse"] = []

    model_config = ConfigDict(from_attributes=True)

# Meal Schemas
class MealCreate(BaseModel):
    date: date
    # Automatically accept name, food_name, foodName, meal_name, or food from the frontend
    name: str = Field(
        ...,
        validation_alias=AliasChoices(
            "name", "food_name", "foodName", "meal_name", "food", "title"
        ),
    )
    meal_type: str = Field(
        ..., validation_alias=AliasChoices("meal_type", "mealType", "type")
    )
    calories: int = 0
    protein_g: float = Field(
        0.0, validation_alias=AliasChoices("protein_g", "proteinG", "protein")
    )
    carbs_g: float = Field(
        0.0, validation_alias=AliasChoices("carbs_g", "carbsG", "carbs")
    )
    fats_g: float = Field(
        0.0, validation_alias=AliasChoices("fats_g", "fatsG", "fats", "fat")
    )
    serving_size: Optional[float] = Field(
        0.0, validation_alias=AliasChoices("serving_size", "servingSize", "size")
    )
    serving_unit: Optional[str] = Field(
        "g", validation_alias=AliasChoices("serving_unit", "servingUnit", "unit")
    )

    class Config:
        populate_by_name = True


class MealResponse(MealCreate):
    id: UUID
    daily_log_id: int
    date: Optional[date] = None
    serving_size: Optional[float] = 0.0
    serving_unit: Optional[str] = "g"

    # Automatically send "food_name" and "foodName" in the JSON response to Next.js
    @computed_field
    @property
    def food_name(self) -> str:
        return self.name

    @computed_field
    @property
    def foodName(self) -> str:
        return self.name

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
