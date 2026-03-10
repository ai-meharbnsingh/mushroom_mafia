from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, ForeignKey,
)
from sqlalchemy.sql import func

from app.database import Base


class Firmware(Base):
    __tablename__ = "firmware"

    firmware_id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(20), nullable=False, unique=True)
    checksum_sha256 = Column(String(64), nullable=False)
    file_path = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    release_notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.user_id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    is_active = Column(Boolean, default=True)
