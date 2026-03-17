import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.climate_guideline import ClimateGuideline
from app.models.room import Room
from app.models.plant import Plant
from app.models.threshold import Threshold
from app.models.user import User
from app.models.enums import UserRole, PlantType, GrowthStage
from app.schemas.climate_guideline import (
    ClimateGuidelineResponse,
    ClimateGuidelineUpdate,
    ClimateAdvisoryResponse,
)
from app.api.deps import get_current_user, require_roles
from app.services.climate_advisory import (
    get_advisory_for_room,
    apply_guideline_thresholds,
)
from app.services.mqtt_client import mqtt_manager

logger = logging.getLogger(__name__)

router = APIRouter()


async def _verify_room_ownership(
    db: AsyncSession, room_id: int, owner_id: int
) -> Room:
    """Verify a room belongs to the given owner."""
    result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == room_id,
            Plant.owner_id == owner_id,
        )
    )
    room = result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found",
        )
    return room


@router.get("/room/{room_id}", response_model=ClimateAdvisoryResponse)
async def get_room_advisory(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get climate advisory for a room based on its current growth stage."""
    await _verify_room_ownership(db, room_id, current_user.owner_id)
    return await get_advisory_for_room(db, room_id, current_user.owner_id)


@router.get("/guidelines", response_model=list[ClimateGuidelineResponse])
async def list_guidelines(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all climate guidelines. Any authenticated user."""
    result = await db.execute(
        select(ClimateGuideline).order_by(
            ClimateGuideline.plant_type, ClimateGuideline.growth_stage
        )
    )
    return result.scalars().all()


@router.get(
    "/guidelines/{plant_type}/{growth_stage}",
    response_model=ClimateGuidelineResponse,
)
async def get_guideline(
    plant_type: PlantType,
    growth_stage: GrowthStage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific climate guideline by plant type and growth stage."""
    result = await db.execute(
        select(ClimateGuideline).where(
            ClimateGuideline.plant_type == plant_type,
            ClimateGuideline.growth_stage == growth_stage,
        )
    )
    guideline = result.scalar_one_or_none()
    if not guideline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No guideline found for {plant_type.value}/{growth_stage.value}",
        )
    return guideline


@router.put(
    "/guidelines/{plant_type}/{growth_stage}",
    response_model=ClimateGuidelineResponse,
)
async def update_guideline(
    plant_type: PlantType,
    growth_stage: GrowthStage,
    body: ClimateGuidelineUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update a climate guideline. ADMIN only. Partial update."""
    result = await db.execute(
        select(ClimateGuideline).where(
            ClimateGuideline.plant_type == plant_type,
            ClimateGuideline.growth_stage == growth_stage,
        )
    )
    guideline = result.scalar_one_or_none()
    if not guideline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No guideline found for {plant_type.value}/{growth_stage.value}",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(guideline, field, value)

    await db.commit()
    await db.refresh(guideline)
    return guideline


@router.post("/room/{room_id}/apply", response_model=list)
async def apply_recommended_thresholds(
    room_id: int,
    current_user: User = Depends(
        require_roles(
            UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER
        )
    ),
    db: AsyncSession = Depends(get_db),
):
    """Apply the recommended guideline thresholds to a room.

    Looks up the guideline for the room's current growth stage and plant type,
    then updates the room's thresholds and publishes config to devices via MQTT.
    """
    await _verify_room_ownership(db, room_id, current_user.owner_id)

    # Get room with plant loaded
    room_result = await db.execute(
        select(Room)
        .options(selectinload(Room.plant))
        .where(Room.room_id == room_id)
    )
    room_obj = room_result.scalar_one_or_none()
    if not room_obj or not room_obj.plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room or plant not found",
        )

    # Get active growth cycle
    from app.models.growth_cycle import GrowthCycle

    cycle_result = await db.execute(
        select(GrowthCycle).where(
            GrowthCycle.room_id == room_id,
            GrowthCycle.is_active == True,
        )
    )
    cycle = cycle_result.scalar_one_or_none()
    if not cycle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active growth cycle for this room. Start a growth cycle first.",
        )

    # Look up guideline
    guideline_result = await db.execute(
        select(ClimateGuideline).where(
            ClimateGuideline.plant_type == room_obj.plant.plant_type,
            ClimateGuideline.growth_stage == cycle.current_stage,
        )
    )
    guideline = guideline_result.scalar_one_or_none()
    if not guideline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No guideline found for {room_obj.plant.plant_type.value}/{cycle.current_stage.value}",
        )

    # Apply guideline thresholds
    updated = await apply_guideline_thresholds(
        db, room_id, guideline, current_user.user_id
    )

    # Publish updated thresholds to devices via MQTT
    try:
        room_with_devices = await db.execute(
            select(Room)
            .options(selectinload(Room.devices))
            .where(Room.room_id == room_id)
        )
        room_dev = room_with_devices.scalar_one_or_none()
        if room_dev and room_dev.devices:
            all_thresholds = await db.execute(
                select(Threshold).where(Threshold.room_id == room_id)
            )
            config_payload = {}
            for th in all_thresholds.scalars().all():
                param = th.parameter.value.lower()
                if th.min_value is not None:
                    config_payload[f"{param}_min"] = float(th.min_value)
                if th.max_value is not None:
                    config_payload[f"{param}_max"] = float(th.max_value)
                if th.hysteresis is not None:
                    config_payload[f"{param}_hysteresis"] = float(th.hysteresis)

            for device in room_dev.devices:
                if device.is_online and device.license_key:
                    await mqtt_manager.publish_config_update(
                        device.license_key, config_payload
                    )
            logger.info(
                "Threshold config synced to %d device(s) in room %d after apply",
                len([d for d in room_dev.devices if d.is_online]),
                room_id,
            )
    except Exception as e:
        logger.error("Failed to publish threshold config via MQTT: %s", e)

    return [
        {
            "parameter": t.parameter.value,
            "min_value": float(t.min_value) if t.min_value is not None else None,
            "max_value": float(t.max_value) if t.max_value is not None else None,
            "hysteresis": float(t.hysteresis) if t.hysteresis is not None else None,
        }
        for t in updated
    ]
