from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, Enum, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import DeviceType, SubscriptionStatus, CommunicationMode


class Device(Base):
    __tablename__ = "devices"

    device_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=True)
    assigned_to_plant_id = Column(Integer, ForeignKey("plants.plant_id"), nullable=True)
    mac_address = Column(String(17), unique=True, nullable=False)
    license_key = Column(String(19), unique=True, nullable=False)
    device_password = Column(String(255), nullable=True)
    device_name = Column(String(50))
    device_type = Column(Enum(DeviceType), default=DeviceType.ESP32)
    firmware_version = Column(String(20), default="1.0.0")
    hardware_version = Column(String(20))
    device_ip = Column(String(45))
    wifi_rssi = Column(Integer)
    free_heap = Column(Integer)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime)
    is_active = Column(Boolean, default=True)
    subscription_status = Column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.PENDING
    )
    subscription_expires_at = Column(DateTime, nullable=True)
    communication_mode = Column(
        Enum(CommunicationMode), default=CommunicationMode.HTTP
    )
    linked_by_user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    linked_at = Column(DateTime, nullable=True)
    qr_code_image = Column(Text, nullable=True)
    ota_status = Column(String(20), nullable=True, default="idle")
    last_ota_at = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    room = relationship("Room", back_populates="devices")
    linked_by_user = relationship("User", foreign_keys=[linked_by_user_id])
    assigned_plant = relationship("Plant", foreign_keys=[assigned_to_plant_id])
    readings = relationship("RoomReading", back_populates="device")
    relay_statuses = relationship("RelayStatus", back_populates="device")
    relay_configs = relationship("RelayConfig", back_populates="device")
    relay_schedules = relationship("RelaySchedule", back_populates="device")
    alerts = relationship("Alert", back_populates="device")

    __table_args__ = (
        Index("idx_devices_room", "room_id"),
        Index("idx_devices_license_key", "license_key"),
        Index("idx_devices_mac", "mac_address"),
    )
