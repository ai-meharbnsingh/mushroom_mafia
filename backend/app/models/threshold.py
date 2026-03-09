from sqlalchemy import (
    Column, Integer, Boolean, Numeric, DateTime, Enum, ForeignKey, Index, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import ThresholdParameter


class Threshold(Base):
    __tablename__ = "thresholds"

    threshold_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    parameter = Column(Enum(ThresholdParameter), nullable=False)
    min_value = Column(Numeric(10, 2))
    max_value = Column(Numeric(10, 2))
    hysteresis = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    updated_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    room = relationship("Room", back_populates="thresholds")

    __table_args__ = (
        UniqueConstraint("room_id", "parameter", name="uq_room_parameter"),
        Index("idx_thresholds_room", "room_id"),
    )
