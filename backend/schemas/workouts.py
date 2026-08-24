from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID


class WorkoutSessionCreate(BaseModel):
    name: str = "Workout"
    status: str = "in_progress"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: int = 0
    exercises: List[Dict[str, Any]] = []


class WorkoutSessionUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    exercises: Optional[List[Dict[str, Any]]] = None


class WorkoutSessionResponse(WorkoutSessionCreate):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class ExerciseBase(BaseModel):
    name: str
    type: str
    photo_url: Optional[str] = None
    equipment: Optional[str] = None
    primary_muscle: Optional[str] = None
    secondary_muscles: Optional[List[str]] = []
    tracking_fields: Optional[List[str]] = []


class ExerciseCreate(ExerciseBase):
    pass


class ExerciseResponse(ExerciseBase):
    id: UUID
    user_id: Optional[UUID] = None

    class Config:
        from_attributes = True


class WorkoutTemplateCreate(BaseModel):
    name: str
    exercises: List[Dict[str, Any]] = []


class WorkoutTemplateResponse(WorkoutTemplateCreate):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
