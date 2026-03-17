from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Text,
    Boolean,
    Numeric,
    DateTime,
    Enum,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import AlertType, Severity


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(Severity), default=Severity.WARNING, nullable=False)
    parameter = Column(String(50))
    current_value = Column(Numeric(10, 2))
    threshold_value = Column(Numeric(10, 2))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    acknowledged_at = Column(DateTime)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

    device = relationship("Device", back_populates="alerts")

    __table_args__ = (
        Index("idx_alerts_room", "room_id", "is_resolved", "created_at"),
        Index("idx_alerts_severity", "severity"),
        Index("idx_alerts_unread", "is_read"),
    )
