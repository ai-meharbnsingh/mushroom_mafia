from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


class FirmwareUpload(BaseModel):
    version: str
    release_notes: Optional[str] = None


class FirmwareResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    firmware_id: int
    version: str
    checksum_sha256: str
    file_size: int
    release_notes: Optional[str] = None
    created_at: datetime
    is_active: bool


class OTARolloutRequest(BaseModel):
    device_ids: List[int]  # empty = all active devices
    firmware_id: int


class OTAStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: int
    device_name: str
    firmware_version: Optional[str] = None
    ota_status: Optional[str] = None
    last_ota_at: Optional[datetime] = None
