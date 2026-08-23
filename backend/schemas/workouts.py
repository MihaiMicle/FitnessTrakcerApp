from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import date
from uuid import UUID

class WorkoutEntryCreate(BaseModel):
    date: date
    exercise_name: str
    working_sets: Optional[List[Dict[str, Any]]] = []
    is_cardio: bool = False
    duration_minutes: Optional[int] = None
    incline: Optional[float] = None
    speed: Optional[float] = None

class WorkoutEntryResponse(WorkoutEntryCreate):
    id: UUID
    user_id: str

    class Config:
        from_attributes = True