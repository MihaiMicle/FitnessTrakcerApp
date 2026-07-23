from datetime import date
from models import ActivityLevelEnum, GenderEnum, GoalEnum

def calculate_age(birth_date: date) -> int:
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

def calculate_macros(weight_kg: float, height_cm: float, birth_date: date, gender: GenderEnum, activity_level: ActivityLevelEnum, primary_goal: GoalEnum) -> dict:
    age = calculate_age(birth_date)
    
    # Calculate Basal Metabolic Rate (BMR) using Mifflin-St Jeor equation
    base_bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)

    if gender == GenderEnum.MALE:
        bmr = base_bmr + 5
    else:
        bmr = base_bmr - 161
    
    # Apply Total Daily Energy Expenditure (TDEE) multiplier
    activity_multipliers = {
        ActivityLevelEnum.SEDENTARY: 1.2,
        ActivityLevelEnum.LIGHT: 1.375,
        ActivityLevelEnum.MODERATE: 1.55,
        ActivityLevelEnum.HIGH: 1.725,
        ActivityLevelEnum.VERY_HIGH: 1.9
    }
    tdee = bmr * activity_multipliers[activity_level]
    
    # Adjust daily calories based on primary fitness goal
    goal_adjustments = {
        GoalEnum.FAT_LOSS: -300,     # Standard 300 kcal deficit
        GoalEnum.MAINTENANCE: 0,
        GoalEnum.MUSCLE_GAIN: 300    # Lean muscle building surplus
    }
    
    # Apply the safety calorie floor BEFORE calculating macro splits
    target_calories = max(int(tdee + goal_adjustments[primary_goal]), 1200)
    
    # Calculate Macronutrient Split with safety floors
    # Protein: 2.3g per kg of bodyweight (optimal for lean mass retention and hypertrophy)
    target_protein_g = max(int(weight_kg * 2.3), 50)
    
    # Fats: 25% of total daily calories (9 calories per gram)
    target_fats_g = max(int((target_calories * 0.25) / 9), 30)
    
    # Carbs: Remaining calories allocated to carbohydrates (4 calories per gram)
    protein_calories = target_protein_g * 4
    fat_calories = target_fats_g * 9
    remaining_calories = target_calories - (protein_calories + fat_calories)
    target_carbs_g = max(int(remaining_calories / 4), 50)
    
    # Recalculate final total calories from the actual floored macro grams to guarantee 100% chart parity
    final_calories = (target_protein_g * 4) + (target_carbs_g * 4) + (target_fats_g * 9)
    
    return {
        "target_calories": final_calories,
        "target_protein_g": target_protein_g,
        "target_carbs_g": target_carbs_g,
        "target_fats_g": target_fats_g
    }