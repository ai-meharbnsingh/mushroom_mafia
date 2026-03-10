from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Enum, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import RelayType


class RelaySchedule(Base):
    __tablename__ = "relay_schedule"

    schedule_id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    relay_type = Column(Enum(RelayType), nullable=False)
    days_of_week = Column(Integer, nullable=False, default=127)  # bitmask Mon=1..Sun=64, 127=every day
    time_on = Column(String(5), nullable=False)   # "HH:MM"
    time_off = Column(String(5), nullable=False)   # "HH:MM"
    is_active = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    created_at = Column(DateTime, default=func.now())

    device = relationship("Device", back_populates="relay_schedules")

    __table_args__ = (
        Index("idx_relay_schedule_device", "device_id"),
        Index("idx_relay_schedule_active", "is_active"),
    )
