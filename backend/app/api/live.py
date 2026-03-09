import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis

from app.database import get_db
from app.redis_client import get_redis
from app.models.user import User
from app.models.device import Device
from app.models.relay_status import RelayStatus
from app.models.plant import Plant
from app.models.room import Room
from app.models.enums import RelayType, TriggerType
from app.schemas.relay import RelayCommand
from app.api.deps import get_current_user
from app.services.ws_manager import ws_manager

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


@router.get("/readings")
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


@router.get("/readings/device/{device_id}")
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


@router.get("/readings/room/{room_id}")
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


@router.get("/relay/{device_id}")
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


@router.post("/relay/{device_id}")
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

    now = datetime.utcnow()

    # If device uses MQTT, publish relay command via MQTT instead of Redis polling
    if device.communication_mode.value == "MQTT" if device.communication_mode else False:
        try:
            from app.services.mqtt_client import mqtt_manager

            await mqtt_manager.publish_relay_command(
                device.license_key, command.relay_type, command.state
            )
        except Exception:
            pass  # Fall through to Redis as backup

    # Write command to Redis with 30s TTL
    cmd_data = json.dumps(
        {"relay_type": command.relay_type, "state": command.state}
    )
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
