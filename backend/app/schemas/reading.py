from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ReadingCreate(BaseModel):
    co2_ppm: Optional[float] = None
    room_temp: Optional[float] = None
    room_humidity: Optional[float] = None
    bag_temps: Optional[list[float]] = None
    outdoor_temp: Optional[float] = None
    outdoor_humidity: Optional[float] = None
    relay_states: Optional[dict] = None


class ReadingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reading_id: int
    device_id: int
    room_id: Optional[int] = None
    co2_ppm: Optional[float] = None
    room_temp: Optional[float] = None
    room_humidity: Optional[float] = None
    bag_temp_1: Optional[float] = None
    bag_temp_2: Optional[float] = None
    bag_temp_3: Optional[float] = None
    bag_temp_4: Optional[float] = None
    bag_temp_5: Optional[float] = None
    bag_temp_6: Optional[float] = None
    bag_temp_7: Optional[float] = None
    bag_temp_8: Optional[float] = None
    bag_temp_9: Optional[float] = None
    bag_temp_10: Optional[float] = None
    outdoor_temp: Optional[float] = None
    outdoor_humidity: Optional[float] = None
    recorded_at: datetime
    created_at: datetime
