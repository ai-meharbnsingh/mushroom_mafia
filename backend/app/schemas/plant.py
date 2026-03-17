import re
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class NewAdminInline(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    mobile: Optional[str] = Field(None, max_length=15)


class PlantCreate(BaseModel):
    owner_id: int
    plant_name: str = Field(..., min_length=1, max_length=100)
    plant_code: Optional[str] = Field(None, max_length=20)
    plant_type: str
    location: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    city: str = Field(..., max_length=50)
    state: str = Field(..., max_length=50)
    pincode: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plant_size_sqft: Optional[float] = None
    no_of_rooms: Optional[int] = None
    established_date: Optional[date] = None
    admin_user_id: Optional[int] = None
    new_admin: Optional[NewAdminInline] = None

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: str) -> str:
        if not re.match(r"^\d{6}$", v):
            raise ValueError("Pincode must be exactly 6 digits")
        return v

    @model_validator(mode="after")
    def check_admin_provided(self):
        if self.admin_user_id is None and self.new_admin is None:
            raise ValueError("Either admin_user_id or new_admin must be provided")
        if self.admin_user_id is not None and self.new_admin is not None:
            raise ValueError("Provide only one of admin_user_id or new_admin, not both")
        return self


class PlantUpdate(BaseModel):
    plant_name: Optional[str] = None
    plant_type: Optional[str] = None
    location: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plant_size_sqft: Optional[float] = None
    no_of_rooms: Optional[int] = None
    established_date: Optional[date] = None

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^\d{6}$", v):
            raise ValueError("Pincode must be exactly 6 digits")
        return v


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
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    plant_size_sqft: Optional[float] = None
    no_of_rooms: Optional[int] = None
    established_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
