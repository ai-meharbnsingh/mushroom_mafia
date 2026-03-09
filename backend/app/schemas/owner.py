from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class OwnerCreate(BaseModel):
    company_name: str
    owner_name: str
    email: str
    mobile: str
    address: str
    city: str
    state: str
    country: str
    pincode: str
    gst_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OwnerUpdate(BaseModel):
    company_name: Optional[str] = None
    owner_name: Optional[str] = None
    email: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class OwnerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    owner_id: int
    company_name: str
    owner_name: str
    email: str
    mobile: str
    address: str
    city: str
    state: str
    country: str
    pincode: str
    gst_number: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
