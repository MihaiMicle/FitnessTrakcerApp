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
    total_saturated_fats_g: Optional[float] = 0.0
    total_fiber_g: Optional[float] = 0.0
    total_sugar_g: Optional[float] = 0.0
    total_potassium_mg: Optional[float] = 0.0
    total_sodium_mg: Optional[float] = 0.0
    total_iron_mg: Optional[float] = 0.0
    total_vitamin_d_mcg: Optional[float] = 0.0
    total_zinc_mg: Optional[float] = 0.0
    total_magnesium_mg: Optional[float] = 0.0
    total_calcium_mg: Optional[float] = 0.0
    total_cholesterol_mg: Optional[float] = 0.0

    target_calories: Optional[int] = 2500
    target_protein_g: Optional[float] = 180
    target_carbs_g: Optional[float] = 300
    target_fats_g: Optional[float] = 70
    target_saturated_fats_g: Optional[float] = 20
    target_fiber_g: Optional[float] = 30
    target_sugar_g: Optional[float] = 50
    target_potassium_mg: Optional[float] = 3500
    target_sodium_mg: Optional[float] = 2300
    target_iron_mg: Optional[float] = 8.0
    target_vitamin_d_mcg: Optional[float] = 25.0
    target_zinc_mg: Optional[float] = 11.0
    target_magnesium_mg: Optional[float] = 400.0
    target_calcium_mg: Optional[float] = 1200.0
    target_cholesterol_mg: Optional[float] = 300.0

class DailyLogResponse(BaseModel):
    id: int
    user_id: UUID  
    date: date
    total_calories: int
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    total_saturated_fats_g: float
    total_fiber_g: float
    total_sugar_g: float
    total_potassium_mg: float
    total_sodium_mg: float
    total_iron_mg: float
    total_vitamin_d_mcg: float
    total_zinc_mg: float
    total_magnesium_mg: float
    total_calcium_mg: float
    total_cholesterol_mg: float
    
    target_calories: int = 0
    target_protein_g: float = 0.0
    target_carbs_g: float = 0.0
    target_fats_g: float = 0.0
    target_saturated_fats_g: float = 0.0
    target_fiber_g: float = 0.0
    target_sugar_g: float = 0.0
    target_potassium_mg: float = 0.0
    target_sodium_mg: float = 0.0
    target_iron_mg: float = 8.0
    target_vitamin_d_mcg: float = 25.0
    target_zinc_mg: float = 11.0
    target_magnesium_mg: float = 400.0
    target_calcium_mg: float = 1200.0
    target_cholesterol_mg: float = 300.0

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
    saturated_fats_g: float = Field(
        0.0, validation_alias=AliasChoices("saturated_fats_g", "saturatedFatsG", "saturatedFats")
    )
    fiber_g: float = Field(
        0.0, validation_alias=AliasChoices("fiber_g", "fiberG", "fiber")
    )
    sugar_g: float = Field(
        0.0, validation_alias=AliasChoices("sugar_g", "sugarG", "sugar")
    )
    potassium_mg: float = Field(
        0.0, validation_alias=AliasChoices("potassium_mg", "potassiumMg", "potassium")
    )
    sodium_mg: float = Field(
        0.0, validation_alias=AliasChoices("sodium_mg", "sodiumMg", "sodium")
    )
    iron_mg: float = 0.0
    vitamin_d_mcg: float = 0.0
    zinc_mg: float = 0.0
    magnesium_mg: float = 0.0
    calcium_mg: float = 0.0
    cholesterol_mg: float = 0.0

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

    @computed_field
    @property
    def food_name(self) -> str:
        return self.name

    @computed_field
    @property
    def foodName(self) -> str:
        return self.name

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)