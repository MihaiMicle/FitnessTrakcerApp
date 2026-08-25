"""Seeds the global (user_id=None) food database.

The food data itself lives in the `seeds.foods` package, one module per
category. Import `DEFAULT_FOODS` from there if you just need the data.
"""

from core.database import SessionLocal
from models.foods import CustomFood
import models.profile  # noqa: F401  (registers the mapper)

from seeds.foods import DEFAULT_FOODS


def seed_global_foods():
    db = SessionLocal()
    try:
        # Safely delete ONLY global foods (where user_id is None)
        print("Deleting old global foods...")
        db.query(CustomFood).filter(CustomFood.user_id.is_(None)).delete(
            synchronize_session=False
        )
        db.commit()

        # Insert the new master list
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
