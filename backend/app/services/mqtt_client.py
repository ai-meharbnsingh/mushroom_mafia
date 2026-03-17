import asyncio
import json
import logging
from datetime import datetime, timezone

import aiomqtt

from app.config import settings
from app.utils.time import utcnow_naive

logger = logging.getLogger(__name__)


class MQTTManager:
    def __init__(self):
        self._client = None
        self._running = False

    async def start(self):
        """Start MQTT client -- subscribe to device topics."""
        self._running = True

        tls_context = None
        if getattr(settings, "MQTT_USE_TLS", False):
            import ssl

            tls_context = ssl.create_default_context()

        while self._running:
            try:
                async with aiomqtt.Client(
                    hostname=settings.MQTT_BROKER_HOST,
                    port=settings.MQTT_BROKER_PORT,
                    username=settings.MQTT_USERNAME,
                    password=settings.MQTT_PASSWORD,
                    tls_context=tls_context,
                ) as client:
                    self._client = client
                    logger.info(
                        "MQTT connected to %s:%s",
                        settings.MQTT_BROKER_HOST,
                        settings.MQTT_BROKER_PORT,
                    )

                    # Subscribe to all device topics
                    await client.subscribe("device/+/telemetry")
                    await client.subscribe("device/+/status")
                    await client.subscribe("device/+/relay_ack")

                    async for message in client.messages:
                        await self._handle_message(message)
            except aiomqtt.MqttError as e:
                if self._running:
                    logger.warning("MQTT disconnected: %s. Reconnecting in 5s...", e)
                    from app.middleware.metrics import record_metric

                    await record_metric("mqtt_reconnects", 1)
                    await asyncio.sleep(5)
            except Exception as e:
                if self._running:
                    logger.error("MQTT error: %s. Reconnecting in 5s...", e)
                    from app.middleware.metrics import record_metric

                    await record_metric("mqtt_reconnects", 1)
                    await asyncio.sleep(5)

    async def stop(self):
        self._running = False
        self._client = None

    async def _handle_message(self, message):
        """Process incoming MQTT messages."""
        topic = str(message.topic)
        try:
            # ESP32 may produce "nan" or "inf" for failed sensor reads — replace with null
            raw = message.payload.decode()
            raw = raw.replace(":nan", ":null").replace(":-nan", ":null")
            raw = raw.replace(":inf", ":null").replace(":-inf", ":null")
            payload = json.loads(raw)
        except (json.JSONDecodeError, UnicodeDecodeError):
            logger.warning(
                "Invalid MQTT payload on %s: %s", topic, message.payload[:200]
            )
            return

        parts = topic.split("/")
        if len(parts) < 3:
            return

        license_key = parts[1]
        msg_type = parts[2]

        if msg_type == "telemetry":
            await self._handle_telemetry(license_key, payload)
        elif msg_type == "status":
            await self._handle_status(license_key, payload)
        elif msg_type == "relay_ack":
            await self._handle_relay_ack(license_key, payload)

    async def _handle_telemetry(self, license_key: str, data: dict):
        """Process telemetry from device -- store in Redis + DB + WebSocket push."""
        # Import here to avoid circular imports
        from app.database import async_session_factory
        from app.redis_client import redis_client
        from app.models.device import Device
        from app.services.reading_service import process_reading
        from app.services.ws_manager import ws_manager
        from app.middleware.metrics import record_metric
        from sqlalchemy import select

        await record_metric("telemetry_messages", 1)

        try:
            async with async_session_factory() as db:
                result = await db.execute(
                    select(Device).where(Device.license_key == license_key)
                )
                device = result.scalar_one_or_none()
                if not device:
                    logger.warning("Unknown device: %s", license_key)
                    return

                # Update device status
                device.is_online = True
                device.last_seen = utcnow_naive()
                if "wifi_rssi" in data:
                    device.wifi_rssi = data["wifi_rssi"]
                if "free_heap" in data:
                    device.free_heap = data["free_heap"]
                if "device_ip" in data:
                    device.device_ip = data["device_ip"]

                await db.commit()

                # Process reading if sensor data present
                if "co2_ppm" in data or "room_temp" in data:
                    if redis_client:
                        await process_reading(
                            db=db,
                            redis=redis_client,
                            device=device,
                            data=data,
                            ws_manager=ws_manager,
                        )
        except Exception as e:
            logger.error("Error processing telemetry from %s: %s", license_key, e)

    async def _handle_status(self, license_key: str, data: dict):
        """Handle LWT / status messages (device offline)."""
        from app.database import async_session_factory
        from app.models.device import Device
        from sqlalchemy import select

        try:
            status = data.get("status", "").lower()
            if status == "offline":
                async with async_session_factory() as db:
                    result = await db.execute(
                        select(Device).where(Device.license_key == license_key)
                    )
                    device = result.scalar_one_or_none()
                    if device:
                        device.is_online = False
                        await db.commit()
                        logger.info("Device %s went offline (LWT)", license_key)
        except Exception as e:
            logger.error("Error handling status from %s: %s", license_key, e)

    async def _handle_relay_ack(self, license_key: str, data: dict):
        """Handle relay ACK from device — confirms relay state was applied.

        Updates Redis live relay state and pushes WebSocket notification
        so the dashboard reflects the confirmed state immediately.
        """
        from app.database import async_session_factory
        from app.redis_client import redis_client
        from app.models.device import Device
        from app.models.plant import Plant
        from app.models.room import Room
        from app.services.ws_manager import ws_manager
        from app.middleware.metrics import record_metric
        from sqlalchemy import select

        await record_metric("relay_acks", 1)

        relay_type = data.get("relay_type", "")
        state = data.get("state", "")
        ack_status = data.get("status", "")

        if ack_status != "confirmed":
            logger.warning(
                "Relay ACK from %s with non-confirmed status: %s",
                license_key,
                ack_status,
            )
            return

        try:
            async with async_session_factory() as db:
                result = await db.execute(
                    select(Device).where(Device.license_key == license_key)
                )
                device = result.scalar_one_or_none()
                if not device:
                    logger.warning("Relay ACK from unknown device: %s", license_key)
                    return

                # Update Redis live relay state
                if redis_client:
                    import json as _json

                    key = f"live:relay:{device.device_id}"
                    raw = await redis_client.get(key)
                    relay_states = _json.loads(raw) if raw else {}
                    relay_states[relay_type.lower()] = state == "ON"
                    await redis_client.setex(key, 300, _json.dumps(relay_states))

                # Push WebSocket notification to device owner
                if device.room_id:
                    ownership = await db.execute(
                        select(Plant.owner_id)
                        .join(Room, Room.plant_id == Plant.plant_id)
                        .where(Room.room_id == device.room_id)
                    )
                    owner_id = ownership.scalar_one_or_none()
                    if owner_id:
                        await ws_manager.broadcast_to_owner(
                            owner_id,
                            "relay_ack",
                            {
                                "device_id": device.device_id,
                                "relay_type": relay_type,
                                "state": state,
                                "status": "confirmed",
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            },
                        )

                logger.info(
                    "Relay ACK: device %s (%s) confirmed %s -> %s",
                    device.device_id,
                    license_key,
                    relay_type,
                    state,
                )
        except Exception as e:
            logger.error("Error handling relay ACK from %s: %s", license_key, e)

    async def publish_control(self, license_key: str, action: str):
        """Publish control command (kill-switch) to a device."""
        if self._client:
            topic = f"device/{license_key}/control"
            payload = json.dumps({"action": action})
            await self._client.publish(topic, payload)
            logger.info("Published %s to %s", action, topic)
        else:
            logger.warning("MQTT not connected -- cannot publish to %s", license_key)

    async def publish_relay_command(
        self, license_key: str, relay_type: str, state: str
    ):
        """Publish relay command to a device via MQTT."""
        if self._client:
            topic = f"device/{license_key}/commands"
            payload = json.dumps({"relay_type": relay_type, "state": state})
            await self._client.publish(topic, payload)

    async def publish_config_update(self, license_key: str, thresholds: dict):
        """Publish threshold config update to a device via MQTT.

        The firmware subscribes to device/{licenseKey}/config and updates
        EEPROM values (co2_min, temp_min, humidity_min, etc.) in real time.
        """
        if self._client:
            topic = f"device/{license_key}/config"
            payload = json.dumps(thresholds)
            await self._client.publish(topic, payload)
            logger.info("Published config update to %s: %s", topic, thresholds)
        else:
            logger.warning(
                "MQTT not connected -- cannot publish config to %s",
                license_key,
            )


mqtt_manager = MQTTManager()
