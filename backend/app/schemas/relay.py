from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class RelayCommand(BaseModel):
    relay_type: str
    state: bool


class RelayStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: int
    relay_type: str
    state: bool
    trigger_type: Optional[str] = None
    triggered_by: Optional[int] = None
    changed_at: datetime
