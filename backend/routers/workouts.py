from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import datetime
from uuid import UUID

from core.database import get_db
from core.security import get_current_user
from core.social import VISIBILITY_PRIVATE, normalize_visibility
from core.rest import resolve_rest_seconds
from core.social_queries import assert_not_blocked, visible_content_filter
from models.profile import UserProfile
from models.workouts import WorkoutSession, Exercise, WorkoutTemplate, WorkoutSet
from schemas.workouts import (
    WorkoutSessionCreate,
    WorkoutSessionUpdate,
    WorkoutSessionResponse,
    ExerciseCreate,
    ExerciseResponse,
    WorkoutTemplateCreate,
    WorkoutTemplateResponse,
)

router = APIRouter(prefix="/workouts", tags=["Workouts"])


def resolve_visibility(db: Session, user_id: str, requested, default_field: str) -> str:
    """Use the explicit choice when given, otherwise the owner's default"""
    if requested:
        return normalize_visibility(requested)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    fallback = getattr(profile, default_field, None) if profile else None
    return normalize_visibility(fallback, VISIBILITY_PRIVATE)


def sync_workout_sets(db: Session, session: WorkoutSession):
    """Synchronize the JSONB exercises array into the normalized WorkoutSet table"""
    # Remove existing normalized sets for this session to prevent duplicates
    db.query(WorkoutSet).filter(WorkoutSet.session_id == session.id).delete()

    if not session.exercises:
        return

    new_sets = []
    for ex in session.exercises:
        ex_name = ex.get("name", "Unknown Exercise")
        sets = ex.get("sets", [])

        for s in sets:
            new_sets.append(
                WorkoutSet(
                    session_id=session.id,
                    user_id=session.user_id,
                    exercise_name=ex_name,
                    set_number=s.get("set", 1),
                    set_type=s.get("set_type", "working"),
                    completed=s.get("completed", False),
                    rest_seconds=resolve_rest_seconds(ex, s),
                    weight_kg=s.get("weight_kg"),
                    reps=s.get("reps"),
                    rir=s.get("rir"),
                    duration_minutes=s.get("duration_minutes"),
                    distance_km=s.get("distance_km"),
                    incline=s.get("incline"),
                    speed=s.get("speed"),
                    difficulty=s.get("difficulty"),
                )
            )

    if new_sets:
        db.bulk_save_objects(new_sets)


@router.get("/", response_model=List[WorkoutSessionResponse])
def get_all_sessions(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retrieve all workout sessions for the user, ordered by newest first"""
    return (
        db.query(WorkoutSession)
        .filter(WorkoutSession.user_id == current_user_id)
        .order_by(WorkoutSession.start_time.desc())
        .all()
    )


@router.get("/active", response_model=WorkoutSessionResponse)
def get_active_session(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Check if the user has a workout currently in progress"""
    session = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == current_user_id,
            WorkoutSession.status == "in_progress",
        )
        .order_by(WorkoutSession.start_time.desc())
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="No active session found")
    return session


@router.post("/", response_model=WorkoutSessionResponse)
def create_session(
    payload: WorkoutSessionCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Start a new live workout session or log a completed past one"""
    data = payload.model_dump(exclude_unset=True)
    data["visibility"] = resolve_visibility(
        db, current_user_id, data.get("visibility"), "default_workout_visibility"
    )
    new_session = WorkoutSession(**data, user_id=current_user_id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # Sync normalized sets
    sync_workout_sets(db, new_session)
    db.commit()

    return new_session


@router.put("/{session_id}", response_model=WorkoutSessionResponse)
def update_session(
    session_id: UUID,
    payload: WorkoutSessionUpdate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sync live exercises, update the timer duration, or finish the workout"""
    workout = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == session_id, WorkoutSession.user_id == current_user_id
        )
        .first()
    )
    if not workout:
        raise HTTPException(status_code=404, detail="Session not found")

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("visibility") is None:
        update_data.pop("visibility", None)
    for key, value in update_data.items():
        setattr(workout, key, value)

    db.commit()
    db.refresh(workout)

    # Sync normalized sets
    sync_workout_sets(db, workout)
    db.commit()

    return workout


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a live workout or delete a past session"""
    workout = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == session_id, WorkoutSession.user_id == current_user_id
        )
        .first()
    )
    if not workout:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(workout)
    db.commit()
    return None


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


@router.get("/templates", response_model=List[WorkoutTemplateResponse])
def get_templates(
    current_user_id: str = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retrieve saved workout routines."""
    return (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.user_id == current_user_id)
        .order_by(WorkoutTemplate.created_at.desc())
        .all()
    )


@router.post("/templates", response_model=WorkoutTemplateResponse)
def create_template(
    payload: WorkoutTemplateCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save a custom routine."""
    data = payload.model_dump()
    data["visibility"] = resolve_visibility(
        db, current_user_id, data.get("visibility"), "default_routine_visibility"
    )
    new_template = WorkoutTemplate(**data, user_id=current_user_id)
    db.add(new_template)
    db.commit()
    db.refresh(new_template)
    return new_template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a custom routine."""
    template = (
        db.query(WorkoutTemplate)
        .filter(
            WorkoutTemplate.id == template_id,
            WorkoutTemplate.user_id == current_user_id,
        )
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(template)
    db.commit()
    return None


@router.put("/templates/{template_id}", response_model=WorkoutTemplateResponse)
def update_template(
    template_id: UUID,
    payload: WorkoutTemplateCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a custom routine."""
    template = (
        db.query(WorkoutTemplate)
        .filter(
            WorkoutTemplate.id == template_id,
            WorkoutTemplate.user_id == current_user_id,
        )
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.name = payload.name
    template.exercises = payload.exercises
    if payload.visibility:
        template.visibility = payload.visibility
    db.commit()
    db.refresh(template)
    return template


@router.get("/exercises/{exercise_name}/last-sets")
def get_last_exercise_sets(
    exercise_name: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve the sets from the last time the user performed this exercise."""
    # Find the most recent set for this exercise to get the session_id
    last_set = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.user_id == current_user_id,
            WorkoutSet.exercise_name == exercise_name
        )
        .order_by(WorkoutSet.created_at.desc())
        .first()
    )

    if not last_set:
        return []

    # Fetch all sets for that specific session and exercise
    previous_sets = (
        db.query(WorkoutSet)
        .filter(
            WorkoutSet.session_id == last_set.session_id,
            WorkoutSet.exercise_name == exercise_name
        )
        .order_by(WorkoutSet.set_number.asc())
        .all()
    )

    return previous_sets

@router.get("/users/{user_id}/sessions", response_model=List[WorkoutSessionResponse])
def get_user_sessions(
    user_id: str,
    limit: int = 30,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Another user's completed sessions, filtered to what the caller may read

    The visibility clause runs in the database, so a private session is never
    loaded and then discarded
    """
    assert_not_blocked(db, current_user_id, user_id)

    return (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.user_id == user_id,
            WorkoutSession.status != "in_progress",
            visible_content_filter(db, WorkoutSession, current_user_id),
        )
        .order_by(WorkoutSession.start_time.desc())
        .limit(min(limit, 100))
        .all()
    )


@router.get("/users/{user_id}/templates", response_model=List[WorkoutTemplateResponse])
def get_user_templates(
    user_id: str,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Another user's shared routines, filtered the same way"""
    assert_not_blocked(db, current_user_id, user_id)

    return (
        db.query(WorkoutTemplate)
        .filter(
            WorkoutTemplate.user_id == user_id,
            visible_content_filter(db, WorkoutTemplate, current_user_id),
        )
        .order_by(WorkoutTemplate.created_at.desc())
        .all()
    )


@router.post("/templates/{template_id}/copy", response_model=WorkoutTemplateResponse)
def copy_template(
    template_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Copy a routine the caller is allowed to see into their own library

    The copy starts private and records source_template_id, which is what a
    later "used by N people" count reads from
    """
    source = (
        db.query(WorkoutTemplate)
        .filter(
            WorkoutTemplate.id == template_id,
            visible_content_filter(db, WorkoutTemplate, current_user_id),
        )
        .first()
    )
    if not source:
        raise HTTPException(status_code=404, detail="Routine not found")

    copy = WorkoutTemplate(
        user_id=current_user_id,
        name=source.name,
        exercises=source.exercises,
        visibility=VISIBILITY_PRIVATE,
        source_template_id=source.id,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy
