from sqlalchemy import (
    Column, Integer, BigInteger, Boolean, Numeric, DateTime, Enum, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import RelayType, TriggerType


class RelayStatus(Base):
    __tablename__ = "relay_status"

    status_id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    relay_type = Column(Enum(RelayType), nullable=False)
    state = Column(Boolean, nullable=False)
    trigger_type = Column(Enum(TriggerType), default=TriggerType.AUTO)
    trigger_value = Column(Numeric(10, 2))
    triggered_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    changed_at = Column(DateTime, server_default=func.now())

    device = relationship("Device", back_populates="relay_statuses")

    __table_args__ = (
        Index("idx_relay_device", "device_id", "relay_type"),
        Index("idx_relay_changed", "changed_at"),
    )
