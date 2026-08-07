from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
from core.database import Base

class CustomFood(Base):
    __tablename__ = "custom_foods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    serving_size = Column(Float, default=100.0)
    serving_unit = Column(String, default="g")
    custom_servings = Column(JSONB, default=list)  # Store custom serving sizes as JSON
    calories = Column(Integer, default=0)
    protein_g = Column(Float, default=0.0)
    carbs_g = Column(Float, default=0.0)
    fats_g = Column(Float, default=0.0)
    saturated_fats_g = Column(Float, default=0.0)
    fiber_g = Column(Float, default=0.0)
    sugar_g = Column(Float, default=0.0)
    potassium_mg = Column(Float, default=0.0)
    sodium_mg = Column(Float, default=0.0)
    iron_mg = Column(Float, default=0.0)
    vitamin_d_mcg = Column(Float, default=0.0)
    zinc_mg = Column(Float, default=0.0)
    magnesium_mg = Column(Float, default=0.0)
    calcium_mg = Column(Float, default=0.0)
    cholesterol_mg = Column(Float, default=0.0)