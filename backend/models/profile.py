from datetime import date
from sqlalchemy import Column, Float, Integer, String, DateTime, Date
from sqlalchemy.sql import func
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

    target_calories = Column(Integer, default=2500)
    target_protein_g = Column(Integer, default=165)
    target_carbs_g = Column(Integer, default=300)
    target_fats_g = Column(Integer, default=70)

    updated_at = Column(
        DateTime(timezone=True), default=func.now(), onupdate=func.now()
    )
