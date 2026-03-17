from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Enum,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import RelayType, TriggerType, ThresholdParameter


class RelayConfig(Base):
    __tablename__ = "relay_config"

    config_id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    relay_type = Column(Enum(RelayType), nullable=False)
    mode = Column(Enum(TriggerType), nullable=False, default=TriggerType.MANUAL)
    threshold_param = Column(
        Enum(ThresholdParameter), nullable=True
    )  # which sensor drives this relay in AUTO
    action_on_high = Column(
        String(3), default="ON"
    )  # what to do when value > max (ON or OFF)
    action_on_low = Column(
        String(3), default="OFF"
    )  # what to do when value < min (ON or OFF)
    updated_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    device = relationship("Device", back_populates="relay_configs")

    __table_args__ = (
        UniqueConstraint("device_id", "relay_type", name="uq_device_relay_config"),
        Index("idx_relay_config_device", "device_id"),
    )
