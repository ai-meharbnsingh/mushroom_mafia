from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import RoomType


class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.plant_id"), nullable=False)
    room_name = Column(String(100), nullable=False)
    room_code = Column(String(20), unique=True)
    room_type = Column(Enum(RoomType), default=RoomType.FRUITING)
    room_size_sqft = Column(Integer)
    no_of_racks = Column(Integer, default=0)
    no_of_bags = Column(Integer, default=0)
    bags_per_rack = Column(Integer)
    floor_number = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    plant = relationship("Plant", back_populates="rooms")
    devices = relationship("Device", back_populates="room")
    thresholds = relationship("Threshold", back_populates="room")

    __table_args__ = (Index("idx_rooms_plant", "plant_id"),)
