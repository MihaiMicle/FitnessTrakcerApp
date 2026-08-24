from core.database import SessionLocal
from models.workouts import Exercise
import models.profile

DEFAULT_EXERCISES = [
    # --- CHEST ---
    {
        "name": "Barbell Bench Press",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Anterior Delt"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Incline Dumbbell Press",
        "type": "strength",
        "equipment": "Dumbbell",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Triceps", "Anterior Delt"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Cable Crossover",
        "type": "strength",
        "equipment": "Machine",
        "primary_muscle": "Chest",
        "secondary_muscles": ["Anterior Delt"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    # --- SHOULDERS ---
    {
        "name": "Overhead Press (OHP)",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Anterior Delt",
        "secondary_muscles": ["Triceps", "Lateral Delt", "Traps"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Dumbbell Lateral Raise",
        "type": "strength",
        "equipment": "Dumbbell",
        "primary_muscle": "Lateral Delt",
        "secondary_muscles": ["Traps"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Reverse Pec Deck Fly",
        "type": "strength",
        "equipment": "Machine",
        "primary_muscle": "Posterior Delt",
        "secondary_muscles": ["Mid Back", "Traps"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    # --- BACK ---
    {
        "name": "Pull Up",
        "type": "strength",
        "equipment": "None",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Mid Back", "Brachialis"],
        "tracking_fields": ["reps", "rir"],
    },
    {
        "name": "Weighted Pull Up",
        "type": "strength",
        "equipment": "Plate",
        "primary_muscle": "Lats",
        "secondary_muscles": ["Biceps", "Mid Back", "Brachialis"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Barbell Row",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Mid Back",
        "secondary_muscles": ["Lats", "Lower Back", "Biceps", "Forearms"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Barbell Shrug",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Traps",
        "secondary_muscles": ["Forearms", "Neck"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    # --- ARMS ---
    {
        "name": "Barbell Curl",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Biceps",
        "secondary_muscles": ["Brachialis", "Forearms"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Hammer Curl",
        "type": "strength",
        "equipment": "Dumbbell",
        "primary_muscle": "Brachialis",
        "secondary_muscles": ["Biceps", "Forearms"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Tricep Pushdown",
        "type": "strength",
        "equipment": "Machine",
        "primary_muscle": "Triceps",
        "secondary_muscles": [],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Weighted Dips",
        "type": "strength",
        "equipment": "Plate",
        "primary_muscle": "Triceps",
        "secondary_muscles": ["Chest", "Anterior Delt"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    # --- LEGS ---
    {
        "name": "Barbell Squat",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Quads",
        "secondary_muscles": ["Glutes", "Hamstrings", "Lower Back", "Abductor"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Romanian Deadlift (RDL)",
        "type": "strength",
        "equipment": "Barbell",
        "primary_muscle": "Hamstrings",
        "secondary_muscles": ["Glutes", "Lower Back"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Leg Press",
        "type": "strength",
        "equipment": "Machine",
        "primary_muscle": "Quads",
        "secondary_muscles": ["Glutes", "Hamstrings"],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Seated Calf Raise",
        "type": "strength",
        "equipment": "Machine",
        "primary_muscle": "Calves",
        "secondary_muscles": [],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    {
        "name": "Hip Adductor Machine",
        "type": "strength",
        "equipment": "Machine",
        "primary_muscle": "Adductor",
        "secondary_muscles": [],
        "tracking_fields": ["weight", "reps", "rir"],
    },
    # --- CORE & SPECIALTY ---
    {
        "name": "Plank",
        "type": "strength",
        "equipment": "None",
        "primary_muscle": "Abs",
        "secondary_muscles": ["Lower Back"],
        "tracking_fields": ["time"],
    },
    {
        "name": "Weighted Plank",
        "type": "strength",
        "equipment": "Plate",
        "primary_muscle": "Abs",
        "secondary_muscles": ["Lower Back"],
        "tracking_fields": ["weight", "time"],
    },
    {
        "name": "Farmers Walk",
        "type": "strength",
        "equipment": "Dumbbell",
        "primary_muscle": "Forearms",
        "secondary_muscles": ["Traps", "Abs", "Quads"],
        "tracking_fields": ["weight", "distance"],
    },
    # --- CARDIO ---
    {
        "name": "Treadmill Walking",
        "type": "cardio",
        "equipment": "Machine",
        "primary_muscle": "Calves",
        "secondary_muscles": ["Hamstrings"],
        "tracking_fields": ["time", "incline", "speed"],
    },
    {
        "name": "Running",
        "type": "cardio",
        "equipment": "None",
        "primary_muscle": "Quads",
        "secondary_muscles": ["Hamstrings", "Calves"],
        "tracking_fields": ["distance", "time"],
    },
    {
        "name": "Stationary Bike",
        "type": "cardio",
        "equipment": "Machine",
        "primary_muscle": "Quads",
        "secondary_muscles": ["Calves"],
        "tracking_fields": ["time", "distance"],
    },
]


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
