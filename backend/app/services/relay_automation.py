import json
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis

from app.models.relay_config import RelayConfig
from app.models.threshold import Threshold
from app.utils.time import utcnow_naive
from app.models.relay_status import RelayStatus
from app.models.device import Device
from app.models.room import Room
from app.models.plant import Plant
from app.models.enums import (
    RelayType, TriggerType, ThresholdParameter,
)

logger = logging.getLogger(__name__)

# Default mapping: which ThresholdParameter drives each RelayType in AUTO mode
DEFAULT_PARAM_MAPPING: dict[str, ThresholdParameter | None] = {
    RelayType.CO2.value: ThresholdParameter.CO2,
    RelayType.HUMIDITY.value: ThresholdParameter.HUMIDITY,
    RelayType.TEMPERATURE.value: ThresholdParameter.TEMPERATURE,
    RelayType.AHU.value: ThresholdParameter.TEMPERATURE,
    RelayType.HUMIDIFIER.value: ThresholdParameter.HUMIDITY,
    RelayType.DUCT_FAN.value: ThresholdParameter.CO2,
    RelayType.EXTRA.value: None,  # EXTRA has no default auto param
}


def _get_sensor_value(reading_data: dict, param: ThresholdParameter) -> float | None:
    """Extract the sensor value from reading data for the given threshold parameter."""
    if param == ThresholdParameter.CO2:
        val = reading_data.get("co2_ppm")
    elif param == ThresholdParameter.TEMPERATURE:
        val = reading_data.get("room_temp")
    elif param == ThresholdParameter.HUMIDITY:
        val = reading_data.get("room_humidity")
    else:
        return None

    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


def _should_change_relay(
    current_value: float,
    min_val: float | None,
    max_val: float | None,
    hysteresis: float,
    action_on_high: str,
    action_on_low: str,
    current_state: bool | None,
) -> bool | None:
    """Determine desired relay state based on thresholds with hysteresis.

    Returns True (ON), False (OFF), or None (no change needed).
    Uses hysteresis to prevent flapping:
      - To trigger ON: value must exceed threshold by full amount
      - To turn OFF: value must come back within (threshold - hysteresis)
    """
    desired_on_high = action_on_high.upper() == "ON"
    desired_on_low = action_on_low.upper() == "ON"

    if max_val is not None and current_value > max_val:
        # Value is above max threshold
        new_state = desired_on_high
        if current_state == new_state:
            return None  # already in correct state
        return new_state

    if min_val is not None and current_value < min_val:
        # Value is below min threshold
        new_state = desired_on_low
        if current_state == new_state:
            return None  # already in correct state
        return new_state

    # Value is within range -- check hysteresis zone for returning to normal
    if current_state is not None:
        # If value was high and is now within (max - hysteresis), allow state change
        if max_val is not None and current_value <= (max_val - hysteresis):
            # Value has come back well within range -- return to opposite of action_on_high
            opposite = not desired_on_high
            if current_state == opposite:
                return None
            return opposite

        # If value was low and is now above (min + hysteresis), allow state change
        if min_val is not None and current_value >= (min_val + hysteresis):
            opposite = not desired_on_low
            if current_state == opposite:
                return None
            return opposite

    return None  # No change


async def _get_current_relay_state(redis: Redis, device_id: int, relay_type: str) -> bool | None:
    """Get the current relay state from Redis."""
    raw = await redis.get(f"live:relay:{device_id}")
    if not raw:
        return None
    try:
        states = json.loads(raw)
        state = states.get(relay_type.lower()) or states.get(relay_type.upper())
        if state is not None:
            return bool(state)
    except (json.JSONDecodeError, TypeError):
        pass
    return None


async def evaluate_auto_relays(
    db: AsyncSession,
    redis: Redis,
    device: Device,
    reading_data: dict,
    mqtt_manager,
    ws_manager=None,
):
    """Check all relays in AUTO mode for this device and issue commands based on thresholds.

    Called after every telemetry reading is processed.
    """
    if not device.room_id:
        return  # No room assigned, no thresholds to check

    # 1. Get all relay configs for this device where mode = AUTO
    result = await db.execute(
        select(RelayConfig).where(
            RelayConfig.device_id == device.device_id,
            RelayConfig.mode == TriggerType.AUTO,
        )
    )
    auto_configs = result.scalars().all()

    if not auto_configs:
        return  # No relays in AUTO mode

    # 2. Get all thresholds for this device's room
    result = await db.execute(
        select(Threshold).where(
            Threshold.room_id == device.room_id,
            Threshold.is_active == True,
        )
    )
    thresholds = result.scalars().all()

    # Build threshold lookup by parameter
    threshold_map: dict[str, Threshold] = {}
    for t in thresholds:
        threshold_map[t.parameter.value] = t

    now = utcnow_naive()

    for config in auto_configs:
        if not config.threshold_param:
            continue  # No parameter linked, skip

        param = config.threshold_param  # ThresholdParameter enum
        threshold = threshold_map.get(param.value)
        if not threshold:
            continue  # No threshold configured for this parameter

        # Get current sensor value
        sensor_value = _get_sensor_value(reading_data, param)
        if sensor_value is None:
            continue  # No reading for this parameter

        # Get current relay state from Redis
        current_state = await _get_current_relay_state(
            redis, device.device_id, config.relay_type.value
        )

        max_val = float(threshold.max_value) if threshold.max_value else None
        min_val = float(threshold.min_value) if threshold.min_value else None
        hysteresis = float(threshold.hysteresis or 0)

        # Determine if relay state should change
        new_state = _should_change_relay(
            current_value=sensor_value,
            min_val=min_val,
            max_val=max_val,
            hysteresis=hysteresis,
            action_on_high=config.action_on_high,
            action_on_low=config.action_on_low,
            current_state=current_state,
        )

        if new_state is None:
            continue  # No state change needed

        relay_type_str = config.relay_type.value
        logger.info(
            "AUTO relay %s on device %d: %s -> %s (sensor=%s, value=%.1f, min=%s, max=%s)",
            relay_type_str,
            device.device_id,
            current_state,
            new_state,
            param.value,
            sensor_value,
            min_val,
            max_val,
        )

        # Publish MQTT command if device uses MQTT
        if device.communication_mode and device.communication_mode.value == "MQTT":
            try:
                await mqtt_manager.publish_relay_command(
                    device.license_key, relay_type_str, new_state
                )
            except Exception as e:
                logger.error("Failed to publish MQTT relay command: %s", e)

        # Write command to Redis for HTTP-polling devices
        cmd_data = json.dumps({"relay_type": relay_type_str, "state": new_state})
        await redis.setex(f"command:relay:{device.device_id}", 30, cmd_data)

        # Update relay state in Redis
        raw = await redis.get(f"live:relay:{device.device_id}")
        relay_states = json.loads(raw) if raw else {}
        relay_states[relay_type_str] = new_state
        await redis.setex(
            f"live:relay:{device.device_id}", 60, json.dumps(relay_states, default=str)
        )

        # Log to PostgreSQL relay_status table
        relay_status = RelayStatus(
            device_id=device.device_id,
            relay_type=RelayType(relay_type_str),
            state=new_state,
            trigger_type=TriggerType.AUTO,
            trigger_value=sensor_value,
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
                    "relay_auto",
                    {
                        "device_id": device.device_id,
                        "relay_type": relay_type_str,
                        "state": new_state,
                        "trigger_type": "AUTO",
                        "sensor_param": param.value,
                        "sensor_value": sensor_value,
                        "timestamp": now.isoformat(),
                    },
                )
