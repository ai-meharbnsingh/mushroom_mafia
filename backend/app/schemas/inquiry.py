from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class InquiryCreate(BaseModel):
    inquiry_type: str = "GENERAL"
    name: str
    email: str
    phone: Optional[str] = None
    farm_size: Optional[str] = None
    message: str


class InquiryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inquiry_id: int
    inquiry_type: str
    name: str
    email: str
    phone: Optional[str] = None
    farm_size: Optional[str] = None
    message: str
    created_at: datetime
