# Here we define the SQLAlchemy models for the application. These models represent the structure of the database tables and are used to interact with the database 

from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import enum

class GoalEnum(str, enum.Enum):
    FAT_LOSS = "fat_loss"
    MAINTENANCE = "maintenance"
    MUSCLE_GAIN = "muscle_gain"

class ActivityLevelEnum(str, enum.Enum):
    SEDENTARY = "sedentary"
    LIGHT = "light"
    MODERATE = "moderate"
    HIGH = "active"
    VERY_HIGH = "very_active"

class GenderEnum(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    
    # Onboarding stats for AI suggestions
    gender = Column(SQLEnum(GenderEnum), nullable=False)
    birth_date = Column(Date, nullable=False)
    height_cm = Column(Float, nullable=False)
    weight_kg = Column(Float, nullable=False)
    activity_level = Column(SQLEnum(ActivityLevelEnum), nullable=False)
    primary_goal = Column(SQLEnum(GoalEnum), nullable=False)
    preferred_units = Column(String, default="metric", nullable=False)  # "metric" or "imperial"
    
    # Calculated nutritional targets
    target_calories = Column(Integer, nullable=True)
    target_protein_g = Column(Integer, nullable=True)
    target_carbs_g = Column(Integer, nullable=True)
    target_fats_g = Column(Integer, nullable=True)



