from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: int
    device_id: Optional[int] = None
    room_id: Optional[int] = None
    alert_type: str
    severity: str
    parameter: Optional[str] = None
    current_value: Optional[float] = None
    threshold_value: Optional[float] = None
    message: str
    is_read: bool
    acknowledged_by: Optional[int] = None
    acknowledged_at: Optional[datetime] = None
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    created_at: datetime
