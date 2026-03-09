from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    owner_id: int
    username: str
    email: str
    password: str
    first_name: str
    last_name: str
    mobile: Optional[str] = None
    role: str
    assigned_plants: Optional[list[int]] = None


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    mobile: Optional[str] = None
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
