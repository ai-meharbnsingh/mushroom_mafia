from typing import Optional

from pydantic import BaseModel, ConfigDict


class RelayConfigUpdate(BaseModel):
    relay_type: str
    mode: str  # MANUAL, AUTO, SCHEDULE
    threshold_param: Optional[str] = None
    action_on_high: str = "ON"
    action_on_low: str = "OFF"


class RelayConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    relay_type: str
    mode: str
    threshold_param: Optional[str] = None
    action_on_high: str
    action_on_low: str


class RelayScheduleCreate(BaseModel):
    relay_type: str
    days_of_week: int = 127
    time_on: str   # "HH:MM"
    time_off: str  # "HH:MM"


class RelayScheduleUpdate(BaseModel):
    days_of_week: Optional[int] = None
    time_on: Optional[str] = None
    time_off: Optional[str] = None
    is_active: Optional[bool] = None


class RelayScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    schedule_id: int
    relay_type: str
    days_of_week: int
    time_on: str
    time_off: str
    is_active: bool
