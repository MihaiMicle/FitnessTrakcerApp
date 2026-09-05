from typing import List

from fastapi import Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.workouts import Exercise, WorkoutSet
from schemas.workouts import ExerciseCreate, ExerciseResponse

from .common import workouts_router

router = workouts_router()


@router.get("/exercises", response_model=List[ExerciseResponse])
def get_exercises(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retrieve global exercises + the user's custom exercises"""
    return (
        db.query(Exercise)
        .filter(or_(Exercise.user_id == current_user_id, Exercise.user_id.is_(None)))
        .order_by(Exercise.name.asc())
        .all()
    )


@router.post("/exercises", response_model=ExerciseResponse)
def create_exercise(
    payload: ExerciseCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new custom exercise for the user"""
    new_ex = Exercise(**payload.model_dump(), user_id=current_user_id)
    db.add(new_ex)
    db.commit()
    db.refresh(new_ex)
    return new_ex


@router.get("/exercises/{exercise_name}/last-sets")
def get_last_exercise_sets(
    exercise_name: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve the sets from the last time the user performed this exercise."""
    # Find the most recent set for this exercise to get the session_id
    last_set = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.user_id == current_user_id,
            WorkoutSet.exercise_name == exercise_name,
        )
        .order_by(WorkoutSet.created_at.desc())
        .first()
    )

    if not last_set:
        return []

    # Fetch all sets for that specific session and exercise
    return (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.session_id == last_set.session_id,
            WorkoutSet.exercise_name == exercise_name,
        )
        .order_by(WorkoutSet.set_number.asc())
        .all()
    )


@router.get("/exercises/{exercise_name}/history")
def get_exercise_history(
    exercise_name: str,
    limit: int = 50,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve all completed historical sets for a specific exercise to track progression"""
    return (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.user_id == current_user_id,
            WorkoutSet.exercise_name == exercise_name,
            WorkoutSet.completed == True,
        )
        .order_by(WorkoutSet.created_at.desc())
        .limit(limit)
        .all()
    )
