from core.database import SessionLocal
from models.foods import CustomFood
import models.profile

DEFAULT_FOODS = [
    # ---------------------------------------------------------
    # BEEF & PORK
    # ---------------------------------------------------------
    {
        "name": "Fillet Mignon / Tenderloin (Beef, Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 210, "protein_g": 27.6, "carbs_g": 0.0, "fats_g": 10.2, "saturated_fats_g": 3.8, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 395.0, "sodium_mg": 63.0, "iron_mg": 2.4, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 5.2, "magnesium_mg": 26.0, "calcium_mg": 8.0, "cholesterol_mg": 83.0
    },
    {
        "name": "Fillet Mignon / Tenderloin (Beef, Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 143, "protein_g": 21.6, "carbs_g": 0.0, "fats_g": 5.6, "saturated_fats_g": 2.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 331.0, "sodium_mg": 53.0, "iron_mg": 1.7, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 4.0, "magnesium_mg": 23.0, "calcium_mg": 6.0, "cholesterol_mg": 63.0
    },
    {
        "name": "Ground Beef (80% Lean / 20% Fat, Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 271, "protein_g": 24.8, "carbs_g": 0.0, "fats_g": 18.2, "saturated_fats_g": 6.8, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 318.0, "sodium_mg": 82.0, "iron_mg": 2.6, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 5.8, "magnesium_mg": 23.0, "calcium_mg": 23.0, "cholesterol_mg": 90.0
    },
    {
        "name": "Ground Beef (80% Lean / 20% Fat, Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 254, "protein_g": 17.2, "carbs_g": 0.0, "fats_g": 20.0, "saturated_fats_g": 7.6, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 276.0, "sodium_mg": 66.0, "iron_mg": 1.9, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 4.3, "magnesium_mg": 18.0, "calcium_mg": 18.0, "cholesterol_mg": 71.0
    },
    {
        "name": "Ground Beef (90% Lean / 10% Fat, Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 214, "protein_g": 26.6, "carbs_g": 0.0, "fats_g": 11.2, "saturated_fats_g": 4.5, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 354.0, "sodium_mg": 83.0, "iron_mg": 2.8, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 6.4, "magnesium_mg": 24.0, "calcium_mg": 13.0, "cholesterol_mg": 84.0
    },
    {
        "name": "Ground Beef (90% Lean / 10% Fat, Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 176, "protein_g": 20.0, "carbs_g": 0.0, "fats_g": 10.0, "saturated_fats_g": 4.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 305.0, "sodium_mg": 65.0, "iron_mg": 2.1, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 4.8, "magnesium_mg": 20.0, "calcium_mg": 12.0, "cholesterol_mg": 65.0
    },
    {
        "name": "Pork Chop (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 231, "protein_g": 27.3, "carbs_g": 0.0, "fats_g": 12.7, "saturated_fats_g": 4.4, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 419.0, "sodium_mg": 66.0, "iron_mg": 0.9, 
        "vitamin_d_mcg": 0.7, "zinc_mg": 2.3, "magnesium_mg": 26.0, "calcium_mg": 17.0, "cholesterol_mg": 85.0
    },
    {
        "name": "Pork Chop (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 197, "protein_g": 19.3, "carbs_g": 0.0, "fats_g": 12.8, "saturated_fats_g": 4.5, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 352.0, "sodium_mg": 58.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.6, "zinc_mg": 1.7, "magnesium_mg": 22.0, "calcium_mg": 14.0, "cholesterol_mg": 62.0
    },
    {
        "name": "Ribeye Steak (Beef, Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 274, "protein_g": 24.8, "carbs_g": 0.0, "fats_g": 18.6, "saturated_fats_g": 7.9, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 322.0, "sodium_mg": 62.0, "iron_mg": 2.2, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 5.9, "magnesium_mg": 22.0, "calcium_mg": 10.0, "cholesterol_mg": 86.0
    },
    {
        "name": "Ribeye Steak (Beef, Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 291, "protein_g": 19.4, "carbs_g": 0.0, "fats_g": 23.4, "saturated_fats_g": 9.8, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 274.0, "sodium_mg": 53.0, "iron_mg": 1.8, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 4.6, "magnesium_mg": 19.0, "calcium_mg": 8.0, "cholesterol_mg": 65.0
    },

    # ---------------------------------------------------------
    # BEVERAGES (COFFEE, TEA & SODAS)
    # ---------------------------------------------------------
    {
        "name": "7-Up (EU Reduced Sugar Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 19, "protein_g": 0.0, "carbs_g": 4.6, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.6, "potassium_mg": 0.0, "sodium_mg": 4.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Americano (Black Coffee)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 240.0}, {"description": "Large Cup", "equivalent_g": 350.0}],
        "calories": 2, "protein_g": 0.1, "carbs_g": 0.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 49.0, "sodium_mg": 2.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 3.0, "calcium_mg": 2.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Black Tea (Brewed, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 240.0}, {"description": "Large Cup", "equivalent_g": 350.0}],
        "calories": 1, "protein_g": 0.0, "carbs_g": 0.3, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 15.0, "sodium_mg": 1.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 1.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Burn Energy Drink (Original)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "250ml Can", "equivalent_g": 250.0}],
        "calories": 42, "protein_g": 0.0, "carbs_g": 11.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 11.0, "potassium_mg": 0.0, "sodium_mg": 5.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cappuccino (Whole Milk, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 240.0}, {"description": "Large Cup", "equivalent_g": 350.0}],
        "calories": 31, "protein_g": 1.6, "carbs_g": 2.5, "fats_g": 1.7, "saturated_fats_g": 1.0, 
        "fiber_g": 0.0, "sugar_g": 2.5, "potassium_mg": 85.0, "sodium_mg": 24.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.6, "zinc_mg": 0.2, "magnesium_mg": 6.0, "calcium_mg": 60.0, "cholesterol_mg": 5.0
    },
    {
        "name": "Coca-Cola Classic (EU Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 42, "protein_g": 0.0, "carbs_g": 10.6, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 10.6, "potassium_mg": 0.0, "sodium_mg": 0.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Coconut Water (Pure, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [
            {"description": "100g", "equivalent_g": 100.0},
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 240.0}
        ],
        "calories": 19, "protein_g": 0.7, "carbs_g": 3.7, "fats_g": 0.2, "saturated_fats_g": 0.2, 
        "fiber_g": 1.1, "sugar_g": 2.6, "potassium_mg": 250.0, "sodium_mg": 105.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 25.0, "calcium_mg": 24.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Dr Pepper (EU Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 20, "protein_g": 0.0, "carbs_g": 4.9, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.9, "potassium_mg": 0.0, "sodium_mg": 1.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Espresso",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "1 shot", "equivalent_g": 30.0}, {"description": "Double shot", "equivalent_g": 60.0}],
        "calories": 9, "protein_g": 0.1, "carbs_g": 1.7, "fats_g": 0.2, "saturated_fats_g": 0.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 115.0, "sodium_mg": 14.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 80.0, "calcium_mg": 2.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Fanta Orange (EU Reduced Sugar Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 19, "protein_g": 0.0, "carbs_g": 4.6, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.6, "potassium_mg": 0.0, "sodium_mg": 0.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Flat White (Whole Milk, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 180.0}],
        "calories": 48, "protein_g": 2.5, "carbs_g": 3.8, "fats_g": 2.6, "saturated_fats_g": 1.5, 
        "fiber_g": 0.0, "sugar_g": 3.8, "potassium_mg": 130.0, "sodium_mg": 38.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.9, "zinc_mg": 0.3, "magnesium_mg": 9.0, "calcium_mg": 93.0, "cholesterol_mg": 8.0
    },
    {
        "name": "Fuze Tea (Peach / Lemon, EU)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 19, "protein_g": 0.0, "carbs_g": 4.5, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.5, "potassium_mg": 0.0, "sodium_mg": 3.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Green Tea (Brewed, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 240.0}, {"description": "Large Cup", "equivalent_g": 350.0}],
        "calories": 1, "protein_g": 0.0, "carbs_g": 0.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 8.0, "sodium_mg": 1.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 1.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Hell Energy Drink (Classic)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "250ml Can", "equivalent_g": 250.0}, {"description": "500ml Can", "equivalent_g": 500.0}],
        "calories": 46, "protein_g": 0.0, "carbs_g": 10.9, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 10.9, "potassium_mg": 0.0, "sodium_mg": 20.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Iced Latte (Whole Milk, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 350.0}, {"description": "Large Cup", "equivalent_g": 470.0}],
        "calories": 35, "protein_g": 1.9, "carbs_g": 2.8, "fats_g": 1.9, "saturated_fats_g": 1.1, 
        "fiber_g": 0.0, "sugar_g": 2.8, "potassium_mg": 95.0, "sodium_mg": 28.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.7, "zinc_mg": 0.2, "magnesium_mg": 7.0, "calcium_mg": 68.0, "cholesterol_mg": 6.0
    },
    {
        "name": "Latte (Whole Milk, Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "Standard Cup", "equivalent_g": 240.0}, {"description": "Large Cup", "equivalent_g": 350.0}],
        "calories": 42, "protein_g": 2.2, "carbs_g": 3.4, "fats_g": 2.3, "saturated_fats_g": 1.3, 
        "fiber_g": 0.0, "sugar_g": 3.4, "potassium_mg": 115.0, "sodium_mg": 33.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.8, "zinc_mg": 0.3, "magnesium_mg": 8.0, "calcium_mg": 82.0, "cholesterol_mg": 7.0
    },
    {
        "name": "Lipton Ice Tea (Peach / Lemon, EU)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 19, "protein_g": 0.0, "carbs_g": 4.6, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.5, "potassium_mg": 0.0, "sodium_mg": 3.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Mirinda Orange (EU Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 21, "protein_g": 0.0, "carbs_g": 5.2, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 5.2, "potassium_mg": 0.0, "sodium_mg": 3.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Monster Energy (Original Green, EU)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "500ml Can", "equivalent_g": 500.0}],
        "calories": 47, "protein_g": 0.0, "carbs_g": 12.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 11.0, "potassium_mg": 0.0, "sodium_mg": 19.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Mountain Dew (Citrus Blast / EU Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 20, "protein_g": 0.0, "carbs_g": 4.9, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.8, "potassium_mg": 0.0, "sodium_mg": 2.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Nestea (Peach / Lemon, EU)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 18, "protein_g": 0.0, "carbs_g": 4.5, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 4.5, "potassium_mg": 0.0, "sodium_mg": 2.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pepsi Classic (EU Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 43, "protein_g": 0.0, "carbs_g": 10.7, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 10.7, "potassium_mg": 0.0, "sodium_mg": 1.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Red Bull Energy Drink",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "250ml Can", "equivalent_g": 250.0}, {"description": "355ml Can", "equivalent_g": 355.0}, {"description": "473ml Can", "equivalent_g": 473.0}],
        "calories": 46, "protein_g": 0.0, "carbs_g": 11.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 11.0, "potassium_mg": 0.0, "sodium_mg": 40.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Rockstar Energy Drink (Original, EU)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "500ml Can", "equivalent_g": 500.0}],
        "calories": 45, "protein_g": 0.4, "carbs_g": 11.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 11.0, "potassium_mg": 0.0, "sodium_mg": 20.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Schweppes Tonic Water (EU Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 36, "protein_g": 0.0, "carbs_g": 8.9, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 8.9, "potassium_mg": 0.0, "sodium_mg": 0.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sprite (EU Reduced Sugar Formulation)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "330ml Can", "equivalent_g": 330.0}, {"description": "500ml Bottle", "equivalent_g": 500.0}, {"description": "750ml", "equivalent_g": 750.0}, {"description": "1000ml (1L)", "equivalent_g": 1000.0}],
        "calories": 9, "protein_g": 0.0, "carbs_g": 2.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 2.0, "potassium_mg": 0.0, "sodium_mg": 1.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # BREAD
    # ---------------------------------------------------------
    {
        "name": "Integral / Whole Wheat Bread",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 slice", "equivalent_g": 28.0}],
        "calories": 252, "protein_g": 12.5, "carbs_g": 42.7, "fats_g": 3.5, "saturated_fats_g": 0.7, 
        "fiber_g": 6.0, "sugar_g": 4.3, "potassium_mg": 254.0, "sodium_mg": 400.0, "iron_mg": 2.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.8, "magnesium_mg": 76.0, "calcium_mg": 161.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Bread (Commercially Prepared)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 slice", "equivalent_g": 25.0}],
        "calories": 266, "protein_g": 8.8, "carbs_g": 50.6, "fats_g": 3.3, "saturated_fats_g": 0.7, 
        "fiber_g": 2.7, "sugar_g": 5.7, "potassium_mg": 131.0, "sodium_mg": 495.0, "iron_mg": 3.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.8, "magnesium_mg": 25.0, "calcium_mg": 260.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # CONDIMENTS, SAUCES & OILS
    # ---------------------------------------------------------
    {
        "name": "Capers (Canned / Brined, Drained)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 138.0}
        ],
        "calories": 23, "protein_g": 2.4, "carbs_g": 4.9, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 3.2, "sugar_g": 0.4, "potassium_mg": 40.0, "sodium_mg": 2964.0, "iron_mg": 1.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 33.0, "calcium_mg": 40.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Heinz Ketchup (50% Less Sugar & Salt, EU Formulation)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 240.0},
            {"description": "1 tablespoon", "equivalent_g": 15.0},
            {"description": "1 teaspoon", "equivalent_g": 5.0}
        ],
        "calories": 57, "protein_g": 1.4, "carbs_g": 12.0, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.0, "sugar_g": 11.0, "potassium_mg": 350.0, "sodium_mg": 450.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 15.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Heinz Ketchup (Classic, EU Formulation)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 240.0},
            {"description": "1 tablespoon", "equivalent_g": 15.0},
            {"description": "1 teaspoon", "equivalent_g": 5.0}
        ],
        "calories": 102, "protein_g": 1.2, "carbs_g": 23.2, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.9, "sugar_g": 22.8, "potassium_mg": 300.0, "sodium_mg": 900.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 15.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Mustard (Yellow / Generic)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 240.0},
            {"description": "1 tablespoon", "equivalent_g": 15.0},
            {"description": "1 teaspoon", "equivalent_g": 5.0}
        ],
        "calories": 60, "protein_g": 3.8, "carbs_g": 5.8, "fats_g": 2.8, "saturated_fats_g": 0.2, 
        "fiber_g": 2.9, "sugar_g": 0.9, "potassium_mg": 135.0, "sodium_mg": 1100.0, "iron_mg": 1.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.6, "magnesium_mg": 49.0, "calcium_mg": 58.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Olive Oil (Extra Virgin)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "100ml", "equivalent_g": 92.0}, {"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 tablespoon", "equivalent_g": 14.0}, {"description": "1 teaspoon", "equivalent_g": 4.5}],
        "calories": 884, "protein_g": 0.0, "carbs_g": 0.0, "fats_g": 100.0, "saturated_fats_g": 13.8, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 1.0, "sodium_mg": 2.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 1.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Peanut Butter (Natural, Creamy)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 258.0}, {"description": "1 tablespoon", "equivalent_g": 16.0}, {"description": "1 teaspoon", "equivalent_g": 5.0}],
        "calories": 588, "protein_g": 25.1, "carbs_g": 20.0, "fats_g": 50.4, "saturated_fats_g": 10.3, 
        "fiber_g": 6.0, "sugar_g": 9.2, "potassium_mg": 649.0, "sodium_mg": 17.0, "iron_mg": 1.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 2.9, "magnesium_mg": 154.0, "calcium_mg": 43.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Soy Sauce",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 250.0}, {"description": "1 tablespoon", "equivalent_g": 15.0}, {"description": "1 teaspoon", "equivalent_g": 5.0}],
        "calories": 53, "protein_g": 8.0, "carbs_g": 4.9, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.8, "sugar_g": 0.4, "potassium_mg": 212.0, "sodium_mg": 5493.0, "iron_mg": 2.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 40.0, "calcium_mg": 20.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sriracha Sauce",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 240.0},
            {"description": "1 tablespoon", "equivalent_g": 15.0},
            {"description": "1 teaspoon", "equivalent_g": 5.0}
        ],
        "calories": 80, "protein_g": 1.8, "carbs_g": 16.0, "fats_g": 0.5, "saturated_fats_g": 0.1, 
        "fiber_g": 1.2, "sugar_g": 10.0, "potassium_mg": 260.0, "sodium_mg": 1900.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 16.0, "calcium_mg": 14.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # DAIRY & MILK ALTERNATIVES
    # ---------------------------------------------------------
    {
        "name": "Almond Milk (Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "100g", "equivalent_g": 103.0}, {"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 240.0}],
        "calories": 15, "protein_g": 0.5, "carbs_g": 0.3, "fats_g": 1.2, "saturated_fats_g": 0.1, 
        "fiber_g": 0.2, "sugar_g": 0.0, "potassium_mg": 67.0, "sodium_mg": 73.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 1.0, "zinc_mg": 0.1, "magnesium_mg": 6.0, "calcium_mg": 184.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Coconut Milk (Unsweetened Beverage)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "100g", "equivalent_g": 103.0}, {"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 240.0}],
        "calories": 20, "protein_g": 0.2, "carbs_g": 0.6, "fats_g": 2.1, "saturated_fats_g": 1.9, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 19.0, "sodium_mg": 16.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 1.0, "zinc_mg": 0.1, "magnesium_mg": 4.0, "calcium_mg": 188.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Greek Yogurt (0% Fat, Plain)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 245.0}],
        "calories": 59, "protein_g": 10.3, "carbs_g": 3.6, "fats_g": 0.4, "saturated_fats_g": 0.1, 
        "fiber_g": 0.0, "sugar_g": 3.2, "potassium_mg": 141.0, "sodium_mg": 36.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 11.0, "calcium_mg": 110.0, "cholesterol_mg": 5.0
    },
    {
        "name": "Greek Yogurt (10% Fat, Plain)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 245.0}],
        "calories": 130, "protein_g": 9.0, "carbs_g": 4.0, "fats_g": 10.0, "saturated_fats_g": 6.5, 
        "fiber_g": 0.0, "sugar_g": 3.5, "potassium_mg": 130.0, "sodium_mg": 32.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 0.6, "magnesium_mg": 10.0, "calcium_mg": 100.0, "cholesterol_mg": 35.0
    },
    {
        "name": "Greek Yogurt (2% Fat, Plain)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 245.0}],
        "calories": 73, "protein_g": 9.9, "carbs_g": 3.9, "fats_g": 1.9, "saturated_fats_g": 1.1, 
        "fiber_g": 0.0, "sugar_g": 3.6, "potassium_mg": 135.0, "sodium_mg": 34.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.6, "magnesium_mg": 11.0, "calcium_mg": 105.0, "cholesterol_mg": 10.0
    },
    {
        "name": "Milk (1.5% Fat, Low-Fat)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "100g", "equivalent_g": 103.0}, {"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 244.0}],
        "calories": 47, "protein_g": 3.3, "carbs_g": 5.0, "fats_g": 1.5, "saturated_fats_g": 0.9, 
        "fiber_g": 0.0, "sugar_g": 5.0, "potassium_mg": 150.0, "sodium_mg": 44.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 1.1, "zinc_mg": 0.4, "magnesium_mg": 11.0, "calcium_mg": 120.0, "cholesterol_mg": 5.0
    },
    {
        "name": "Milk (3.5% Fat, Whole)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "100g", "equivalent_g": 103.0}, {"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 244.0}],
        "calories": 61, "protein_g": 3.2, "carbs_g": 4.8, "fats_g": 3.3, "saturated_fats_g": 1.9, 
        "fiber_g": 0.0, "sugar_g": 4.8, "potassium_mg": 132.0, "sodium_mg": 43.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 1.2, "zinc_mg": 0.4, "magnesium_mg": 10.0, "calcium_mg": 113.0, "cholesterol_mg": 10.0
    },
    {
        "name": "Parmigiano Reggiano (Cheese)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 100.0}],
        "calories": 392, "protein_g": 35.8, "carbs_g": 3.2, "fats_g": 25.8, "saturated_fats_g": 16.4, 
        "fiber_g": 0.0, "sugar_g": 0.8, "potassium_mg": 92.0, "sodium_mg": 1529.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.5, "zinc_mg": 2.8, "magnesium_mg": 44.0, "calcium_mg": 1109.0, "cholesterol_mg": 68.0
    },
    {
        "name": "Soy Milk (Unsweetened)",
        "serving_size": 100.0, "serving_unit": "ml",
        "custom_servings": [{"description": "100g", "equivalent_g": 103.0}, {"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 240.0}],
        "calories": 33, "protein_g": 2.8, "carbs_g": 1.8, "fats_g": 1.5, "saturated_fats_g": 0.2, 
        "fiber_g": 0.4, "sugar_g": 0.4, "potassium_mg": 118.0, "sodium_mg": 51.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 1.1, "zinc_mg": 0.2, "magnesium_mg": 15.0, "calcium_mg": 123.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # EGGS
    # ---------------------------------------------------------
    {
        "name": "Egg Whites (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 243.0}, {"description": "1 large", "equivalent_g": 33.0}],
        "calories": 52, "protein_g": 10.9, "carbs_g": 0.7, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 0.7, "potassium_mg": 163.0, "sodium_mg": 166.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 11.0, "calcium_mg": 7.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Egg Yolks (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 yolk", "equivalent_g": 17.0}],
        "calories": 322, "protein_g": 15.9, "carbs_g": 3.6, "fats_g": 26.5, "saturated_fats_g": 9.6, 
        "fiber_g": 0.0, "sugar_g": 0.6, "potassium_mg": 109.0, "sodium_mg": 48.0, "iron_mg": 2.7, 
        "vitamin_d_mcg": 5.4, "zinc_mg": 2.3, "magnesium_mg": 5.0, "calcium_mg": 129.0, "cholesterol_mg": 1085.0
    },
    {
        "name": "Whole Eggs (Boiled / Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 50.0}, {"description": "1 medium", "equivalent_g": 44.0}, {"description": "1 small", "equivalent_g": 38.0}],
        "calories": 155, "protein_g": 12.6, "carbs_g": 1.1, "fats_g": 10.6, "saturated_fats_g": 3.3, 
        "fiber_g": 0.0, "sugar_g": 1.1, "potassium_mg": 126.0, "sodium_mg": 124.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 2.2, "zinc_mg": 1.0, "magnesium_mg": 10.0, "calcium_mg": 50.0, "cholesterol_mg": 373.0
    },
    {
        "name": "Whole Eggs (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 50.0}, {"description": "1 medium", "equivalent_g": 44.0}, {"description": "1 small", "equivalent_g": 38.0}],
        "calories": 143, "protein_g": 12.6, "carbs_g": 0.7, "fats_g": 9.5, "saturated_fats_g": 3.1, 
        "fiber_g": 0.0, "sugar_g": 0.4, "potassium_mg": 138.0, "sodium_mg": 142.0, "iron_mg": 1.8, 
        "vitamin_d_mcg": 2.0, "zinc_mg": 1.3, "magnesium_mg": 12.0, "calcium_mg": 56.0, "cholesterol_mg": 372.0
    },

    # ---------------------------------------------------------
    # FISH & SEAFOOD
    # ---------------------------------------------------------
    {
        "name": "Bream (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 120.0}],
        "calories": 135, "protein_g": 25.3, "carbs_g": 0.0, "fats_g": 3.0, "saturated_fats_g": 0.7, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 504.0, "sodium_mg": 87.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 8.0, "zinc_mg": 0.5, "magnesium_mg": 36.0, "calcium_mg": 33.0, "cholesterol_mg": 65.0
    },
    {
        "name": "Bream (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 140.0}],
        "calories": 105, "protein_g": 19.7, "carbs_g": 0.0, "fats_g": 2.3, "saturated_fats_g": 0.5, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 393.0, "sodium_mg": 68.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 6.2, "zinc_mg": 0.4, "magnesium_mg": 28.0, "calcium_mg": 26.0, "cholesterol_mg": 51.0
    },
    {
        "name": "Canned Tuna (In Water, Drained)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 90, "protein_g": 19.4, "carbs_g": 0.0, "fats_g": 0.8, "saturated_fats_g": 0.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 175.0, "sodium_mg": 247.0, "iron_mg": 1.6, 
        "vitamin_d_mcg": 1.4, "zinc_mg": 0.7, "magnesium_mg": 27.0, "calcium_mg": 11.0, "cholesterol_mg": 36.0
    },
    {
        "name": "Cod (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 135.0}],
        "calories": 105, "protein_g": 22.8, "carbs_g": 0.0, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 502.0, "sodium_mg": 78.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 1.1, "zinc_mg": 0.5, "magnesium_mg": 38.0, "calcium_mg": 15.0, "cholesterol_mg": 55.0
    },
    {
        "name": "Cod (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 150.0}],
        "calories": 82, "protein_g": 17.8, "carbs_g": 0.0, "fats_g": 0.7, "saturated_fats_g": 0.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 413.0, "sodium_mg": 54.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.9, "zinc_mg": 0.4, "magnesium_mg": 32.0, "calcium_mg": 16.0, "cholesterol_mg": 43.0
    },
    {
        "name": "Haddock (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 135.0}],
        "calories": 112, "protein_g": 24.2, "carbs_g": 0.0, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 349.0, "sodium_mg": 87.0, "iron_mg": 1.3, 
        "vitamin_d_mcg": 0.8, "zinc_mg": 0.4, "magnesium_mg": 26.0, "calcium_mg": 42.0, "cholesterol_mg": 74.0
    },
    {
        "name": "Haddock (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 150.0}],
        "calories": 87, "protein_g": 18.9, "carbs_g": 0.0, "fats_g": 0.7, "saturated_fats_g": 0.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 351.0, "sodium_mg": 68.0, "iron_mg": 1.0, 
        "vitamin_d_mcg": 0.6, "zinc_mg": 0.4, "magnesium_mg": 21.0, "calcium_mg": 14.0, "cholesterol_mg": 57.0
    },
    {
        "name": "Perch (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 110.0}],
        "calories": 117, "protein_g": 24.9, "carbs_g": 0.0, "fats_g": 1.2, "saturated_fats_g": 0.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 345.0, "sodium_mg": 79.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 3.3, "zinc_mg": 1.4, "magnesium_mg": 38.0, "calcium_mg": 103.0, "cholesterol_mg": 115.0
    },
    {
        "name": "Perch (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 130.0}],
        "calories": 91, "protein_g": 19.4, "carbs_g": 0.0, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 269.0, "sodium_mg": 62.0, "iron_mg": 0.9, 
        "vitamin_d_mcg": 2.6, "zinc_mg": 1.1, "magnesium_mg": 30.0, "calcium_mg": 80.0, "cholesterol_mg": 90.0
    },
    {
        "name": "Salmon (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 155.0}],
        "calories": 206, "protein_g": 22.1, "carbs_g": 0.0, "fats_g": 12.3, "saturated_fats_g": 2.5, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 384.0, "sodium_mg": 61.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 13.1, "zinc_mg": 0.5, "magnesium_mg": 30.0, "calcium_mg": 15.0, "cholesterol_mg": 63.0
    },
    {
        "name": "Salmon (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 170.0}],
        "calories": 208, "protein_g": 20.4, "carbs_g": 0.0, "fats_g": 13.4, "saturated_fats_g": 3.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 363.0, "sodium_mg": 59.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 13.1, "zinc_mg": 0.4, "magnesium_mg": 27.0, "calcium_mg": 9.0, "cholesterol_mg": 55.0
    },
    {
        "name": "Smoked Salmon",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 113.0}],
        "calories": 117, "protein_g": 18.3, "carbs_g": 0.0, "fats_g": 4.3, "saturated_fats_g": 0.9, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 175.0, "sodium_mg": 672.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 17.1, "zinc_mg": 0.3, "magnesium_mg": 18.0, "calcium_mg": 11.0, "cholesterol_mg": 23.0
    },
    {
        "name": "Trout (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 140.0}],
        "calories": 190, "protein_g": 26.6, "carbs_g": 0.0, "fats_g": 8.5, "saturated_fats_g": 1.8, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 463.0, "sodium_mg": 67.0, "iron_mg": 1.9, 
        "vitamin_d_mcg": 5.0, "zinc_mg": 0.8, "magnesium_mg": 28.0, "calcium_mg": 55.0, "cholesterol_mg": 74.0
    },
    {
        "name": "Trout (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 160.0}],
        "calories": 148, "protein_g": 20.8, "carbs_g": 0.0, "fats_g": 6.6, "saturated_fats_g": 1.4, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 361.0, "sodium_mg": 52.0, "iron_mg": 1.5, 
        "vitamin_d_mcg": 3.9, "zinc_mg": 0.6, "magnesium_mg": 22.0, "calcium_mg": 43.0, "cholesterol_mg": 58.0
    },
    {
        "name": "Tuna (Cooked, Fresh)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 150.0}],
        "calories": 130, "protein_g": 28.0, "carbs_g": 0.0, "fats_g": 0.6, "saturated_fats_g": 0.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 323.0, "sodium_mg": 50.0, "iron_mg": 1.0, 
        "vitamin_d_mcg": 7.3, "zinc_mg": 0.5, "magnesium_mg": 35.0, "calcium_mg": 10.0, "cholesterol_mg": 50.0
    },
    {
        "name": "Tuna (Raw, Fresh)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fillet", "equivalent_g": 170.0}],
        "calories": 109, "protein_g": 24.4, "carbs_g": 0.0, "fats_g": 0.5, "saturated_fats_g": 0.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 252.0, "sodium_mg": 39.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 5.7, "zinc_mg": 0.4, "magnesium_mg": 27.0, "calcium_mg": 8.0, "cholesterol_mg": 39.0
    },

    # ---------------------------------------------------------
    # FRUITS
    # ---------------------------------------------------------
    {
        "name": "Apple (Raw, with skin)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fruit", "equivalent_g": 182.0}, {"description": "1 slice", "equivalent_g": 15.0}],
        "calories": 52, "protein_g": 0.3, "carbs_g": 13.8, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 2.4, "sugar_g": 10.4, "potassium_mg": 107.0, "sodium_mg": 1.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 5.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Apricot (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 165.0},
            {"description": "1 fruit", "equivalent_g": 35.0},
            {"description": "1 slice", "equivalent_g": 17.0}
        ],
        "calories": 48, "protein_g": 1.4, "carbs_g": 11.1, "fats_g": 0.4, "saturated_fats_g": 0.0, 
        "fiber_g": 2.0, "sugar_g": 9.2, "potassium_mg": 259.0, "sodium_mg": 1.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 10.0, "calcium_mg": 13.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Avocado (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fruit", "equivalent_g": 201.0}, {"description": "1 slice", "equivalent_g": 15.0}],
        "calories": 160, "protein_g": 2.0, "carbs_g": 8.5, "fats_g": 14.7, "saturated_fats_g": 2.1, 
        "fiber_g": 6.7, "sugar_g": 0.7, "potassium_mg": 485.0, "sodium_mg": 7.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.6, "magnesium_mg": 29.0, "calcium_mg": 12.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Banana (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 136.0}, {"description": "1 medium", "equivalent_g": 118.0}, {"description": "1 small", "equivalent_g": 101.0}],
        "calories": 89, "protein_g": 1.1, "carbs_g": 22.8, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 2.6, "sugar_g": 12.2, "potassium_mg": 358.0, "sodium_mg": 1.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 27.0, "calcium_mg": 5.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Blackberries (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 144.0}, {"description": "1 berry", "equivalent_g": 5.0}],
        "calories": 43, "protein_g": 1.4, "carbs_g": 9.6, "fats_g": 0.5, "saturated_fats_g": 0.0, 
        "fiber_g": 5.3, "sugar_g": 4.9, "potassium_mg": 162.0, "sodium_mg": 1.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 20.0, "calcium_mg": 29.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Blueberries (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 148.0}, {"description": "1 berry", "equivalent_g": 2.0}],
        "calories": 57, "protein_g": 0.7, "carbs_g": 14.5, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 2.4, "sugar_g": 10.0, "potassium_mg": 77.0, "sodium_mg": 1.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 6.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cantaloupe Melon (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 160.0},
            {"description": "1 slice", "equivalent_g": 69.0}
        ],
        "calories": 34, "protein_g": 0.8, "carbs_g": 8.2, "fats_g": 0.2, "saturated_fats_g": 0.1, 
        "fiber_g": 0.9, "sugar_g": 7.9, "potassium_mg": 267.0, "sodium_mg": 16.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 12.0, "calcium_mg": 9.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cherries (Raw, Sweet)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 154.0}, {"description": "1 berry", "equivalent_g": 8.0}],
        "calories": 63, "protein_g": 1.1, "carbs_g": 16.0, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 2.1, "sugar_g": 12.8, "potassium_mg": 222.0, "sodium_mg": 0.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 11.0, "calcium_mg": 13.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Coconut Flakes (Unsweetened, Dried)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 93.0}
        ],
        "calories": 660, "protein_g": 6.9, "carbs_g": 23.7, "fats_g": 64.5, "saturated_fats_g": 57.2, 
        "fiber_g": 16.3, "sugar_g": 7.4, "potassium_mg": 543.0, "sodium_mg": 37.0, "iron_mg": 3.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 2.0, "magnesium_mg": 90.0, "calcium_mg": 26.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cranberries (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 100.0}, {"description": "1 berry", "equivalent_g": 1.0}],
        "calories": 46, "protein_g": 0.4, "carbs_g": 12.2, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 4.6, "sugar_g": 4.0, "potassium_mg": 85.0, "sodium_mg": 2.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 6.0, "calcium_mg": 8.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Fig (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 149.0},
            {"description": "1 fruit", "equivalent_g": 50.0}
        ],
        "calories": 74, "protein_g": 0.8, "carbs_g": 19.2, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 2.9, "sugar_g": 16.3, "potassium_mg": 232.0, "sodium_mg": 1.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 17.0, "calcium_mg": 35.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Grapefruit (Raw, Pink/Red)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 230.0}, {"description": "1 fruit", "equivalent_g": 246.0}, {"description": "1 slice", "equivalent_g": 20.0}],
        "calories": 42, "protein_g": 0.8, "carbs_g": 10.7, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.6, "sugar_g": 6.9, "potassium_mg": 135.0, "sodium_mg": 0.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 9.0, "calcium_mg": 22.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Grapes (Raw, Red or Green)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 151.0}, {"description": "1 berry", "equivalent_g": 5.0}],
        "calories": 69, "protein_g": 0.7, "carbs_g": 18.1, "fats_g": 0.2, "saturated_fats_g": 0.1, 
        "fiber_g": 0.9, "sugar_g": 15.5, "potassium_mg": 191.0, "sodium_mg": 2.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 7.0, "calcium_mg": 10.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Honeydew Melon (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 170.0},
            {"description": "1 slice", "equivalent_g": 160.0}
        ],
        "calories": 36, "protein_g": 0.5, "carbs_g": 9.1, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.8, "sugar_g": 8.1, "potassium_mg": 228.0, "sodium_mg": 18.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 10.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Kiwi (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 180.0}, {"description": "1 fruit", "equivalent_g": 69.0}, {"description": "1 slice", "equivalent_g": 10.0}],
        "calories": 61, "protein_g": 1.1, "carbs_g": 14.7, "fats_g": 0.5, "saturated_fats_g": 0.0, 
        "fiber_g": 3.0, "sugar_g": 9.0, "potassium_mg": 312.0, "sodium_mg": 3.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 17.0, "calcium_mg": 34.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Lemon (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 212.0}, {"description": "1 fruit", "equivalent_g": 58.0}, {"description": "1 slice", "equivalent_g": 5.0}],
        "calories": 29, "protein_g": 1.1, "carbs_g": 9.3, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 2.8, "sugar_g": 2.5, "potassium_mg": 138.0, "sodium_mg": 2.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 8.0, "calcium_mg": 26.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Lime (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 200.0}, {"description": "1 fruit", "equivalent_g": 67.0}, {"description": "1 slice", "equivalent_g": 5.0}],
        "calories": 30, "protein_g": 0.7, "carbs_g": 10.5, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 2.8, "sugar_g": 1.7, "potassium_mg": 102.0, "sodium_mg": 2.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 6.0, "calcium_mg": 33.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Mandarin / Tangerine (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 195.0}, {"description": "1 fruit", "equivalent_g": 88.0}, {"description": "1 slice", "equivalent_g": 10.0}],
        "calories": 53, "protein_g": 0.8, "carbs_g": 13.3, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 1.8, "sugar_g": 10.6, "potassium_mg": 166.0, "sodium_mg": 2.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 12.0, "calcium_mg": 37.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Mango (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 165.0}, {"description": "1 fruit", "equivalent_g": 336.0}, {"description": "1 slice", "equivalent_g": 20.0}],
        "calories": 60, "protein_g": 0.8, "carbs_g": 15.0, "fats_g": 0.4, "saturated_fats_g": 0.1, 
        "fiber_g": 1.6, "sugar_g": 13.7, "potassium_mg": 168.0, "sodium_mg": 1.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 10.0, "calcium_mg": 11.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Nectarine (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 143.0}, {"description": "1 fruit", "equivalent_g": 136.0}, {"description": "1 slice", "equivalent_g": 10.0}],
        "calories": 44, "protein_g": 1.1, "carbs_g": 10.5, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 1.7, "sugar_g": 7.9, "potassium_mg": 201.0, "sodium_mg": 0.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 9.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Orange (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 180.0}, {"description": "1 fruit", "equivalent_g": 131.0}, {"description": "1 slice", "equivalent_g": 15.0}],
        "calories": 47, "protein_g": 0.9, "carbs_g": 11.8, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 2.4, "sugar_g": 9.4, "potassium_mg": 181.0, "sodium_mg": 0.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 10.0, "calcium_mg": 40.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Papaya (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 145.0},
            {"description": "1 fruit", "equivalent_g": 304.0},
            {"description": "1 slice", "equivalent_g": 100.0}
        ],
        "calories": 43, "protein_g": 0.5, "carbs_g": 10.8, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 1.7, "sugar_g": 7.8, "potassium_mg": 182.0, "sodium_mg": 8.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 21.0, "calcium_mg": 20.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Peach (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 fruit", "equivalent_g": 150.0}, {"description": "1 slice", "equivalent_g": 15.0}],
        "calories": 39, "protein_g": 0.9, "carbs_g": 9.5, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 1.5, "sugar_g": 8.4, "potassium_mg": 190.0, "sodium_mg": 0.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 9.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pineapple (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 165.0}, {"description": "1 fruit", "equivalent_g": 905.0}, {"description": "1 slice", "equivalent_g": 84.0}],
        "calories": 50, "protein_g": 0.5, "carbs_g": 13.1, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.4, "sugar_g": 9.8, "potassium_mg": 109.0, "sodium_mg": 1.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 12.0, "calcium_mg": 13.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Plum (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 165.0}, {"description": "1 fruit", "equivalent_g": 66.0}, {"description": "1 slice", "equivalent_g": 8.0}],
        "calories": 46, "protein_g": 0.7, "carbs_g": 11.4, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 1.4, "sugar_g": 9.9, "potassium_mg": 157.0, "sodium_mg": 0.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 7.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Raspberries (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 123.0}, {"description": "1 berry", "equivalent_g": 2.0}],
        "calories": 52, "protein_g": 1.2, "carbs_g": 11.9, "fats_g": 0.7, "saturated_fats_g": 0.0, 
        "fiber_g": 6.5, "sugar_g": 4.4, "potassium_mg": 151.0, "sodium_mg": 1.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 22.0, "calcium_mg": 25.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Strawberries (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 152.0}, {"description": "1 berry", "equivalent_g": 12.0}],
        "calories": 32, "protein_g": 0.7, "carbs_g": 7.7, "fats_g": 0.3, "saturated_fats_g": 0.0, 
        "fiber_g": 2.0, "sugar_g": 4.9, "potassium_mg": 153.0, "sodium_mg": 1.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 13.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Watermelon (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 152.0},
            {"description": "1 slice", "equivalent_g": 286.0}
        ],
        "calories": 30, "protein_g": 0.6, "carbs_g": 7.6, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 0.4, "sugar_g": 6.2, "potassium_mg": 112.0, "sodium_mg": 1.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 10.0, "calcium_mg": 7.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # GRAINS, PASTA & CEREALS
    # ---------------------------------------------------------
    {
        "name": "Cornflakes (Unsweetened)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 28.0}
        ],
        "calories": 357, "protein_g": 8.0, "carbs_g": 84.0, "fats_g": 0.4, "saturated_fats_g": 0.1, 
        "fiber_g": 3.3, "sugar_g": 1.5, "potassium_mg": 168.0, "sodium_mg": 729.0, "iron_mg": 28.0, 
        "vitamin_d_mcg": 4.0, "zinc_mg": 1.5, "magnesium_mg": 39.0, "calcium_mg": 14.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Fusilli Pasta (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 140.0}],
        "calories": 158, "protein_g": 5.8, "carbs_g": 31.0, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 1.8, "sugar_g": 0.4, "potassium_mg": 44.0, "sodium_mg": 1.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 18.0, "calcium_mg": 7.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Fusilli Pasta (Dry, Enriched)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 107.0}],
        "calories": 371, "protein_g": 13.0, "carbs_g": 74.0, "fats_g": 1.5, "saturated_fats_g": 0.3, 
        "fiber_g": 3.2, "sugar_g": 2.7, "potassium_mg": 223.0, "sodium_mg": 6.0, "iron_mg": 1.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.4, "magnesium_mg": 53.0, "calcium_mg": 21.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Glass Noodles (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 110, "protein_g": 0.1, "carbs_g": 27.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.2, "sugar_g": 0.0, "potassium_mg": 3.0, "sodium_mg": 3.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 2.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Glass Noodles (Dry, Cellophane)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 351, "protein_g": 0.2, "carbs_g": 86.0, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.5, "sugar_g": 0.0, "potassium_mg": 10.0, "sodium_mg": 10.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 5.0, "calcium_mg": 20.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Oats (Cooked with Water)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 234.0}],
        "calories": 71, "protein_g": 2.5, "carbs_g": 12.0, "fats_g": 1.5, "saturated_fats_g": 0.3, 
        "fiber_g": 1.7, "sugar_g": 0.0, "potassium_mg": 61.0, "sodium_mg": 49.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.6, "magnesium_mg": 26.0, "calcium_mg": 9.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Oats (Dry, Rolled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 81.0}],
        "calories": 389, "protein_g": 16.9, "carbs_g": 66.3, "fats_g": 6.9, "saturated_fats_g": 1.2, 
        "fiber_g": 10.6, "sugar_g": 0.0, "potassium_mg": 362.0, "sodium_mg": 2.0, "iron_mg": 4.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 3.6, "magnesium_mg": 138.0, "calcium_mg": 52.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Penne Pasta (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 140.0}],
        "calories": 158, "protein_g": 5.8, "carbs_g": 31.0, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 1.8, "sugar_g": 0.4, "potassium_mg": 44.0, "sodium_mg": 1.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 18.0, "calcium_mg": 7.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Penne Pasta (Dry, Enriched)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 107.0}],
        "calories": 371, "protein_g": 13.0, "carbs_g": 74.0, "fats_g": 1.5, "saturated_fats_g": 0.3, 
        "fiber_g": 3.2, "sugar_g": 2.7, "potassium_mg": 223.0, "sodium_mg": 6.0, "iron_mg": 1.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.4, "magnesium_mg": 53.0, "calcium_mg": 21.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Rice Cakes (Plain, Lightly Salted)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cake", "equivalent_g": 9.0}
        ],
        "calories": 387, "protein_g": 8.2, "carbs_g": 81.5, "fats_g": 2.8, "saturated_fats_g": 0.6, 
        "fiber_g": 3.3, "sugar_g": 0.9, "potassium_mg": 326.0, "sodium_mg": 260.0, "iron_mg": 1.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 2.2, "magnesium_mg": 118.0, "calcium_mg": 11.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Rice Noodles (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 109, "protein_g": 0.9, "carbs_g": 24.0, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 0.4, "sugar_g": 0.0, "potassium_mg": 4.0, "sodium_mg": 5.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 3.0, "calcium_mg": 4.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Rice Noodles (Dry)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 364, "protein_g": 3.4, "carbs_g": 82.0, "fats_g": 0.6, "saturated_fats_g": 0.1, 
        "fiber_g": 1.6, "sugar_g": 0.0, "potassium_mg": 25.0, "sodium_mg": 18.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 11.0, "calcium_mg": 15.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Spaghetti (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 158, "protein_g": 5.8, "carbs_g": 31.0, "fats_g": 0.9, "saturated_fats_g": 0.2, 
        "fiber_g": 1.8, "sugar_g": 0.4, "potassium_mg": 44.0, "sodium_mg": 1.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 18.0, "calcium_mg": 7.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Spaghetti (Dry, Enriched)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 371, "protein_g": 13.0, "carbs_g": 74.0, "fats_g": 1.5, "saturated_fats_g": 0.3, 
        "fiber_g": 3.2, "sugar_g": 2.7, "potassium_mg": 223.0, "sodium_mg": 6.0, "iron_mg": 1.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.4, "magnesium_mg": 53.0, "calcium_mg": 21.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Wheat Noodles (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 130, "protein_g": 4.0, "carbs_g": 27.0, "fats_g": 0.5, "saturated_fats_g": 0.1, 
        "fiber_g": 1.2, "sugar_g": 0.8, "potassium_mg": 50.0, "sodium_mg": 150.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 15.0, "calcium_mg": 8.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Wheat Noodles (Dry, Soba/Udon type)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 336, "protein_g": 12.0, "carbs_g": 72.0, "fats_g": 1.2, "saturated_fats_g": 0.2, 
        "fiber_g": 3.0, "sugar_g": 2.0, "potassium_mg": 180.0, "sodium_mg": 500.0, "iron_mg": 1.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.0, "magnesium_mg": 40.0, "calcium_mg": 20.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Rice (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 158.0}],
        "calories": 130, "protein_g": 2.7, "carbs_g": 28.2, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 0.4, "sugar_g": 0.1, "potassium_mg": 35.0, "sodium_mg": 1.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 12.0, "calcium_mg": 10.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Rice (Dry, Enriched Long Grain)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 185.0}],
        "calories": 365, "protein_g": 7.1, "carbs_g": 80.0, "fats_g": 0.7, "saturated_fats_g": 0.2, 
        "fiber_g": 1.3, "sugar_g": 0.1, "potassium_mg": 115.0, "sodium_mg": 5.0, "iron_mg": 4.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.1, "magnesium_mg": 25.0, "calcium_mg": 28.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # LEGUMES & PLANT PROTEINS
    # ---------------------------------------------------------
    {
        "name": "Black Beans (Cooked / Boiled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 172.0}],
        "calories": 132, "protein_g": 8.9, "carbs_g": 23.7, "fats_g": 0.5, "saturated_fats_g": 0.1, 
        "fiber_g": 8.7, "sugar_g": 0.3, "potassium_mg": 355.0, "sodium_mg": 1.0, "iron_mg": 2.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.1, "magnesium_mg": 70.0, "calcium_mg": 27.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Chickpeas / Garbanzo Beans (Cooked / Boiled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 164.0}],
        "calories": 164, "protein_g": 8.9, "carbs_g": 27.4, "fats_g": 2.6, "saturated_fats_g": 0.3, 
        "fiber_g": 7.6, "sugar_g": 4.8, "potassium_mg": 291.0, "sodium_mg": 7.0, "iron_mg": 2.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.5, "magnesium_mg": 48.0, "calcium_mg": 49.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Edamame (Cooked/Steamed)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 155.0}],
        "calories": 121, "protein_g": 11.9, "carbs_g": 8.9, "fats_g": 5.2, "saturated_fats_g": 0.6, 
        "fiber_g": 5.2, "sugar_g": 2.2, "potassium_mg": 436.0, "sodium_mg": 6.0, "iron_mg": 2.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.4, "magnesium_mg": 64.0, "calcium_mg": 63.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Green Peas (Cooked / Boiled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 160.0}],
        "calories": 84, "protein_g": 5.4, "carbs_g": 15.6, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 5.5, "sugar_g": 5.9, "potassium_mg": 271.0, "sodium_mg": 3.0, "iron_mg": 1.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.2, "magnesium_mg": 39.0, "calcium_mg": 27.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Lentils (Cooked / Boiled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 198.0}],
        "calories": 116, "protein_g": 9.0, "carbs_g": 20.1, "fats_g": 0.4, "saturated_fats_g": 0.1, 
        "fiber_g": 7.9, "sugar_g": 1.8, "potassium_mg": 369.0, "sodium_mg": 2.0, "iron_mg": 3.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.3, "magnesium_mg": 36.0, "calcium_mg": 19.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Soybeans (Cooked / Boiled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 172.0}],
        "calories": 172, "protein_g": 16.6, "carbs_g": 9.9, "fats_g": 9.0, "saturated_fats_g": 1.3, 
        "fiber_g": 6.0, "sugar_g": 3.0, "potassium_mg": 515.0, "sodium_mg": 1.0, "iron_mg": 5.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.2, "magnesium_mg": 86.0, "calcium_mg": 102.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Tofu (Firm, Calcium Set)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 144, "protein_g": 15.8, "carbs_g": 2.8, "fats_g": 8.7, "saturated_fats_g": 1.3, 
        "fiber_g": 2.3, "sugar_g": 0.0, "potassium_mg": 121.0, "sodium_mg": 7.0, "iron_mg": 5.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.6, "magnesium_mg": 58.0, "calcium_mg": 683.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # NUTS & SEEDS
    # ---------------------------------------------------------
    {
        "name": "Almonds (Raw, Unsalted)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 143.0}, {"description": "1 nut", "equivalent_g": 1.2}],
        "calories": 579, "protein_g": 21.1, "carbs_g": 21.6, "fats_g": 49.9, "saturated_fats_g": 3.8, 
        "fiber_g": 12.5, "sugar_g": 4.4, "potassium_mg": 733.0, "sodium_mg": 1.0, "iron_mg": 3.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 3.1, "magnesium_mg": 268.0, "calcium_mg": 269.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Brazil Nuts (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 133.0}, {"description": "1 nut", "equivalent_g": 5.0}],
        "calories": 659, "protein_g": 14.3, "carbs_g": 11.7, "fats_g": 67.1, "saturated_fats_g": 16.1, 
        "fiber_g": 7.5, "sugar_g": 2.3, "potassium_mg": 659.0, "sodium_mg": 3.0, "iron_mg": 2.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 4.1, "magnesium_mg": 376.0, "calcium_mg": 160.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cashews (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 130.0}, {"description": "1 nut", "equivalent_g": 1.5}],
        "calories": 553, "protein_g": 18.2, "carbs_g": 30.2, "fats_g": 43.8, "saturated_fats_g": 7.8, 
        "fiber_g": 3.3, "sugar_g": 5.9, "potassium_mg": 660.0, "sodium_mg": 12.0, "iron_mg": 6.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 5.8, "magnesium_mg": 292.0, "calcium_mg": 37.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Chia Seeds",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 160.0}],
        "calories": 486, "protein_g": 16.5, "carbs_g": 42.1, "fats_g": 30.7, "saturated_fats_g": 3.3, 
        "fiber_g": 34.4, "sugar_g": 0.0, "potassium_mg": 407.0, "sodium_mg": 16.0, "iron_mg": 7.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 4.6, "magnesium_mg": 335.0, "calcium_mg": 631.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Flaxseeds (Whole)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 168.0}],
        "calories": 534, "protein_g": 18.3, "carbs_g": 28.9, "fats_g": 42.2, "saturated_fats_g": 3.7, 
        "fiber_g": 27.3, "sugar_g": 1.5, "potassium_mg": 813.0, "sodium_mg": 30.0, "iron_mg": 5.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 4.3, "magnesium_mg": 392.0, "calcium_mg": 255.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Hazelnuts (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 135.0}, {"description": "1 nut", "equivalent_g": 1.3}],
        "calories": 628, "protein_g": 15.0, "carbs_g": 16.7, "fats_g": 60.7, "saturated_fats_g": 4.5, 
        "fiber_g": 9.7, "sugar_g": 4.3, "potassium_mg": 680.0, "sodium_mg": 0.0, "iron_mg": 4.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 2.4, "magnesium_mg": 163.0, "calcium_mg": 114.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Hemp Seeds (Hulled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 150.0}],
        "calories": 553, "protein_g": 31.6, "carbs_g": 8.7, "fats_g": 48.8, "saturated_fats_g": 4.6, 
        "fiber_g": 4.0, "sugar_g": 1.5, "potassium_mg": 1200.0, "sodium_mg": 5.0, "iron_mg": 7.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 9.9, "magnesium_mg": 700.0, "calcium_mg": 70.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Macadamia Nuts (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 134.0}, {"description": "1 nut", "equivalent_g": 2.5}],
        "calories": 718, "protein_g": 7.9, "carbs_g": 13.8, "fats_g": 75.8, "saturated_fats_g": 12.0, 
        "fiber_g": 8.6, "sugar_g": 4.6, "potassium_mg": 368.0, "sodium_mg": 5.0, "iron_mg": 3.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.3, "magnesium_mg": 130.0, "calcium_mg": 85.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Peanuts (Raw, Unsalted)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 146.0}, {"description": "1 nut", "equivalent_g": 1.0}],
        "calories": 567, "protein_g": 25.8, "carbs_g": 16.1, "fats_g": 49.2, "saturated_fats_g": 6.3, 
        "fiber_g": 8.5, "sugar_g": 4.7, "potassium_mg": 705.0, "sodium_mg": 18.0, "iron_mg": 4.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 3.3, "magnesium_mg": 168.0, "calcium_mg": 92.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pecans (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 109.0}, {"description": "1 nut (half)", "equivalent_g": 1.5}],
        "calories": 691, "protein_g": 9.2, "carbs_g": 13.9, "fats_g": 72.0, "saturated_fats_g": 6.2, 
        "fiber_g": 9.6, "sugar_g": 4.0, "potassium_mg": 410.0, "sodium_mg": 0.0, "iron_mg": 2.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 4.5, "magnesium_mg": 121.0, "calcium_mg": 70.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pine Nuts (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 135.0}, {"description": "1 nut", "equivalent_g": 0.2}],
        "calories": 673, "protein_g": 13.7, "carbs_g": 13.1, "fats_g": 68.4, "saturated_fats_g": 4.9, 
        "fiber_g": 3.7, "sugar_g": 3.6, "potassium_mg": 597.0, "sodium_mg": 2.0, "iron_mg": 5.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 6.4, "magnesium_mg": 251.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pistachios (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 123.0}, {"description": "1 nut", "equivalent_g": 0.7}],
        "calories": 562, "protein_g": 20.2, "carbs_g": 27.2, "fats_g": 45.3, "saturated_fats_g": 5.9, 
        "fiber_g": 10.6, "sugar_g": 7.7, "potassium_mg": 1025.0, "sodium_mg": 1.0, "iron_mg": 3.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 2.2, "magnesium_mg": 121.0, "calcium_mg": 105.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pumpkin Seeds (Roasted, Unsalted)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 118.0}],
        "calories": 574, "protein_g": 29.8, "carbs_g": 14.7, "fats_g": 49.1, "saturated_fats_g": 8.5, 
        "fiber_g": 6.5, "sugar_g": 1.3, "potassium_mg": 788.0, "sodium_mg": 12.0, "iron_mg": 8.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 7.6, "magnesium_mg": 550.0, "calcium_mg": 43.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sesame Seeds (Whole, Roasted)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 144.0}],
        "calories": 573, "protein_g": 17.7, "carbs_g": 23.4, "fats_g": 49.7, "saturated_fats_g": 7.0, 
        "fiber_g": 11.8, "sugar_g": 0.3, "potassium_mg": 468.0, "sodium_mg": 11.0, "iron_mg": 14.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 7.8, "magnesium_mg": 351.0, "calcium_mg": 975.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sunflower Seeds (Hulled, Dry Roasted)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 128.0}],
        "calories": 584, "protein_g": 20.8, "carbs_g": 20.0, "fats_g": 51.5, "saturated_fats_g": 4.5, 
        "fiber_g": 8.6, "sugar_g": 2.6, "potassium_mg": 645.0, "sodium_mg": 9.0, "iron_mg": 5.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 5.1, "magnesium_mg": 325.0, "calcium_mg": 78.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Walnuts (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 117.0}, {"description": "1 nut (half)", "equivalent_g": 2.0}],
        "calories": 654, "protein_g": 15.2, "carbs_g": 13.7, "fats_g": 65.2, "saturated_fats_g": 6.1, 
        "fiber_g": 6.7, "sugar_g": 2.6, "potassium_mg": 441.0, "sodium_mg": 2.0, "iron_mg": 2.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 3.1, "magnesium_mg": 158.0, "calcium_mg": 98.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # PANTRY & SWEETENERS
    # ---------------------------------------------------------
    {
        "name": "Brown Sugar",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 220.0},
            {"description": "1 tablespoon", "equivalent_g": 13.8},
            {"description": "1 teaspoon", "equivalent_g": 4.6}
        ],
        "calories": 380, "protein_g": 0.1, "carbs_g": 98.1, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 97.0, "potassium_mg": 133.0, "sodium_mg": 28.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 29.0, "calcium_mg": 83.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cinnamon Powder",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 125.0}, {"description": "1 tablespoon", "equivalent_g": 7.8}, {"description": "1 teaspoon", "equivalent_g": 2.6}],
        "calories": 247, "protein_g": 4.0, "carbs_g": 80.6, "fats_g": 1.2, "saturated_fats_g": 0.3, 
        "fiber_g": 53.1, "sugar_g": 2.2, "potassium_mg": 431.0, "sodium_mg": 10.0, "iron_mg": 8.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.8, "magnesium_mg": 60.0, "calcium_mg": 1002.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cocoa Powder (Unsweetened)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 86.0}, {"description": "1 tablespoon", "equivalent_g": 5.4}, {"description": "1 teaspoon", "equivalent_g": 1.8}],
        "calories": 228, "protein_g": 19.6, "carbs_g": 57.9, "fats_g": 13.7, "saturated_fats_g": 8.1, 
        "fiber_g": 37.0, "sugar_g": 1.8, "potassium_mg": 1524.0, "sodium_mg": 21.0, "iron_mg": 13.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 6.8, "magnesium_mg": 499.0, "calcium_mg": 128.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Corn Starch",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 128.0}, {"description": "1 tablespoon", "equivalent_g": 8.0}, {"description": "1 teaspoon", "equivalent_g": 2.7}],
        "calories": 381, "protein_g": 0.3, "carbs_g": 91.3, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.9, "sugar_g": 0.0, "potassium_mg": 3.0, "sodium_mg": 9.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 3.0, "calcium_mg": 2.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Honey",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 339.0}, {"description": "1 tablespoon", "equivalent_g": 21.0}, {"description": "1 teaspoon", "equivalent_g": 7.0}],
        "calories": 304, "protein_g": 0.3, "carbs_g": 82.4, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.2, "sugar_g": 82.1, "potassium_mg": 52.0, "sodium_mg": 4.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 2.0, "calcium_mg": 6.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Maple Syrup (100% Pure, Full Sugar)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 315.0},
            {"description": "1 tablespoon", "equivalent_g": 20.0},
            {"description": "1 teaspoon", "equivalent_g": 6.7}
        ],
        "calories": 260, "protein_g": 0.0, "carbs_g": 67.0, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 60.4, "potassium_mg": 212.0, "sodium_mg": 12.0, "iron_mg": 0.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.5, "magnesium_mg": 21.0, "calcium_mg": 102.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Maple Syrup (Zero Sugar / Sugar Free)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 240.0},
            {"description": "1 tablespoon", "equivalent_g": 15.0},
            {"description": "1 teaspoon", "equivalent_g": 5.0}
        ],
        "calories": 20, "protein_g": 0.0, "carbs_g": 8.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 10.0, "sodium_mg": 180.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 2.0, "calcium_mg": 5.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Sugar (Granulated)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 200.0}, {"description": "1 tablespoon", "equivalent_g": 12.5}, {"description": "1 teaspoon", "equivalent_g": 4.2}],
        "calories": 387, "protein_g": 0.0, "carbs_g": 100.0, "fats_g": 0.0, "saturated_fats_g": 0.0, 
        "fiber_g": 0.0, "sugar_g": 100.0, "potassium_mg": 2.0, "sodium_mg": 1.0, "iron_mg": 0.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.0, "magnesium_mg": 0.0, "calcium_mg": 1.0, "cholesterol_mg": 0.0
    },

    # ---------------------------------------------------------
    # POULTRY
    # ---------------------------------------------------------
    {
        "name": "Chicken Breast (Cooked, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 165, "protein_g": 31.0, "carbs_g": 0.0, "fats_g": 3.6, "saturated_fats_g": 1.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 256.0, "sodium_mg": 74.0, "iron_mg": 1.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.0, "magnesium_mg": 29.0, "calcium_mg": 15.0, "cholesterol_mg": 85.0
    },
    {
        "name": "Chicken Breast (Raw, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 120, "protein_g": 22.5, "carbs_g": 0.0, "fats_g": 2.6, "saturated_fats_g": 0.6, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 255.0, "sodium_mg": 45.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.8, "magnesium_mg": 28.0, "calcium_mg": 11.0, "cholesterol_mg": 73.0
    },
    {
        "name": "Chicken Drumsticks (Cooked, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 stick", "equivalent_g": 28.0}],
        "calories": 175, "protein_g": 28.0, "carbs_g": 0.0, "fats_g": 5.7, "saturated_fats_g": 1.5, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 249.0, "sodium_mg": 99.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 2.6, "magnesium_mg": 25.0, "calcium_mg": 14.0, "cholesterol_mg": 100.0
    },
    {
        "name": "Chicken Drumsticks (Cooked, with Skin & Bone - Edible Yield)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 stick", "equivalent_g": 35.0}],
        "calories": 216, "protein_g": 26.0, "carbs_g": 0.0, "fats_g": 11.0, "saturated_fats_g": 3.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 239.0, "sodium_mg": 95.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 0.2, "zinc_mg": 2.2, "magnesium_mg": 23.0, "calcium_mg": 13.0, "cholesterol_mg": 105.0
    },
    {
        "name": "Chicken Drumsticks (Raw, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 stick", "equivalent_g": 38.0}],
        "calories": 120, "protein_g": 19.0, "carbs_g": 0.0, "fats_g": 4.0, "saturated_fats_g": 1.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 235.0, "sodium_mg": 84.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.8, "magnesium_mg": 22.0, "calcium_mg": 11.0, "cholesterol_mg": 80.0
    },
    {
        "name": "Chicken Drumsticks (Raw, with Skin & Bone - Edible Yield)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 stick", "equivalent_g": 44.0}],
        "calories": 161, "protein_g": 19.0, "carbs_g": 0.0, "fats_g": 8.9, "saturated_fats_g": 2.4, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 222.0, "sodium_mg": 81.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 1.6, "magnesium_mg": 21.0, "calcium_mg": 11.0, "cholesterol_mg": 82.0
    },
    {
        "name": "Chicken Thighs (Cooked, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 thigh", "equivalent_g": 70.0}],
        "calories": 209, "protein_g": 26.0, "carbs_g": 0.0, "fats_g": 10.9, "saturated_fats_g": 3.0, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 255.0, "sodium_mg": 95.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 2.3, "magnesium_mg": 24.0, "calcium_mg": 13.0, "cholesterol_mg": 105.0
    },
    {
        "name": "Chicken Thighs (Cooked, with Skin & Bone - Edible Yield)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 thigh", "equivalent_g": 62.0}],
        "calories": 247, "protein_g": 24.0, "carbs_g": 0.0, "fats_g": 16.0, "saturated_fats_g": 4.5, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 240.0, "sodium_mg": 90.0, "iron_mg": 1.3, 
        "vitamin_d_mcg": 0.3, "zinc_mg": 2.1, "magnesium_mg": 22.0, "calcium_mg": 14.0, "cholesterol_mg": 109.0
    },
    {
        "name": "Chicken Thighs (Raw, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 thigh", "equivalent_g": 90.0}],
        "calories": 121, "protein_g": 19.0, "carbs_g": 0.0, "fats_g": 4.3, "saturated_fats_g": 1.1, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 236.0, "sodium_mg": 86.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.7, "magnesium_mg": 21.0, "calcium_mg": 11.0, "cholesterol_mg": 83.0
    },
    {
        "name": "Chicken Thighs (Raw, with Skin & Bone - Edible Yield)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 thigh", "equivalent_g": 100.0}],
        "calories": 211, "protein_g": 16.0, "carbs_g": 0.0, "fats_g": 15.0, "saturated_fats_g": 4.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 200.0, "sodium_mg": 80.0, "iron_mg": 0.9, 
        "vitamin_d_mcg": 0.2, "zinc_mg": 1.5, "magnesium_mg": 20.0, "calcium_mg": 10.0, "cholesterol_mg": 85.0
    },
    {
        "name": "Chicken Wings (Cooked, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 wing", "equivalent_g": 10.0}],
        "calories": 203, "protein_g": 30.0, "carbs_g": 0.0, "fats_g": 8.1, "saturated_fats_g": 2.2, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 260.0, "sodium_mg": 90.0, "iron_mg": 1.1, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 1.6, "magnesium_mg": 25.0, "calcium_mg": 14.0, "cholesterol_mg": 95.0
    },
    {
        "name": "Chicken Wings (Cooked, with Skin & Bone - Edible Yield)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 wing", "equivalent_g": 16.0}],
        "calories": 288, "protein_g": 27.0, "carbs_g": 0.0, "fats_g": 19.0, "saturated_fats_g": 5.4, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 202.0, "sodium_mg": 82.0, "iron_mg": 1.2, 
        "vitamin_d_mcg": 0.3, "zinc_mg": 1.7, "magnesium_mg": 19.0, "calcium_mg": 15.0, "cholesterol_mg": 100.0
    },
    {
        "name": "Chicken Wings (Raw, Boneless, Skinless)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 wing", "equivalent_g": 15.0}],
        "calories": 110, "protein_g": 20.0, "carbs_g": 0.0, "fats_g": 2.5, "saturated_fats_g": 0.6, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 240.0, "sodium_mg": 80.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.1, "magnesium_mg": 23.0, "calcium_mg": 12.0, "cholesterol_mg": 70.0
    },
    {
        "name": "Chicken Wings (Raw, with Skin & Bone - Edible Yield)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 wing", "equivalent_g": 21.0}],
        "calories": 211, "protein_g": 17.0, "carbs_g": 0.0, "fats_g": 15.0, "saturated_fats_g": 4.3, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 166.0, "sodium_mg": 73.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.2, "zinc_mg": 1.2, "magnesium_mg": 16.0, "calcium_mg": 11.0, "cholesterol_mg": 77.0
    },
    {
        "name": "Turkey Breast (Cooked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 147, "protein_g": 30.1, "carbs_g": 0.0, "fats_g": 2.0, "saturated_fats_g": 0.6, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 293.0, "sodium_mg": 129.0, "iron_mg": 1.1, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 1.7, "magnesium_mg": 29.0, "calcium_mg": 14.0, "cholesterol_mg": 75.0
    },
    {
        "name": "Turkey Breast (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}],
        "calories": 114, "protein_g": 23.7, "carbs_g": 0.0, "fats_g": 1.5, "saturated_fats_g": 0.4, 
        "fiber_g": 0.0, "sugar_g": 0.0, "potassium_mg": 249.0, "sodium_mg": 115.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.1, "zinc_mg": 1.3, "magnesium_mg": 26.0, "calcium_mg": 12.0, "cholesterol_mg": 62.0
    },

    # ---------------------------------------------------------
    # SUPPLEMENTS
    # ---------------------------------------------------------
    {
        "name": "Generic Whey Protein Powder",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 scoop", "equivalent_g": 30.0}
        ],
        "calories": 375, "protein_g": 80.0, "carbs_g": 6.0, "fats_g": 3.5, "saturated_fats_g": 1.5, 
        "fiber_g": 0.0, "sugar_g": 2.5, "potassium_mg": 500.0, "sodium_mg": 250.0, "iron_mg": 1.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 50.0, "calcium_mg": 400.0, "cholesterol_mg": 100.0
    },

    # ---------------------------------------------------------
    # VEGETABLES
    # ---------------------------------------------------------
    {
        "name": "Arugula / Rucola (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 20.0}],
        "calories": 25, "protein_g": 2.6, "carbs_g": 3.7, "fats_g": 0.7, "saturated_fats_g": 0.1, 
        "fiber_g": 1.6, "sugar_g": 2.1, "potassium_mg": 369.0, "sodium_mg": 27.0, "iron_mg": 1.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 47.0, "calcium_mg": 160.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Asparagus (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 piece", "equivalent_g": 16.0}],
        "calories": 20, "protein_g": 2.2, "carbs_g": 3.9, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 2.1, "sugar_g": 1.9, "potassium_mg": 202.0, "sodium_mg": 2.0, "iron_mg": 2.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 14.0, "calcium_mg": 24.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Baby Spinach (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 30.0}],
        "calories": 23, "protein_g": 2.9, "carbs_g": 3.6, "fats_g": 0.4, "saturated_fats_g": 0.1, 
        "fiber_g": 2.2, "sugar_g": 0.4, "potassium_mg": 558.0, "sodium_mg": 79.0, "iron_mg": 2.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 79.0, "calcium_mg": 99.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Beetroot / Beet (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 136.0},
            {"description": "1 piece", "equivalent_g": 82.0}
        ],
        "calories": 43, "protein_g": 1.6, "carbs_g": 9.6, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 2.8, "sugar_g": 6.8, "potassium_mg": 325.0, "sodium_mg": 78.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 23.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Bell Peppers (Raw, Red/Green)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 149.0}, {"description": "1 pepper", "equivalent_g": 119.0}],
        "calories": 20, "protein_g": 0.9, "carbs_g": 4.6, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.7, "sugar_g": 2.4, "potassium_mg": 175.0, "sodium_mg": 3.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 10.0, "calcium_mg": 10.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Broccoli (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 91.0}],
        "calories": 34, "protein_g": 2.8, "carbs_g": 6.6, "fats_g": 0.4, "saturated_fats_g": 0.1, 
        "fiber_g": 2.6, "sugar_g": 1.7, "potassium_mg": 316.0, "sodium_mg": 33.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 21.0, "calcium_mg": 47.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Brussels Sprouts (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 88.0}],
        "calories": 43, "protein_g": 3.4, "carbs_g": 9.0, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 3.8, "sugar_g": 2.2, "potassium_mg": 389.0, "sodium_mg": 25.0, "iron_mg": 1.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.4, "magnesium_mg": 23.0, "calcium_mg": 42.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cabbage (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 89.0}],
        "calories": 25, "protein_g": 1.3, "carbs_g": 5.8, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 2.5, "sugar_g": 3.2, "potassium_mg": 170.0, "sodium_mg": 18.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 12.0, "calcium_mg": 40.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Carrots (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 128.0}, {"description": "1 carrot", "equivalent_g": 61.0}],
        "calories": 41, "protein_g": 0.9, "carbs_g": 9.6, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 2.8, "sugar_g": 4.7, "potassium_mg": 320.0, "sodium_mg": 69.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 12.0, "calcium_mg": 33.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cauliflower (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 107.0}],
        "calories": 25, "protein_g": 1.9, "carbs_g": 5.0, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 2.0, "sugar_g": 1.9, "potassium_mg": 299.0, "sodium_mg": 30.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 15.0, "calcium_mg": 22.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Celery (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 101.0}],
        "calories": 14, "protein_g": 0.7, "carbs_g": 3.0, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.6, "sugar_g": 1.3, "potassium_mg": 260.0, "sodium_mg": 80.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 11.0, "calcium_mg": 40.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cherry Tomatoes (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cherry", "equivalent_g": 17.0}],
        "calories": 18, "protein_g": 0.9, "carbs_g": 3.9, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.2, "sugar_g": 2.6, "potassium_mg": 237.0, "sodium_mg": 5.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 11.0, "calcium_mg": 10.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Chili Pepper (Raw, Red or Green)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 150.0},
            {"description": "1 pepper", "equivalent_g": 45.0}
        ],
        "calories": 40, "protein_g": 2.0, "carbs_g": 8.8, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.5, "sugar_g": 5.3, "potassium_mg": 322.0, "sodium_mg": 7.0, "iron_mg": 1.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 25.0, "calcium_mg": 14.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Cucumber (Raw, with peel)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 104.0}, {"description": "1 cucumber", "equivalent_g": 301.0}],
        "calories": 15, "protein_g": 0.7, "carbs_g": 3.6, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 0.5, "sugar_g": 1.7, "potassium_mg": 147.0, "sodium_mg": 2.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 13.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Eggplant (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 82.0}, {"description": "1 eggplant", "equivalent_g": 458.0}],
        "calories": 25, "protein_g": 1.0, "carbs_g": 5.9, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 3.0, "sugar_g": 3.5, "potassium_mg": 229.0, "sodium_mg": 2.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 14.0, "calcium_mg": 9.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Garlic (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 136.0}, {"description": "1 garlic", "equivalent_g": 58.0}, {"description": "1 piece (clove)", "equivalent_g": 3.0}],
        "calories": 149, "protein_g": 6.4, "carbs_g": 33.1, "fats_g": 0.5, "saturated_fats_g": 0.1, 
        "fiber_g": 2.1, "sugar_g": 1.0, "potassium_mg": 401.0, "sodium_mg": 17.0, "iron_mg": 1.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 1.2, "magnesium_mg": 25.0, "calcium_mg": 181.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Ginger Root (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 96.0}],
        "calories": 80, "protein_g": 1.8, "carbs_g": 17.8, "fats_g": 0.8, "saturated_fats_g": 0.2, 
        "fiber_g": 2.0, "sugar_g": 1.7, "potassium_mg": 415.0, "sodium_mg": 13.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 43.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Green Beans (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 110.0}],
        "calories": 31, "protein_g": 1.8, "carbs_g": 7.0, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 2.7, "sugar_g": 3.3, "potassium_mg": 211.0, "sodium_mg": 6.0, "iron_mg": 1.0, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 25.0, "calcium_mg": 37.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Iceberg Lettuce / Cabbage (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 72.0}],
        "calories": 14, "protein_g": 0.9, "carbs_g": 3.0, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.2, "sugar_g": 2.0, "potassium_mg": 141.0, "sodium_mg": 10.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 7.0, "calcium_mg": 18.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Lettuce (Romaine/Green Leaf, Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 36.0}],
        "calories": 15, "protein_g": 1.4, "carbs_g": 2.8, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.3, "sugar_g": 0.8, "potassium_mg": 194.0, "sodium_mg": 28.0, "iron_mg": 0.9, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 13.0, "calcium_mg": 36.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Mushrooms (White Button, Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 70.0},
            {"description": "1 piece", "equivalent_g": 10.0}
        ],
        "calories": 22, "protein_g": 3.1, "carbs_g": 3.3, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 1.0, "sugar_g": 2.0, "potassium_mg": 318.0, "sodium_mg": 5.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.2, "zinc_mg": 0.5, "magnesium_mg": 9.0, "calcium_mg": 3.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Onion (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 160.0}, {"description": "1 onion", "equivalent_g": 110.0}],
        "calories": 40, "protein_g": 1.1, "carbs_g": 9.3, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.7, "sugar_g": 4.2, "potassium_mg": 146.0, "sodium_mg": 4.0, "iron_mg": 0.2, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 10.0, "calcium_mg": 23.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pickles (Cucumber, Dill/Sour)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 pickle", "equivalent_g": 35.0}],
        "calories": 11, "protein_g": 0.3, "carbs_g": 2.3, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.2, "sugar_g": 1.1, "potassium_mg": 112.0, "sodium_mg": 1208.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.1, "magnesium_mg": 4.0, "calcium_mg": 0.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Pumpkin (Cooked / Boiled)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 245.0},
            {"description": "1 slice", "equivalent_g": 116.0}
        ],
        "calories": 20, "protein_g": 0.7, "carbs_g": 4.9, "fats_g": 0.1, "saturated_fats_g": 0.1, 
        "fiber_g": 1.1, "sugar_g": 2.1, "potassium_mg": 230.0, "sodium_mg": 1.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 9.0, "calcium_mg": 15.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Radish (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [
            {"description": "3 oz", "equivalent_g": 85.0},
            {"description": "1 cup", "equivalent_g": 116.0},
            {"description": "1 piece", "equivalent_g": 4.5}
        ],
        "calories": 16, "protein_g": 0.7, "carbs_g": 3.4, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.6, "sugar_g": 1.9, "potassium_mg": 233.0, "sodium_mg": 39.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 10.0, "calcium_mg": 25.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sweet Potatoes (Baked)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 extra large", "equivalent_g": 300.0}, {"description": "1 large", "equivalent_g": 180.0}, {"description": "1 medium", "equivalent_g": 114.0}, {"description": "1 small", "equivalent_g": 60.0}],
        "calories": 90, "protein_g": 2.0, "carbs_g": 20.7, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 3.3, "sugar_g": 6.5, "potassium_mg": 475.0, "sodium_mg": 36.0, "iron_mg": 0.7, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 27.0, "calcium_mg": 38.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sweet Potatoes (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 extra large", "equivalent_g": 300.0}, {"description": "1 large", "equivalent_g": 250.0}, {"description": "1 medium", "equivalent_g": 130.0}, {"description": "1 small", "equivalent_g": 60.0}],
        "calories": 86, "protein_g": 1.6, "carbs_g": 20.1, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 3.0, "sugar_g": 4.2, "potassium_mg": 337.0, "sodium_mg": 55.0, "iron_mg": 0.6, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 25.0, "calcium_mg": 30.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Sweetcorn (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 154.0}, {"description": "1 cob", "equivalent_g": 103.0}],
        "calories": 86, "protein_g": 3.3, "carbs_g": 18.7, "fats_g": 1.4, "saturated_fats_g": 0.2, 
        "fiber_g": 2.0, "sugar_g": 6.3, "potassium_mg": 270.0, "sodium_mg": 15.0, "iron_mg": 0.5, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.5, "magnesium_mg": 37.0, "calcium_mg": 2.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Tomatoes (Raw, Red)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 182.0}, {"description": "1 medium", "equivalent_g": 123.0}, {"description": "1 small", "equivalent_g": 91.0}, {"description": "1 slice", "equivalent_g": 20.0}],
        "calories": 18, "protein_g": 0.9, "carbs_g": 3.9, "fats_g": 0.2, "saturated_fats_g": 0.0, 
        "fiber_g": 1.2, "sugar_g": 2.6, "potassium_mg": 237.0, "sodium_mg": 5.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.2, "magnesium_mg": 11.0, "calcium_mg": 10.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Potatoes (Baked, with Skin)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 299.0}, {"description": "1 medium", "equivalent_g": 173.0}, {"description": "1 small", "equivalent_g": 138.0}],
        "calories": 93, "protein_g": 2.5, "carbs_g": 21.2, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 2.2, "sugar_g": 1.2, "potassium_mg": 535.0, "sodium_mg": 10.0, "iron_mg": 1.1, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 28.0, "calcium_mg": 15.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Potatoes (Boiled, without Skin)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 299.0}, {"description": "1 medium", "equivalent_g": 167.0}, {"description": "1 small", "equivalent_g": 112.0}],
        "calories": 87, "protein_g": 1.9, "carbs_g": 20.1, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 1.8, "sugar_g": 0.9, "potassium_mg": 328.0, "sodium_mg": 5.0, "iron_mg": 0.3, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 20.0, "calcium_mg": 5.0, "cholesterol_mg": 0.0
    },
    {
        "name": "White Potatoes (Raw, with Skin)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 large", "equivalent_g": 299.0}, {"description": "1 medium", "equivalent_g": 213.0}, {"description": "1 small", "equivalent_g": 170.0}],
        "calories": 77, "protein_g": 2.0, "carbs_g": 17.5, "fats_g": 0.1, "saturated_fats_g": 0.0, 
        "fiber_g": 2.2, "sugar_g": 0.8, "potassium_mg": 421.0, "sodium_mg": 6.0, "iron_mg": 0.8, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 23.0, "calcium_mg": 12.0, "cholesterol_mg": 0.0
    },
    {
        "name": "Zucchini (Raw)",
        "serving_size": 100.0, "serving_unit": "g",
        "custom_servings": [{"description": "3 oz", "equivalent_g": 85.0}, {"description": "1 cup", "equivalent_g": 124.0}, {"description": "1 zucchini", "equivalent_g": 196.0}],
        "calories": 17, "protein_g": 1.2, "carbs_g": 3.1, "fats_g": 0.3, "saturated_fats_g": 0.1, 
        "fiber_g": 1.0, "sugar_g": 2.5, "potassium_mg": 261.0, "sodium_mg": 8.0, "iron_mg": 0.4, 
        "vitamin_d_mcg": 0.0, "zinc_mg": 0.3, "magnesium_mg": 18.0, "calcium_mg": 16.0, "cholesterol_mg": 0.0
    }
]

def seed_global_foods():
    db = SessionLocal()
    try:
        # 1. Safely delete ONLY global foods (where user_id is None)
        print("Deleting old global foods...")
        db.query(CustomFood).filter(CustomFood.user_id.is_(None)).delete(synchronize_session=False)
        db.commit()

        # 2. Insert the new master list
        print(f"Inserting {len(DEFAULT_FOODS)} new global foods...")
        new_records = []
        for food_data in DEFAULT_FOODS:
            new_food = CustomFood(**food_data, user_id=None)
            new_records.append(new_food)
            
        db.add_all(new_records)
        db.commit()
        print("Database successfully seeded!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_global_foods()