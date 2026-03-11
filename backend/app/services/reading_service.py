import json
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis

from app.models import RoomReading, Device, Threshold, Alert, RelayStatus, Room, Plant
from app.models.enums import AlertType, Severity, ThresholdParameter, RelayType, TriggerType
from app.services.relay_automation import evaluate_auto_relays


async def process_reading(
    db: AsyncSession, redis: Redis, device: Device, data: dict, ws_manager
) -> int:
    """Process a sensor reading: store in Redis + PostgreSQL, check thresholds, push via WebSocket."""

    now = datetime.utcnow()

    # 1. Build room_reading record
    reading = RoomReading(
        device_id=device.device_id,
        room_id=device.room_id,
        co2_ppm=data.get("co2_ppm"),
        room_temp=data.get("room_temp"),
        room_humidity=data.get("room_humidity"),
        outdoor_temp=data.get("outdoor_temp"),
        outdoor_humidity=data.get("outdoor_humidity"),
        recorded_at=now,
    )
    # Map bag_temps list to bag_temp_1..10 columns
    bag_temps = data.get("bag_temps", []) or []
    for i, temp in enumerate(bag_temps[:10]):
        setattr(reading, f"bag_temp_{i + 1}", temp)

    db.add(reading)
    await db.flush()

    # 2. Store relay states if provided
    relay_states = data.get("relay_states", {}) or {}
    for relay_type_str, state in relay_states.items():
        db.add(
            RelayStatus(
                device_id=device.device_id,
                relay_type=RelayType(relay_type_str.upper()),
                state=state,
                trigger_type=TriggerType.AUTO,
                changed_at=now,
            )
        )

    # 3. Update device last_seen
    device.is_online = True
    device.last_seen = now

    await db.commit()
    await db.refresh(reading)

    # 4. Write to Redis
    live_data = {
        "device_id": device.device_id,
        "room_id": device.room_id,
        "co2_ppm": data.get("co2_ppm"),
        "room_temp": float(data.get("room_temp", 0) or 0),
        "room_humidity": float(data.get("room_humidity", 0) or 0),
        "bag_temps": bag_temps,
        "outdoor_temp": float(data.get("outdoor_temp", 0) or 0),
        "outdoor_humidity": float(data.get("outdoor_humidity", 0) or 0),
        "relay_states": relay_states,
        "timestamp": now.isoformat(),
    }
    await redis.setex(
        f"live:device:{device.device_id}", 60, json.dumps(live_data, default=str)
    )
    if device.room_id:
        await redis.setex(
            f"live:room:{device.room_id}", 60, json.dumps(live_data, default=str)
        )
    await redis.setex(
        f"live:relay:{device.device_id}", 60, json.dumps(relay_states, default=str)
    )

    # 5. Check thresholds and create alerts
    if device.room_id:
        await check_thresholds(db, redis, device, data, now, ws_manager)

    # 5b. Evaluate relay automation (AUTO mode relays)
    if device.room_id:
        try:
            from app.services.mqtt_client import mqtt_manager

            await evaluate_auto_relays(
                db=db,
                redis=redis,
                device=device,
                reading_data=data,
                mqtt_manager=mqtt_manager,
                ws_manager=ws_manager,
            )
        except Exception:
            import logging
            logging.getLogger(__name__).error(
                "Error evaluating auto relays for device %d", device.device_id, exc_info=True
            )

    # 6. Push via WebSocket
    if ws_manager and device.room_id:
        result = await db.execute(
            select(Plant.owner_id)
            .join(Room, Room.plant_id == Plant.plant_id)
            .where(Room.room_id == device.room_id)
        )
        owner_id = result.scalar_one_or_none()
        if owner_id:
            await ws_manager.broadcast_to_owner(owner_id, "sensor_update", live_data)

    return reading.reading_id


async def check_thresholds(db, redis, device, data, now, ws_manager):
    """Check sensor values against room thresholds and create alerts if violated."""

    result = await db.execute(
        select(Threshold).where(
            Threshold.room_id == device.room_id, Threshold.is_active == True
        )
    )
    thresholds = result.scalars().all()

    for threshold in thresholds:
        value = None
        alert_type_high = None
        alert_type_low = None

        if threshold.parameter == ThresholdParameter.CO2:
            value = data.get("co2_ppm")
            alert_type_high = AlertType.CO2_HIGH
            alert_type_low = AlertType.CO2_LOW
        elif threshold.parameter == ThresholdParameter.TEMPERATURE:
            value = data.get("room_temp")
            alert_type_high = AlertType.TEMP_HIGH
            alert_type_low = AlertType.TEMP_LOW
        elif threshold.parameter == ThresholdParameter.HUMIDITY:
            value = data.get("room_humidity")
            alert_type_high = AlertType.HUMIDITY_HIGH
            alert_type_low = AlertType.HUMIDITY_LOW

        if value is None:
            continue

        value = float(value)
        max_val = float(threshold.max_value) if threshold.max_value else None
        min_val = float(threshold.min_value) if threshold.min_value else None

        alert_type = None
        threshold_val = None

        if max_val is not None and value > max_val:
            alert_type = alert_type_high
            threshold_val = max_val
        elif min_val is not None and value < min_val:
            alert_type = alert_type_low
            threshold_val = min_val

        if alert_type:
            # Check if there's already an unresolved alert of same type for this device
            existing = await db.execute(
                select(Alert).where(
                    Alert.device_id == device.device_id,
                    Alert.alert_type == alert_type,
                    Alert.is_resolved == False,
                )
            )
            if existing.scalar_one_or_none():
                continue  # Don't duplicate alerts

            hysteresis_val = float(threshold.hysteresis or 0)
            severity = (
                Severity.CRITICAL
                if abs(value - threshold_val) > hysteresis_val * 2
                else Severity.WARNING
            )

            alert = Alert(
                device_id=device.device_id,
                room_id=device.room_id,
                alert_type=alert_type,
                severity=severity,
                parameter=threshold.parameter.value,
                current_value=value,
                threshold_value=threshold_val,
                message=f"{threshold.parameter.value} level {value} exceeds threshold {threshold_val}",
            )
            db.add(alert)
            await db.commit()
            await db.refresh(alert)

            # WebSocket push alert
            if ws_manager:
                result2 = await db.execute(
                    select(Plant.owner_id)
                    .join(Room, Room.plant_id == Plant.plant_id)
                    .where(Room.room_id == device.room_id)
                )
                owner_id = result2.scalar_one_or_none()
                if owner_id:
                    await ws_manager.broadcast_to_owner(
                        owner_id,
                        "alert_created",
                        {
                            "alert_id": alert.alert_id,
                            "device_id": alert.device_id,
                            "room_id": alert.room_id,
                            "alert_type": alert.alert_type.value,
                            "severity": alert.severity.value,
                            "parameter": alert.parameter,
                            "current_value": float(alert.current_value),
                            "threshold_value": float(alert.threshold_value),
                            "message": alert.message,
                            "created_at": (
                                alert.created_at.isoformat()
                                if alert.created_at
                                else now.isoformat()
                            ),
                        },
                    )
