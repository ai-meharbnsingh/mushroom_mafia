from sqlalchemy import (
    Column,
    Integer,
    Boolean,
    Text,
    DateTime,
    Numeric,
    Enum,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import GrowthStage


class GrowthCycle(Base):
    __tablename__ = "growth_cycles"

    cycle_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    started_at = Column(DateTime, nullable=False, server_default=func.now())
    current_stage = Column(
        Enum(GrowthStage), nullable=False, default=GrowthStage.INOCULATION
    )
    stage_changed_at = Column(DateTime, nullable=True)
    expected_harvest_date = Column(DateTime, nullable=True)
    target_yield_kg = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    auto_adjust_thresholds = Column(Boolean, default=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    room = relationship("Room", back_populates="growth_cycles")
    created_by_user = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("idx_growth_cycles_room", "room_id"),
        Index("idx_growth_cycles_active", "is_active"),
    )
