"""
The parts of the workouts API that touch the database

The normalized-set transform lives in `core/workouts.py` and is unit tested
there. This module is the thin layer that applies it to a session, plus the
visibility-resolution helper every write endpoint needs
"""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy.orm import Session

from core.social import VISIBILITY_PRIVATE, normalize_visibility
from core.workouts import build_workout_sets
from models.profile import UserProfile
from models.workouts import WorkoutSession, WorkoutSet


def workouts_router() -> APIRouter:
    """A router carrying the shared prefix, so every module registers the same one"""
    return APIRouter(prefix="/workouts", tags=["Workouts"])


def resolve_visibility(db: Session, user_id: str, requested, default_field: str) -> str:
    """Use the explicit choice when given, otherwise the owner's default"""
    if requested:
        return normalize_visibility(requested)

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    fallback = getattr(profile, default_field, None) if profile else None
    return normalize_visibility(fallback, VISIBILITY_PRIVATE)


def sync_workout_sets(db: Session, session: WorkoutSession) -> None:
    """Replace a session's normalized sets so they match its exercises JSONB"""
    # Remove existing normalized sets for this session to prevent duplicates
    db.query(WorkoutSet).filter(WorkoutSet.session_id == session.id).delete()

    rows = build_workout_sets(session.id, session.user_id, session.exercises)
    if rows:
        db.bulk_save_objects([WorkoutSet(**row) for row in rows])


__all__ = ["resolve_visibility", "sync_workout_sets", "workouts_router"]
