from datetime import date
from sqlalchemy import Column, Float, Integer, String, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from core.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"
    user_id = Column("id", String, primary_key=True, index=True)

    @property
    def id(self):
        return self.user_id

    first_name = Column(String, nullable=True, default="")
    last_name = Column(String, nullable=True, default="")
    birth_date = Column(Date, nullable=True, default=date(2000, 1, 1))
    email = Column(String, nullable=True, default="")

    weight_kg = Column(Float, default=75.0)
    height_cm = Column(Float, default=175.0)
    age = Column(Integer, default=20)
    gender = Column(String, default="male")
    activity_level = Column(Float, default=1.2)
    goal_type = Column("primary_goal", String, default="maintain")

    body_fat_percentage = Column(Float, nullable=True, default=None)

    avatar_url = Column(String, nullable=True, default="")

    target_calories = Column(Integer, default=2500)
    target_protein_g = Column(Integer, default=165)
    target_carbs_g = Column(Integer, default=300)
    target_fats_g = Column(Integer, default=70)
    target_saturated_fats_g = Column(Integer, default=20)
    target_fiber_g = Column(Integer, default=30)
    target_sugar_g = Column(Integer, default=50)
    target_potassium_mg = Column(Integer, default=3500)
    target_sodium_mg = Column(Integer, default=2300)
    target_iron_mg = Column(Float, default=8.0)
    target_vitamin_d_mcg = Column(Float, default=25.0)
    target_zinc_mg = Column(Float, default=11.0)
    target_magnesium_mg = Column(Float, default=400.0)
    target_calcium_mg = Column(Float, default=1200.0)
    target_cholesterol_mg = Column(Float, default=300.0)
    target_water_ml = Column(Integer, default=3000)

    updated_at = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )


class WeightLog(Base):
    __tablename__ = "weight_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        String, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False
    )
    date = Column(Date, nullable=False)
    weight_kg = Column(Float, nullable=False)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
