from typing import List
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.feed_queries import (
    SUBJECT_TEMPLATE,
    delete_events_for_subject,
    emit_template_event,
)
from core.security import get_current_user
from core.social import VISIBILITY_PRIVATE
from core.social_queries import assert_not_blocked, visible_content_filter
from models.workouts import WorkoutTemplate
from schemas.workouts import WorkoutTemplateCreate, WorkoutTemplateResponse

from .common import resolve_visibility, workouts_router

router = workouts_router()


@router.get("/templates/{template_id}", response_model=WorkoutTemplateResponse)
def get_template(
    template_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a specific saved routine."""
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
    return template


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

    emit_template_event(db, new_template)
    db.commit()

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

    delete_events_for_subject(db, current_user_id, SUBJECT_TEMPLATE, template_id)

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

    # Also retracts the card when a shared routine is set back to private
    emit_template_event(db, template)
    db.commit()

    return template


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
