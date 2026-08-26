import uuid
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from core.database import Base


class WorkoutSession(Base):
    __tablename__ = "workout_sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, default="Workout")
    status = Column(String, default="in_progress")
    start_time = Column(DateTime(timezone=True), default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, default=0)
    exercises = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=func.now())


class Exercise(Base):
    __tablename__ = "exercises"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=True
    )
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'strength' or 'cardio'

    # Detailed fields
    photo_url = Column(String, nullable=True)
    equipment = Column(String, nullable=True)
    primary_muscle = Column(String, nullable=True)
    secondary_muscles = Column(JSONB, default=list)
    tracking_fields = Column(
        JSONB, default=list
    )  # Dictates UI inputs (e.g. ["weight", "reps"])

    created_at = Column(DateTime(timezone=True), default=func.now())


class WorkoutTemplate(Base):
    __tablename__ = "workout_templates"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False)
    exercises = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=func.now())


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workout_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    
    exercise_name = Column(String, nullable=False)
    set_number = Column(Integer, nullable=False)
    completed = Column(Boolean, default=False)

    # Tracking Fields
    weight_kg = Column(Float, nullable=True)
    reps = Column(Integer, nullable=True)
    rir = Column(Float, nullable=True)
    duration_minutes = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    incline = Column(Float, nullable=True)
    speed = Column(Float, nullable=True)
    difficulty = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), default=func.now())
