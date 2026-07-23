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


class MealTypeEnum(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"
    PRE_WORKOUT = "pre_workout"
    POST_WORKOUT = "post_workout"

class DailyLog(Base):
    __tablename__ = "daily_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    log_date = Column(Date, nullable=False, index=True)
    
    # Relationships
    user = relationship("UserProfile", backref="daily_logs")
    meals = relationship("MealEntry", back_populates="daily_log", cascade="all, delete-orphan")

class MealEntry(Base):
    __tablename__ = "meal_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    daily_log_id = Column(Integer, ForeignKey("daily_logs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    meal_type = Column(SQLEnum(MealTypeEnum), nullable=False)
    food_name = Column(String, nullable=False)
    quantity_g = Column(Float, nullable=False)  # Normalized serving size in grams
    
    # Logged macro breakdowns
    calories = Column(Integer, nullable=False)
    protein_g = Column(Float, nullable=False)
    carbs_g = Column(Float, nullable=False)
    fats_g = Column(Float, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    daily_log = relationship("DailyLog", back_populates="meals")


class ServingUnitEnum(str, enum.Enum):
    GRAM = "g"
    OUNCE = "oz"
    POUND = "lb"
    MILLILITER = "ml"
    FLUID_OUNCE = "fl_oz"

