from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ThresholdUpdate(BaseModel):
    parameter: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    hysteresis: Optional[float] = None
    is_active: Optional[bool] = None


class ThresholdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    threshold_id: int
    room_id: int
    parameter: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    hysteresis: Optional[float] = None
    is_active: bool
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class RoomThresholdsUpdate(BaseModel):
    thresholds: list[ThresholdUpdate]
