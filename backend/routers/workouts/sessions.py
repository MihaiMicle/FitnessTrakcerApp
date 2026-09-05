from typing import List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.feed_queries import (
    SUBJECT_SESSION,
    delete_events_for_subject,
    emit_session_events,
)
from core.security import get_current_user
from core.social_queries import assert_not_blocked, visible_content_filter
from core.sync import creation_defaults
from models.workouts import WorkoutSession
from schemas.workouts import (
    WorkoutSessionCreate,
    WorkoutSessionResponse,
    WorkoutSessionUpdate,
)

from .common import resolve_visibility, sync_workout_sets, workouts_router

router = workouts_router()


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


@router.get("/sessions/{session_id}", response_model=WorkoutSessionResponse)
def get_session(
    session_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a specific workout session."""
    workout = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == session_id, WorkoutSession.user_id == current_user_id
        )
        .first()
    )
    if not workout:
        raise HTTPException(status_code=404, detail="Session not found")
    return workout


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

    # Publish after the sets are normalized, because record detection reads
    # them back to compare this session against everything logged before it
    emit_session_events(db, new_session)
    db.commit()

    return new_session


@router.put("/{session_id}", response_model=WorkoutSessionResponse)
def update_session(
    session_id: UUID,
    payload: WorkoutSessionUpdate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sync live exercises, update the timer duration, or finish the workout

    This upserts. The session id is generated on the device so a workout can be
    logged with no signal, which means the queued save may be the first the
    server hears of it. Writing to a known id also makes a retry after a timeout
    idempotent instead of creating a duplicate workout
    """
    workout = (
        db.query(WorkoutSession)
        .filter(
            WorkoutSession.id == session_id, WorkoutSession.user_id == current_user_id
        )
        .first()
    )

    update_data = payload.model_dump(exclude_unset=True)
    if update_data.get("visibility") is None:
        update_data.pop("visibility", None)

    if not workout:
        # 404 rather than 403 when the id belongs to someone else, so a probe
        # cannot tell an existing session apart from a free id
        taken = db.query(WorkoutSession).filter(WorkoutSession.id == session_id).first()
        if taken:
            raise HTTPException(status_code=404, detail="Session not found")

        data = creation_defaults(update_data)
        data["visibility"] = resolve_visibility(
            db, current_user_id, data.get("visibility"), "default_workout_visibility"
        )
        workout = WorkoutSession(**data, id=session_id, user_id=current_user_id)
        db.add(workout)
    else:
        for key, value in update_data.items():
            setattr(workout, key, value)

    db.commit()
    db.refresh(workout)

    # Sync normalized sets
    sync_workout_sets(db, workout)
    db.commit()

    # Safe to call on every save: emission upserts on a dedupe key, so a
    # replayed offline write updates the existing card rather than posting again
    emit_session_events(db, workout)
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

    # Events reference the session by id rather than by foreign key, so the
    # database cascade does not reach them
    delete_events_for_subject(db, current_user_id, SUBJECT_SESSION, session_id)

    db.delete(workout)
    db.commit()
    return None


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
