import asyncio
import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.relay_schedule import RelaySchedule
from app.models.relay_status import RelayStatus
from app.models.device import Device
from app.models.room import Room
from app.models.plant import Plant
from app.models.enums import RelayType, TriggerType

logger = logging.getLogger(__name__)

# Map Python weekday (0=Monday) to bitmask bit position
# Monday=bit0(1), Tuesday=bit1(2), Wednesday=bit2(4), Thursday=bit3(8),
# Friday=bit4(16), Saturday=bit5(32), Sunday=bit6(64)
WEEKDAY_BITS = {0: 1, 1: 2, 2: 4, 3: 8, 4: 16, 5: 32, 6: 64}


def _is_day_active(days_of_week: int, weekday: int) -> bool:
    """Check if the given weekday is active in the bitmask."""
    bit = WEEKDAY_BITS.get(weekday, 0)
    return bool(days_of_week & bit)


def _time_str_to_minutes(time_str: str) -> int:
    """Convert 'HH:MM' to minutes since midnight."""
    parts = time_str.split(":")
    return int(parts[0]) * 60 + int(parts[1])


def _should_be_on(schedule: RelaySchedule, now: datetime) -> bool:
    """Determine if the relay should be ON based on the schedule and current time."""
    weekday = now.weekday()  # 0=Monday

    if not _is_day_active(schedule.days_of_week, weekday):
        return False

    current_minutes = now.hour * 60 + now.minute
    on_minutes = _time_str_to_minutes(schedule.time_on)
    off_minutes = _time_str_to_minutes(schedule.time_off)

    if on_minutes <= off_minutes:
        # Normal: e.g., 08:00 to 20:00
        return on_minutes <= current_minutes < off_minutes
    else:
        # Overnight: e.g., 22:00 to 06:00
        return current_minutes >= on_minutes or current_minutes < off_minutes


async def _check_schedules(db: AsyncSession):
    """Query all active schedules and issue relay commands as needed."""
    from app.redis_client import redis_client
    from app.services.mqtt_client import mqtt_manager
    from app.services.ws_manager import ws_manager

    if not redis_client:
        return

    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(RelaySchedule).where(RelaySchedule.is_active == True)
    )
    schedules = result.scalars().all()

    for schedule in schedules:
        desired_on = _should_be_on(schedule, now)
        relay_type_str = schedule.relay_type.value
        device_id = schedule.device_id

        # Get current relay state from Redis
        raw = await redis_client.get(f"live:relay:{device_id}")
        current_states = json.loads(raw) if raw else {}
        current_state = current_states.get(relay_type_str)

        # Convert to bool for comparison
        if current_state is not None:
            current_bool = bool(current_state)
        else:
            current_bool = None

        if current_bool == desired_on:
            continue  # Already in correct state

        logger.info(
            "SCHEDULE relay %s on device %d: %s -> %s (schedule_id=%d)",
            relay_type_str,
            device_id,
            current_bool,
            desired_on,
            schedule.schedule_id,
        )

        # Get device for MQTT publishing
        dev_result = await db.execute(
            select(Device).where(Device.device_id == device_id)
        )
        device = dev_result.scalar_one_or_none()
        if not device:
            continue

        # Publish MQTT command if device uses MQTT
        if device.communication_mode and device.communication_mode.value == "MQTT":
            try:
                await mqtt_manager.publish_relay_command(
                    device.license_key, relay_type_str, desired_on
                )
            except Exception as e:
                logger.error("Failed to publish MQTT schedule command: %s", e)

        # Write command to Redis for HTTP-polling devices
        cmd_data = json.dumps({"relay_type": relay_type_str, "state": desired_on})
        await redis_client.setex(f"command:relay:{device_id}", 30, cmd_data)

        # Update relay state in Redis
        current_states[relay_type_str] = desired_on
        await redis_client.setex(
            f"live:relay:{device_id}", 60, json.dumps(current_states, default=str)
        )

        # Log to PostgreSQL relay_status table
        relay_status = RelayStatus(
            device_id=device_id,
            relay_type=RelayType(relay_type_str),
            state=desired_on,
            trigger_type=TriggerType.SCHEDULE,
            changed_at=now,
        )
        db.add(relay_status)
        await db.commit()

        # Push via WebSocket
        if ws_manager and device.room_id:
            result2 = await db.execute(
                select(Plant.owner_id)
                .join(Room, Room.plant_id == Plant.plant_id)
                .where(Room.room_id == device.room_id)
            )
            owner_id = result2.scalar_one_or_none()
            if owner_id:
                await ws_manager.broadcast_to_owner(
                    owner_id,
                    "relay_schedule",
                    {
                        "device_id": device_id,
                        "relay_type": relay_type_str,
                        "state": desired_on,
                        "trigger_type": "SCHEDULE",
                        "schedule_id": schedule.schedule_id,
                        "timestamp": now.isoformat(),
                    },
                )


async def run_relay_scheduler():
    """Background task: check relay schedules every 60 seconds."""
    from app.database import async_session_factory

    logger.info("Relay scheduler started")
    while True:
        try:
            async with async_session_factory() as db:
                await _check_schedules(db)
        except Exception as e:
            logger.error("Relay scheduler error: %s", e)

        await asyncio.sleep(60)
