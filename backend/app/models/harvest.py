from sqlalchemy import (
    Column,
    Integer,
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
from app.models.enums import HarvestGrade


class Harvest(Base):
    __tablename__ = "harvests"

    harvest_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    harvested_at = Column(DateTime, nullable=False)
    weight_kg = Column(Numeric(10, 2), nullable=False)
    grade = Column(Enum(HarvestGrade), nullable=False)
    notes = Column(Text, nullable=True)
    recorded_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    room = relationship("Room", back_populates="harvests")
    recorded_by_user = relationship("User", foreign_keys=[recorded_by])

    __table_args__ = (Index("idx_harvests_room", "room_id"),)
