from sqlalchemy import Column, Integer, String, LargeBinary, Boolean, DateTime, Text, func

from app.database import Base


class FirmwareFile(Base):
    __tablename__ = "firmware_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(20), nullable=False, unique=True, index=True)
    filename = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    file_size = Column(Integer, nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    board_type = Column(String(50), default="ESP32")
    upload_notes = Column(Text, nullable=True)
    uploaded_by = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)
