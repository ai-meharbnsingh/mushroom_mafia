from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    Numeric,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RoomReading(Base):
    __tablename__ = "room_readings"

    reading_id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=True)
    co2_ppm = Column(Integer)
    room_temp = Column(Numeric(5, 2))
    room_humidity = Column(Numeric(5, 2))
    bag_temp_1 = Column(Numeric(5, 2))
    bag_temp_2 = Column(Numeric(5, 2))
    bag_temp_3 = Column(Numeric(5, 2))
    bag_temp_4 = Column(Numeric(5, 2))
    bag_temp_5 = Column(Numeric(5, 2))
    bag_temp_6 = Column(Numeric(5, 2))
    bag_temp_7 = Column(Numeric(5, 2))
    bag_temp_8 = Column(Numeric(5, 2))
    bag_temp_9 = Column(Numeric(5, 2))
    bag_temp_10 = Column(Numeric(5, 2))
    outdoor_temp = Column(Numeric(5, 2))
    outdoor_humidity = Column(Numeric(5, 2))
    recorded_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    device = relationship("Device", back_populates="readings")

    __table_args__ = (
        Index("idx_readings_device_time", "device_id", "recorded_at"),
        Index("idx_readings_room_time", "room_id", "recorded_at"),
    )
