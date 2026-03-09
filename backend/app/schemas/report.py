from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReportGenerateRequest(BaseModel):
    plant_id: int
    report_type: str
    report_name: str
    format: str
    date_from: date
    date_to: date


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    report_id: int
    plant_id: int
    report_type: str
    report_name: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    format: str
    date_from: date
    date_to: date
    generated_by: Optional[int] = None
    generated_at: datetime
