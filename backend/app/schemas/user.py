from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    owner_id: int
    username: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    mobile: Optional[str] = Field(None, max_length=15)
    role: str
    assigned_plants: Optional[list[int]] = None


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=2, max_length=50)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    mobile: Optional[str] = Field(None, max_length=15)
    role: Optional[str] = None
    assigned_plants: Optional[list[int]] = None


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    owner_id: int
    username: str
    email: str
    first_name: str
    last_name: str
    mobile: Optional[str] = None
    role: str
    assigned_plants: Optional[list[int]] = None
    is_active: bool
    last_login: Optional[datetime] = None
    created_at: datetime
