import asyncio
import json
import logging
from datetime import datetime

import aiomqtt

from app.config import settings

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
            tls_context = ssl.create_default_context(cafile=settings.MQTT_CA_CERTS)

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

                    async for message in client.messages:
                        await self._handle_message(message)
            except aiomqtt.MqttError as e:
                if self._running:
                    logger.warning(
                        "MQTT disconnected: %s. Reconnecting in 5s...", e
                    )
                    await asyncio.sleep(5)
            except Exception as e:
                if self._running:
                    logger.error(
                        "MQTT error: %s. Reconnecting in 5s...", e
                    )
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
            logger.warning("Invalid MQTT payload on %s: %s", topic, message.payload[:200])
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

    async def _handle_telemetry(self, license_key: str, data: dict):
        """Process telemetry from device -- store in Redis + DB + WebSocket push."""
        # Import here to avoid circular imports
        from app.database import async_session_factory
        from app.redis_client import redis_client
        from app.models.device import Device
        from app.services.reading_service import process_reading
        from app.services.ws_manager import ws_manager
        from sqlalchemy import select

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
                device.last_seen = datetime.utcnow()
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
            logger.error(
                "Error processing telemetry from %s: %s", license_key, e
            )

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
                        select(Device).where(
                            Device.license_key == license_key
                        )
                    )
                    device = result.scalar_one_or_none()
                    if device:
                        device.is_online = False
                        await db.commit()
                        logger.info(
                            "Device %s went offline (LWT)", license_key
                        )
        except Exception as e:
            logger.error(
                "Error handling status from %s: %s", license_key, e
            )

    async def publish_control(self, license_key: str, action: str):
        """Publish control command (kill-switch) to a device."""
        if self._client:
            topic = f"device/{license_key}/control"
            payload = json.dumps({"action": action})
            await self._client.publish(topic, payload)
            logger.info("Published %s to %s", action, topic)
        else:
            logger.warning(
                "MQTT not connected -- cannot publish to %s", license_key
            )

    async def publish_relay_command(
        self, license_key: str, relay_type: str, state: str
    ):
        """Publish relay command to a device via MQTT."""
        if self._client:
            topic = f"device/{license_key}/commands"
            payload = json.dumps(
                {"relay_type": relay_type, "state": state}
            )
            await self._client.publish(topic, payload)

    async def publish_config_update(
        self, license_key: str, thresholds: dict
    ):
        """Publish threshold config update to a device via MQTT.

        The firmware subscribes to device/{licenseKey}/config and updates
        EEPROM values (co2_min, temp_min, humidity_min, etc.) in real time.
        """
        if self._client:
            topic = f"device/{license_key}/config"
            payload = json.dumps(thresholds)
            await self._client.publish(topic, payload)
            logger.info(
                "Published config update to %s: %s", topic, thresholds
            )
        else:
            logger.warning(
                "MQTT not connected -- cannot publish config to %s",
                license_key,
            )

    async def publish_broadcast_control(self, action: str):
        """Broadcast control to ALL devices."""
        if self._client:
            topic = "farm/broadcast/control"
            payload = json.dumps({"action": action})
            await self._client.publish(topic, payload)


mqtt_manager = MQTTManager()
