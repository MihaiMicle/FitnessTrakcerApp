from core.database import SessionLocal
from models.foods import CustomFood
import models.profile

# Default foods curated with strict macro/micro profiles
DEFAULT_FOODS = [
    {
        "name": "Chicken Breast (Raw)",
        "brand": "System",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 120,
        "protein_g": 22.5,
        "carbs_g": 0.0,
        "fats_g": 2.6,
        "saturated_fats_g": 0.6,
        "fiber_g": 0.0,
        "sugar_g": 0.0,
        "potassium_mg": 256.0,
        "sodium_mg": 45.0,
    },
    {
        "name": "Jasmine Rice (Dry)",
        "brand": "System",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 360,
        "protein_g": 7.0,
        "carbs_g": 80.0,
        "fats_g": 1.0,
        "saturated_fats_g": 0.2,
        "fiber_g": 1.0,
        "sugar_g": 0.1,
        "potassium_mg": 115.0,
        "sodium_mg": 5.0,
    },
    {
        "name": "Whole Eggs (Raw)",
        "brand": "System",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 143,
        "protein_g": 12.6,
        "carbs_g": 0.7,
        "fats_g": 9.5,
        "saturated_fats_g": 3.1,
        "fiber_g": 0.0,
        "sugar_g": 0.4,
        "potassium_mg": 138.0,
        "sodium_mg": 142.0,
    },
    {
        "name": "Rolled Oats (Dry)",
        "brand": "System",
        "serving_size": 100.0,
        "serving_unit": "g",
        "calories": 379,
        "protein_g": 13.2,
        "carbs_g": 67.7,
        "fats_g": 6.5,
        "saturated_fats_g": 1.1,
        "fiber_g": 10.1,
        "sugar_g": 1.0,
        "potassium_mg": 362.0,
        "sodium_mg": 6.0,
    },
    {
        "name": "Whey Protein Isolate",
        "brand": "System",
        "serving_size": 30.0,
        "serving_unit": "g",
        "calories": 110,
        "protein_g": 25.0,
        "carbs_g": 1.0,
        "fats_g": 0.5,
        "saturated_fats_g": 0.0,
        "fiber_g": 0.0,
        "sugar_g": 0.0,
        "potassium_mg": 150.0,
        "sodium_mg": 50.0,
    }
]

def seed_database():
    db = SessionLocal()
    try:
        print("Injecting global system foods...")

        for food_data in DEFAULT_FOODS:
            # Check if global food already exists
            exists = db.query(CustomFood).filter(
                CustomFood.user_id.is_(None),
                CustomFood.name == food_data["name"]
            ).first()
            
            if not exists:
                # Insert without a user_id
                new_food = CustomFood(**food_data)
                db.add(new_food)
                print(f"  [+] Added Global Food: {food_data['name']}")
            else:
                print(f"  [-] Skipped: {food_data['name']} (Already exists)")
        
        db.commit()
        print("\nSuccess! Global foods are now available for all users.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()