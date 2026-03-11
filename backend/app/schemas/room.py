from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator

from app.models.enums import RoomStatus


class RoomCreate(BaseModel):
    plant_id: int
    room_name: str
    room_code: str
    room_type: str
    room_size_sqft: Optional[float] = None
    no_of_racks: Optional[int] = None
    no_of_bags: Optional[int] = None
    bags_per_rack: Optional[int] = None
    floor_number: Optional[int] = None


class RoomUpdate(BaseModel):
    room_name: Optional[str] = None
    room_code: Optional[str] = None
    room_type: Optional[str] = None
    room_size_sqft: Optional[float] = None
    no_of_racks: Optional[int] = None
    no_of_bags: Optional[int] = None
    bags_per_rack: Optional[int] = None
    floor_number: Optional[int] = None


class RoomStatusChange(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid = [s.value for s in RoomStatus]
        if v not in valid:
            raise ValueError(f"Invalid status. Must be one of: {', '.join(valid)}")
        return v


class RoomResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    room_id: int
    plant_id: int
    room_name: str
    room_code: str
    room_type: str
    status: Optional[str] = "ACTIVE"
    room_size_sqft: Optional[float] = None
    no_of_racks: Optional[int] = None
    no_of_bags: Optional[int] = None
    bags_per_rack: Optional[int] = None
    floor_number: Optional[int] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
