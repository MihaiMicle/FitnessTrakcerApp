from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Boolean

class WorkoutEntry(Base):
    __tablename__ = "workout_entries"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    
    # E.g., "Barbell Bench Press", "Romanian Deadlift", or "Treadmill"
    exercise_name = Column(String, nullable=False) 
    
    # Lifting Metrics
    # Stored as a list of dicts: [{"set": 1, "weight_kg": 120, "reps": 5, "rpe": 8}]
    working_sets = Column(JSONB, default=list) 
    
    # Cardio Metrics
    is_cardio = Column(Boolean, default=False)
    duration_minutes = Column(Integer, nullable=True) # e.g., 30
    incline = Column(Float, nullable=True)            # e.g., 13.5
    speed = Column(Float, nullable=True)              # e.g., 4.1
    
    created_at = Column(DateTime(timezone=True), default=func.now())