import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from redis.asyncio import Redis

from app.database import get_db
from app.utils.time import utcnow_naive
from app.redis_client import get_redis
from app.models.user import User
from app.models.device import Device
from app.models.relay_status import RelayStatus
from app.models.relay_config import RelayConfig
from app.models.relay_schedule import RelaySchedule
from app.models.plant import Plant
from app.models.room import Room
from app.models.enums import RelayType, TriggerType, ThresholdParameter
from app.schemas.relay import RelayCommand
from app.schemas.relay_config import (
    RelayConfigUpdate,
    RelayConfigResponse,
    RelayScheduleCreate,
    RelayScheduleUpdate,
    RelayScheduleResponse,
)
from app.api.deps import get_current_user
from app.services.ws_manager import ws_manager
from app.services.relay_automation import DEFAULT_PARAM_MAPPING

router = APIRouter()


async def _get_owner_device_ids(db: AsyncSession, owner_id: int) -> list[int]:
    """Get all device IDs belonging to an owner (via plants -> rooms -> devices)."""
    result = await db.execute(
        select(Device.device_id)
        .join(Room, Room.room_id == Device.room_id)
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(Plant.owner_id == owner_id, Device.is_active == True)
    )
    return [row[0] for row in result.all()]


async def _verify_device_ownership(
    db: AsyncSession, device_id: int, owner_id: int
) -> Device:
    """Verify a device belongs to the given owner. Return the device or raise 404/403."""
    result = await db.execute(
        select(Device).where(Device.device_id == device_id, Device.is_active == True)
    )
    device = result.scalar_one_or_none()
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
        if dev_owner_id != owner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to access this device",
            )

    return device


@router.get("/readings", summary="Get all live sensor readings for the current owner")
async def get_all_live_readings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Get all live readings from Redis for the current owner's devices."""
    device_ids = await _get_owner_device_ids(db, current_user.owner_id)

    readings = []
    for device_id in device_ids:
        raw = await redis.get(f"live:device:{device_id}")
        if raw:
            readings.append(json.loads(raw))

    return {"readings": readings}


@router.get(
    "/readings/device/{device_id}", summary="Get live reading for a specific device"
)
async def get_device_live_reading(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Get a single device's live reading from Redis."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    raw = await redis.get(f"live:device:{device_id}")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No live reading available for this device",
        )

    return json.loads(raw)


@router.get("/readings/room/{room_id}", summary="Get live reading for a room")
async def get_room_live_reading(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Get a room's live reading from Redis."""
    # Verify room ownership
    result = await db.execute(
        select(Plant.owner_id)
        .join(Room, Room.plant_id == Plant.plant_id)
        .where(Room.room_id == room_id)
    )
    owner_id = result.scalar_one_or_none()
    if owner_id is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    if owner_id != current_user.owner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this room",
        )

    raw = await redis.get(f"live:room:{room_id}")
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No live reading available for this room",
        )

    return json.loads(raw)


@router.get("/relay/{device_id}", summary="Get current relay states for a device")
async def get_relay_states(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Get relay states for a device from Redis."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    raw = await redis.get(f"live:relay:{device_id}")
    if not raw:
        return {"relay_states": {}}

    return {"relay_states": json.loads(raw)}


@router.post("/relay/{device_id}", summary="Send a relay command to a device")
async def set_relay_command(
    device_id: int,
    command: RelayCommand,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Set a relay command for a device.

    Writes the command to Redis (TTL 30s) for the device to pick up,
    and logs the relay status change to PostgreSQL.
    Pushes the command via WebSocket.
    """
    device = await _verify_device_ownership(db, device_id, current_user.owner_id)

    now = utcnow_naive()

    # If device uses MQTT, publish relay command via MQTT instead of Redis polling
    if (
        device.communication_mode.value == "MQTT"
        if device.communication_mode
        else False
    ):
        try:
            from app.services.mqtt_client import mqtt_manager

            await mqtt_manager.publish_relay_command(
                device.license_key, command.relay_type, command.state
            )
        except Exception:
            pass  # Fall through to Redis as backup

    # Write command to Redis with 30s TTL
    cmd_data = json.dumps({"relay_type": command.relay_type, "state": command.state})
    await redis.setex(f"command:relay:{device_id}", 30, cmd_data)

    # Log to PostgreSQL relay_status table
    relay_status = RelayStatus(
        device_id=device_id,
        relay_type=RelayType(command.relay_type.upper()),
        state=command.state,
        trigger_type=TriggerType.MANUAL,
        triggered_by=current_user.user_id,
        changed_at=now,
    )
    db.add(relay_status)
    await db.commit()

    # Push via WebSocket
    if device.room_id:
        result = await db.execute(
            select(Plant.owner_id)
            .join(Room, Room.plant_id == Plant.plant_id)
            .where(Room.room_id == device.room_id)
        )
        owner_id = result.scalar_one_or_none()
        if owner_id:
            await ws_manager.broadcast_to_owner(
                owner_id,
                "relay_command",
                {
                    "device_id": device_id,
                    "relay_type": command.relay_type,
                    "state": command.state,
                    "triggered_by": current_user.user_id,
                    "timestamp": now.isoformat(),
                },
            )

    return {"status": "success"}


# ─── Relay Config Endpoints ───────────────────────────────────────────────────


@router.get(
    "/relay-config/{device_id}", summary="Get relay automation configs for a device"
)
async def get_relay_configs(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get relay automation configs for a device.

    Returns all 7 relay types -- defaults to MANUAL if no config row exists.
    """
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    result = await db.execute(
        select(RelayConfig).where(RelayConfig.device_id == device_id)
    )
    existing = {cfg.relay_type.value: cfg for cfg in result.scalars().all()}

    configs = []
    for rt in RelayType:
        if rt.value in existing:
            cfg = existing[rt.value]
            configs.append(
                RelayConfigResponse(
                    relay_type=cfg.relay_type.value,
                    mode=cfg.mode.value,
                    threshold_param=cfg.threshold_param.value
                    if cfg.threshold_param
                    else None,
                    action_on_high=cfg.action_on_high,
                    action_on_low=cfg.action_on_low,
                )
            )
        else:
            # Default: MANUAL, with default param mapping
            default_param = DEFAULT_PARAM_MAPPING.get(rt.value)
            configs.append(
                RelayConfigResponse(
                    relay_type=rt.value,
                    mode=TriggerType.MANUAL.value,
                    threshold_param=default_param.value if default_param else None,
                    action_on_high="ON",
                    action_on_low="OFF",
                )
            )

    return {"configs": [c.model_dump() for c in configs]}


@router.put(
    "/relay-config/{device_id}", summary="Update relay automation configs for a device"
)
async def update_relay_configs(
    device_id: int,
    configs: List[RelayConfigUpdate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert relay automation configs for a device."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    now = utcnow_naive()
    updated = []

    for cfg_in in configs:
        # Validate relay_type
        try:
            relay_type = RelayType(cfg_in.relay_type.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid relay_type: {cfg_in.relay_type}",
            )

        # Validate mode
        try:
            mode = TriggerType(cfg_in.mode.upper())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid mode: {cfg_in.mode}",
            )

        # Validate threshold_param
        threshold_param = None
        if cfg_in.threshold_param:
            try:
                threshold_param = ThresholdParameter(cfg_in.threshold_param.upper())
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid threshold_param: {cfg_in.threshold_param}",
                )

        # Upsert
        result = await db.execute(
            select(RelayConfig).where(
                RelayConfig.device_id == device_id,
                RelayConfig.relay_type == relay_type,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.mode = mode
            existing.threshold_param = threshold_param
            existing.action_on_high = cfg_in.action_on_high.upper()
            existing.action_on_low = cfg_in.action_on_low.upper()
            existing.updated_by = current_user.user_id
            existing.updated_at = now
        else:
            new_cfg = RelayConfig(
                device_id=device_id,
                relay_type=relay_type,
                mode=mode,
                threshold_param=threshold_param,
                action_on_high=cfg_in.action_on_high.upper(),
                action_on_low=cfg_in.action_on_low.upper(),
                updated_by=current_user.user_id,
                updated_at=now,
            )
            db.add(new_cfg)

        updated.append(cfg_in.relay_type.upper())

    await db.commit()
    return {"status": "success", "updated": updated}


@router.post(
    "/relay-config/{device_id}/all-auto", summary="Set all relays to AUTO mode"
)
async def set_all_relays_auto(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set all relays to AUTO mode with default parameter mappings."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    now = utcnow_naive()

    for rt in RelayType:
        default_param = DEFAULT_PARAM_MAPPING.get(rt.value)
        # EXTRA has no auto param, keep it MANUAL
        mode = TriggerType.AUTO if default_param else TriggerType.MANUAL

        result = await db.execute(
            select(RelayConfig).where(
                RelayConfig.device_id == device_id,
                RelayConfig.relay_type == rt,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.mode = mode
            existing.threshold_param = default_param
            existing.action_on_high = "ON"
            existing.action_on_low = "OFF"
            existing.updated_by = current_user.user_id
            existing.updated_at = now
        else:
            db.add(
                RelayConfig(
                    device_id=device_id,
                    relay_type=rt,
                    mode=mode,
                    threshold_param=default_param,
                    action_on_high="ON",
                    action_on_low="OFF",
                    updated_by=current_user.user_id,
                    updated_at=now,
                )
            )

    await db.commit()
    return {"status": "success", "mode": "AUTO"}


@router.post(
    "/relay-config/{device_id}/all-manual", summary="Set all relays to MANUAL mode"
)
async def set_all_relays_manual(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Set all relays to MANUAL mode."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    now = utcnow_naive()

    for rt in RelayType:
        result = await db.execute(
            select(RelayConfig).where(
                RelayConfig.device_id == device_id,
                RelayConfig.relay_type == rt,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.mode = TriggerType.MANUAL
            existing.updated_by = current_user.user_id
            existing.updated_at = now
        else:
            default_param = DEFAULT_PARAM_MAPPING.get(rt.value)
            db.add(
                RelayConfig(
                    device_id=device_id,
                    relay_type=rt,
                    mode=TriggerType.MANUAL,
                    threshold_param=default_param,
                    action_on_high="ON",
                    action_on_low="OFF",
                    updated_by=current_user.user_id,
                    updated_at=now,
                )
            )

    await db.commit()
    return {"status": "success", "mode": "MANUAL"}


# ─── Relay Schedule Endpoints ─────────────────────────────────────────────────


@router.get(
    "/relay-schedule/{device_id}", summary="List all relay schedules for a device"
)
async def get_relay_schedules(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all relay schedules for a device."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    result = await db.execute(
        select(RelaySchedule).where(RelaySchedule.device_id == device_id)
    )
    schedules = result.scalars().all()

    return {
        "schedules": [
            RelayScheduleResponse(
                schedule_id=s.schedule_id,
                relay_type=s.relay_type.value,
                days_of_week=s.days_of_week,
                time_on=s.time_on,
                time_off=s.time_off,
                is_active=s.is_active,
            ).model_dump()
            for s in schedules
        ]
    }


@router.post(
    "/relay-schedule/{device_id}", summary="Create a relay schedule for a device"
)
async def create_relay_schedule(
    device_id: int,
    schedule_in: RelayScheduleCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new relay schedule for a device."""
    await _verify_device_ownership(db, device_id, current_user.owner_id)

    # Validate relay_type
    try:
        relay_type = RelayType(schedule_in.relay_type.upper())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid relay_type: {schedule_in.relay_type}",
        )

    # Validate time format
    for time_str in [schedule_in.time_on, schedule_in.time_off]:
        parts = time_str.split(":")
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time format: {time_str}. Use HH:MM",
            )
        if int(parts[0]) > 23 or int(parts[1]) > 59:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid time value: {time_str}",
            )

    schedule = RelaySchedule(
        device_id=device_id,
        relay_type=relay_type,
        days_of_week=schedule_in.days_of_week,
        time_on=schedule_in.time_on,
        time_off=schedule_in.time_off,
        is_active=True,
        created_by=current_user.user_id,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return {
        "status": "success",
        "schedule": RelayScheduleResponse(
            schedule_id=schedule.schedule_id,
            relay_type=schedule.relay_type.value,
            days_of_week=schedule.days_of_week,
            time_on=schedule.time_on,
            time_off=schedule.time_off,
            is_active=schedule.is_active,
        ).model_dump(),
    }


@router.put("/relay-schedule/{schedule_id}", summary="Update a relay schedule")
async def update_relay_schedule(
    schedule_id: int,
    schedule_in: RelayScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing relay schedule."""
    result = await db.execute(
        select(RelaySchedule).where(RelaySchedule.schedule_id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found"
        )

    # Verify ownership
    await _verify_device_ownership(db, schedule.device_id, current_user.owner_id)

    if schedule_in.days_of_week is not None:
        schedule.days_of_week = schedule_in.days_of_week
    if schedule_in.time_on is not None:
        schedule.time_on = schedule_in.time_on
    if schedule_in.time_off is not None:
        schedule.time_off = schedule_in.time_off
    if schedule_in.is_active is not None:
        schedule.is_active = schedule_in.is_active

    await db.commit()
    await db.refresh(schedule)

    return {
        "status": "success",
        "schedule": RelayScheduleResponse(
            schedule_id=schedule.schedule_id,
            relay_type=schedule.relay_type.value,
            days_of_week=schedule.days_of_week,
            time_on=schedule.time_on,
            time_off=schedule.time_off,
            is_active=schedule.is_active,
        ).model_dump(),
    }


@router.delete("/relay-schedule/{schedule_id}", summary="Delete a relay schedule")
async def delete_relay_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a relay schedule."""
    result = await db.execute(
        select(RelaySchedule).where(RelaySchedule.schedule_id == schedule_id)
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found"
        )

    # Verify ownership
    await _verify_device_ownership(db, schedule.device_id, current_user.owner_id)

    await db.execute(
        delete(RelaySchedule).where(RelaySchedule.schedule_id == schedule_id)
    )
    await db.commit()

    return {"status": "success"}
