def calculate_macros(
    weight_kg: float,
    height_cm: float,
    age: int,
    gender: str,
    activity_level: float,
    goal: str,
    body_fat_percentage: float = None,
):
    """
    Calculates TDEE and recommended macronutrient splits based on the best available formula
    Uses Katch-McArdle if body fat is known, defaults to Mifflin-St Jeor otherwise
    """
    # Base BMR Calculation Engine
    if body_fat_percentage is not None and body_fat_percentage > 0:
        # Katch-McArdle Formula (Highly accurate using Lean Body Mass)
        lean_body_mass = weight_kg * (1 - (body_fat_percentage / 100))
        bmr = 370 + (21.6 * lean_body_mass)
    else:
        # Mifflin-St Jeor Formula (Standard Baseline)
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
        bmr += 5 if gender == "male" else -161

    tdee = bmr * float(activity_level)

    # Goal Adjustment
    if goal == "cut":
        target_calories = int(tdee - 500)  # Standard 500 kcal deficit
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

    target_sugar = round(target_carbs * 0.10, 1)  # ~10% of carbs from sugar
    target_fiber = round(target_carbs * 0.14, 1)  # ~14% of carbs from fiber
    target_saturated_fats = round(
        target_fats * 0.25, 1
    )  # max ~25% of fats from saturated fats

    # App-Calculated Micro Baselines
    target_iron = 8.0
    target_zinc = 11.0
    target_calcium = 1200.0
    target_vitamin_d = 25.0
    target_cholesterol = 300.0

    # Dynamic Water Calculation (Bodyweight in kg x 35ml)
    target_water = int(weight_kg * 35)

    if activity_level >= 1.55:
        target_sodium = 3500.0  # Active / Heavy Training Target
        target_potassium = 4500.0  # Active / Heavy Training Target
        target_magnesium = 450.0  # Active / Heavy Training Target
    else:
        target_sodium = 2300.0  # Daily Baseline Target
        target_potassium = 4000.0  # Daily Baseline Target
        target_magnesium = 350.0  # Daily Baseline Target

    return (
        target_calories,
        target_protein,
        target_carbs,
        target_fats,
        target_saturated_fats,
        target_fiber,
        target_sugar,
        target_potassium,
        target_sodium,
        target_iron,
        target_zinc,
        target_magnesium,
        target_calcium,
        target_vitamin_d,
        target_cholesterol,
        target_water,
    )


# The 16-tuple above is positional and easy to mis-unpack at the call site.
# These indices let tests (and future callers) read fields by name without
# changing the function's signature
MACRO_RESULT_FIELDS = (
    "calories",
    "protein_g",
    "carbs_g",
    "fats_g",
    "saturated_fats_g",
    "fiber_g",
    "sugar_g",
    "potassium_mg",
    "sodium_mg",
    "iron_mg",
    "zinc_mg",
    "magnesium_mg",
    "calcium_mg",
    "vitamin_d_mcg",
    "cholesterol_mg",
    "water_ml",
)


def macros_as_dict(*args, **kwargs) -> dict:
    """calculate_macros(...) keyed by name. Convenience for tests and callers."""
    return dict(zip(MACRO_RESULT_FIELDS, calculate_macros(*args, **kwargs)))
