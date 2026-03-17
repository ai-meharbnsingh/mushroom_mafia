from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Date,
    Enum,
    ForeignKey,
)
from sqlalchemy.sql import func

from app.database import Base
from app.models.enums import ReportType, ReportFormat


class Report(Base):
    __tablename__ = "reports"

    report_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.plant_id"))
    report_type = Column(Enum(ReportType), nullable=False)
    report_name = Column(String(100))
    file_path = Column(String(255))
    file_size = Column(Integer)
    format = Column(Enum(ReportFormat), default=ReportFormat.PDF)
    date_from = Column(Date)
    date_to = Column(Date)
    generated_by = Column(Integer, ForeignKey("users.user_id"))
    generated_at = Column(DateTime, server_default=func.now())
