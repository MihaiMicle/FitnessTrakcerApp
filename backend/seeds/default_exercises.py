from core.database import SessionLocal
from models.workouts import Exercise

from seeds.exercises import DEFAULT_EXERCISES


def seed_global_exercises():
    db = SessionLocal()
    try:
        # Safely delete ONLY global exercises (where user_id is None)
        print("Deleting old global exercises...")
        db.query(Exercise).filter(Exercise.user_id.is_(None)).delete(
            synchronize_session=False
        )
        db.commit()

        # Insert the new master list
        print(f"Inserting {len(DEFAULT_EXERCISES)} new global exercises...")
        new_records = []
        for ex_data in DEFAULT_EXERCISES:
            new_ex = Exercise(**ex_data, user_id=None)
            new_records.append(new_ex)

        db.add_all(new_records)
        db.commit()

        print("Exercise database successfully seeded!")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_global_exercises()
