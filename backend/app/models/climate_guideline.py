from sqlalchemy import (
    Column, Integer, Numeric, Text, Boolean, DateTime, Enum, UniqueConstraint,
)
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import PlantType, GrowthStage


class ClimateGuideline(Base):
    __tablename__ = "climate_guidelines"

    guideline_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_type = Column(Enum(PlantType), nullable=False)
    growth_stage = Column(Enum(GrowthStage), nullable=False)
    temp_min = Column(Numeric(5, 1), nullable=True)
    temp_max = Column(Numeric(5, 1), nullable=True)
    humidity_min = Column(Numeric(5, 1), nullable=True)
    humidity_max = Column(Numeric(5, 1), nullable=True)
    co2_min = Column(Numeric(8, 1), nullable=True)
    co2_max = Column(Numeric(8, 1), nullable=True)
    temp_hysteresis = Column(Numeric(5, 2), default=1.0)
    humidity_hysteresis = Column(Numeric(5, 2), default=2.5)
    co2_hysteresis = Column(Numeric(8, 2), default=100)
    duration_days_min = Column(Integer, nullable=True)
    duration_days_max = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    is_default = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("plant_type", "growth_stage", name="uq_plant_stage"),
    )
