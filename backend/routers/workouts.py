from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from uuid import UUID

from core.database import get_db
from core.security import get_current_user
from models.profile import WorkoutEntry # Adjust import based on where you put the model
from schemas.workouts import WorkoutEntryCreate, WorkoutEntryResponse

router = APIRouter(prefix="/workouts", tags=["Workouts"])

@router.get("/{log_date}", response_model=List[WorkoutEntryResponse])
def get_workouts_by_date(
    log_date: date,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all exercises logged on a specific date."""
    return db.query(WorkoutEntry).filter(
        WorkoutEntry.user_id == current_user_id,
        WorkoutEntry.date == log_date
    ).all()

@router.post("/", response_model=WorkoutEntryResponse)
def log_exercise(
    payload: WorkoutEntryCreate,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a new lifting or cardio exercise."""
    new_entry = WorkoutEntry(**payload.model_dump(), user_id=current_user_id)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_exercise(
    entry_id: UUID,
    current_user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a logged exercise."""
    entry = db.query(WorkoutEntry).filter(
        WorkoutEntry.id == entry_id,
        WorkoutEntry.user_id == current_user_id
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Exercise not found")
        
    db.delete(entry)
    db.commit()
    return None