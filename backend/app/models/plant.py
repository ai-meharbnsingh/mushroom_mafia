from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Numeric, DateTime, Date, Enum, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import PlantType


class Plant(Base):
    __tablename__ = "plants"

    plant_id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("owners.owner_id"), nullable=False)
    plant_name = Column(String(100), nullable=False)
    plant_code = Column(String(20), unique=True, nullable=False)
    plant_type = Column(Enum(PlantType), default=PlantType.OYSTER)
    location = Column(String(100))
    address = Column(Text)
    city = Column(String(50))
    state = Column(String(50))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    plant_size_sqft = Column(Integer)
    no_of_rooms = Column(Integer, default=0)
    established_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("Owner", back_populates="plants")
    rooms = relationship("Room", back_populates="plant")

    __table_args__ = (Index("idx_plants_owner", "owner_id"),)
