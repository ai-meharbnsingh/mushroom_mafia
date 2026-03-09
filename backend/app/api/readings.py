from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.device import Device
from app.models.room import Room
from app.models.room_reading import RoomReading
from app.models.plant import Plant
from app.schemas.reading import ReadingResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/room/{room_id}", response_model=list[ReadingResponse])
async def get_room_readings(
    room_id: int,
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get historical readings for a room.

    Query params:
    - from: start datetime filter
    - to: end datetime filter
    - limit: max number of results (default 100, max 1000)
    """
    # Verify room ownership
    ownership = await db.execute(
        select(Plant.owner_id)
        .join(Room, Room.plant_id == Plant.plant_id)
        .where(Room.room_id == room_id)
    )
    owner_id = ownership.scalar_one_or_none()
    if owner_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    if owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access readings for this room",
        )

    query = (
        select(RoomReading)
        .where(RoomReading.room_id == room_id)
        .order_by(RoomReading.recorded_at.desc())
    )

    if from_dt:
        query = query.where(RoomReading.recorded_at >= from_dt)
    if to_dt:
        query = query.where(RoomReading.recorded_at <= to_dt)

    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/device/{device_id}", response_model=list[ReadingResponse])
async def get_device_readings(
    device_id: int,
    from_dt: Optional[datetime] = Query(None, alias="from"),
    to_dt: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get historical readings for a device.

    Query params:
    - from: start datetime filter
    - to: end datetime filter
    - limit: max number of results (default 100, max 1000)
    """
    # Verify device ownership
    device_result = await db.execute(
        select(Device).where(Device.device_id == device_id, Device.is_active == True)
    )
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    if device.room_id:
        ownership = await db.execute(
            select(Plant.owner_id)
            .join(Room, Room.plant_id == Plant.plant_id)
            .where(Room.room_id == device.room_id)
        )
        dev_owner_id = ownership.scalar_one_or_none()
        if dev_owner_id != current_user.owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to access readings for this device",
            )

    query = (
        select(RoomReading)
        .where(RoomReading.device_id == device_id)
        .order_by(RoomReading.recorded_at.desc())
    )

    if from_dt:
        query = query.where(RoomReading.recorded_at >= from_dt)
    if to_dt:
        query = query.where(RoomReading.recorded_at <= to_dt)

    query = query.limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
