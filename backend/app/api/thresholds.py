import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.threshold import Threshold
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.threshold import ThresholdResponse, RoomThresholdsUpdate
from app.api.deps import get_current_user, require_roles
from app.services.mqtt_client import mqtt_manager

logger = logging.getLogger(__name__)

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
    result = await db.execute(select(Threshold).where(Threshold.room_id == room_id))
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
        update_data = threshold_update.model_dump(
            exclude_unset=True, exclude={"parameter"}
        )
        for field, value in update_data.items():
            setattr(threshold, field, value)
        threshold.updated_by = current_user.user_id
        updated_thresholds.append(threshold)
    await db.commit()
    # Refresh all updated thresholds
    for t in updated_thresholds:
        await db.refresh(t)

    # Publish threshold config to all devices in this room via MQTT
    try:
        room_with_devices = await db.execute(
            select(Room)
            .options(selectinload(Room.devices))
            .where(Room.room_id == room_id)
        )
        room_obj = room_with_devices.scalar_one_or_none()
        if room_obj and room_obj.devices:
            # Build config payload from all thresholds for this room
            all_thresholds = await db.execute(
                select(Threshold).where(Threshold.room_id == room_id)
            )
            config_payload = {}
            for th in all_thresholds.scalars().all():
                param = th.parameter.value.lower()  # CO2, HUMIDITY, TEMPERATURE
                if th.min_value is not None:
                    config_payload[f"{param}_min"] = float(th.min_value)
                if th.max_value is not None:
                    config_payload[f"{param}_max"] = float(th.max_value)
                if th.hysteresis is not None:
                    config_payload[f"{param}_hysteresis"] = float(th.hysteresis)

            for device in room_obj.devices:
                if device.is_online and device.license_key:
                    await mqtt_manager.publish_config_update(
                        device.license_key, config_payload
                    )
            logger.info(
                "Threshold config synced to %d device(s) in room %d",
                len([d for d in room_obj.devices if d.is_online]),
                room_id,
            )
    except Exception as e:
        logger.error("Failed to publish threshold config via MQTT: %s", e)

    return updated_thresholds
