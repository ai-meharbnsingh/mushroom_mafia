from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum
from datetime import datetime

from app.database import Base

import enum


class InquiryType(str, enum.Enum):
    GENERAL = "GENERAL"
    DEMO = "DEMO"
    ENTERPRISE = "ENTERPRISE"
    SALES = "SALES"
    TRIAL = "TRIAL"


class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"

    inquiry_id = Column(Integer, primary_key=True, autoincrement=True)
    inquiry_type = Column(SAEnum(InquiryType), default=InquiryType.GENERAL, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    farm_size = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
