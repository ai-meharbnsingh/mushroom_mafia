from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.threshold import Threshold
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.threshold import ThresholdResponse, RoomThresholdsUpdate
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/room/{room_id}", response_model=list[ThresholdResponse])
async def get_room_thresholds(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all thresholds for a room (CO2, HUMIDITY, TEMPERATURE)."""
    # Verify room belongs to the user's owner
    room_result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    result = await db.execute(
        select(Threshold).where(Threshold.room_id == room_id)
    )
    return result.scalars().all()


@router.put("/room/{room_id}", response_model=list[ThresholdResponse])
async def update_room_thresholds(
    room_id: int,
    body: RoomThresholdsUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update thresholds for a room. ADMIN/MANAGER.
    Accept list of ThresholdUpdate. Set updated_by to current_user.user_id."""
    # Verify room belongs to the user's owner
    room_result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    updated_thresholds = []
    for threshold_update in body.thresholds:
        result = await db.execute(
            select(Threshold).where(
                Threshold.room_id == room_id,
                Threshold.parameter == threshold_update.parameter,
            )
        )
        threshold = result.scalar_one_or_none()
        if not threshold:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Threshold for parameter '{threshold_update.parameter}' not found in room {room_id}",
            )
        update_data = threshold_update.model_dump(exclude_unset=True, exclude={"parameter"})
        for field, value in update_data.items():
            setattr(threshold, field, value)
        threshold.updated_by = current_user.user_id
        updated_thresholds.append(threshold)
    await db.commit()
    # Refresh all updated thresholds
    for t in updated_thresholds:
        await db.refresh(t)
    return updated_thresholds
