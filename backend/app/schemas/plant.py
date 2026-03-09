from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class PlantCreate(BaseModel):
    owner_id: int
    plant_name: str
    plant_code: str
    plant_type: str
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plant_size_sqft: Optional[float] = None
    no_of_rooms: Optional[int] = None
    established_date: Optional[date] = None


class PlantUpdate(BaseModel):
    plant_name: Optional[str] = None
    plant_code: Optional[str] = None
    plant_type: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plant_size_sqft: Optional[float] = None
    no_of_rooms: Optional[int] = None
    established_date: Optional[date] = None


class PlantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plant_id: int
    owner_id: int
    plant_name: str
    plant_code: str
    plant_type: str
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plant_size_sqft: Optional[float] = None
    no_of_rooms: Optional[int] = None
    established_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
