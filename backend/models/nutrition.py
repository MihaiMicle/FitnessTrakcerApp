from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from core.database import Base


class DailyLog(Base):
    __tablename__ = "daily_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("user_profiles.id"), nullable=False)
    date = Column(Date, nullable=False)

    total_calories = Column(Integer, default=0)
    total_protein_g = Column(Integer, default=0)
    total_carbs_g = Column(Integer, default=0)
    total_fats_g = Column(Integer, default=0)


class Meal(Base):
    __tablename__ = "meals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    daily_log_id = Column(
        Integer, ForeignKey("daily_logs.id", ondelete="CASCADE"), nullable=False
    )
    name = Column(String, nullable=False)
    meal_type = Column(String, nullable=False)
    calories = Column(Integer, default=0)
    protein_g = Column(Float, default=0.0)
    carbs_g = Column(Float, default=0.0)
    fats_g = Column(Float, default=0.0)
    serving_size = Column(Float, default=0.0)
    serving_unit = Column(String, default="g")

    # Relationship back to the daily log
    daily_log = relationship("DailyLog", backref="meals")
