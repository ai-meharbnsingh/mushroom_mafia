from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from redis.asyncio import Redis

from app.database import get_db
from app.redis_client import get_redis
from app.models.device import Device
from app.models.enums import SubscriptionStatus
from app.schemas.device import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    DeviceProvisioningInfo,
)
from app.schemas.reading import ReadingCreate
from app.api.deps import verify_device_key
from app.services.reading_service import process_reading
from app.services.ws_manager import ws_manager
from app.utils.security import decrypt_device_password
from app.config import settings

router = APIRouter()


@router.post("/register", response_model=DeviceRegisterResponse)
async def register_device(
    request: DeviceRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register or re-register an ESP32 device using license_key + mac_address pair.

    The device must already exist in the database with a matching license_key
    AND mac_address (pre-provisioned by a super admin). This endpoint updates
    the device's firmware_version and hardware_version.
    """
    result = await db.execute(
        select(Device).where(
            Device.license_key == request.license_key,
            Device.mac_address == request.mac_address,
            Device.is_active == True,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Device not provisioned or MAC mismatch.",
        )

    # Update device fields
    device.firmware_version = request.firmware_version
    device.hardware_version = request.hardware_version
    device.is_online = True
    device.last_seen = datetime.utcnow()

    await db.commit()
    await db.refresh(device)

    # Send WebSocket notification to super admins about new device registration
    try:
        await ws_manager.broadcast_to_owner(
            0,  # owner_id 0 = broadcast to all (super admin notification)
            "device_registered",
            {
                "device_id": device.device_id,
                "device_name": device.device_name or f"Device-{device.device_id}",
                "mac_address": device.mac_address,
                "license_key": device.license_key,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
    except Exception:
        pass  # WebSocket notification is best-effort

    return DeviceRegisterResponse(
        status="registered",
        device_id=device.device_id,
        device_name=device.device_name or f"Device-{device.device_id}",
        subscription_status=device.subscription_status.value,
    )


@router.get("/provision/{license_key}", response_model=DeviceProvisioningInfo)
async def poll_provisioning(
    license_key: str,
    db: AsyncSession = Depends(get_db),
):
    """ESP32 polls this endpoint to check provisioning status and get MQTT credentials.

    - PENDING: device awaits assignment
    - ACTIVE + device_password: returns decrypted password + MQTT broker info
    - SUSPENDED/EXPIRED: device should stop operating
    """
    result = await db.execute(
        select(Device).where(
            Device.license_key == license_key,
            Device.is_active == True,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found",
        )

    api_url = settings.API_BASE_URL

    if device.subscription_status == SubscriptionStatus.PENDING:
        return DeviceProvisioningInfo(status="pending", api_base_url=api_url)

    if device.subscription_status == SubscriptionStatus.PENDING_APPROVAL:
        return DeviceProvisioningInfo(
            status="pending_approval",
            message="Awaiting admin approval",
            api_base_url=api_url,
        )

    if (
        device.subscription_status == SubscriptionStatus.ACTIVE
        and device.device_password
    ):
        decrypted = decrypt_device_password(device.device_password)
        return DeviceProvisioningInfo(
            status="ready",
            mqtt_password=decrypted,
            mqtt_host=settings.MQTT_BROKER_HOST,
            mqtt_port=settings.MQTT_BROKER_PORT,
            device_id=device.device_id,
            api_base_url=api_url,
        )

    if device.subscription_status == SubscriptionStatus.SUSPENDED:
        return DeviceProvisioningInfo(status="suspended", api_base_url=api_url)

    if device.subscription_status == SubscriptionStatus.EXPIRED:
        return DeviceProvisioningInfo(status="expired", api_base_url=api_url)

    return DeviceProvisioningInfo(status="pending", api_base_url=api_url)


@router.post("/readings")
async def submit_reading(
    reading: ReadingCreate,
    device: Device = Depends(verify_device_key),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Submit a sensor reading from an ESP32 device.

    Requires X-Device-Id and X-Device-Key headers for authentication.
    Stores the reading in PostgreSQL and Redis, checks thresholds,
    and pushes updates via WebSocket.
    """
    reading_id = await process_reading(
        db=db,
        redis=redis,
        device=device,
        data=reading.model_dump(),
        ws_manager=ws_manager,
    )

    return {
        "status": "success",
        "reading_id": reading_id,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.post("/heartbeat")
async def device_heartbeat(
    payload: dict,
    device: Device = Depends(verify_device_key),
    db: AsyncSession = Depends(get_db),
):
    """Health check / heartbeat endpoint for ESP32 devices.

    Accepts device_ip, wifi_rssi, free_heap, and uptime_seconds.
    Updates device fields and confirms the device is online.
    """
    device.is_online = True
    device.last_seen = datetime.utcnow()

    if "device_ip" in payload:
        device.device_ip = payload["device_ip"]
    if "wifi_rssi" in payload:
        device.wifi_rssi = payload["wifi_rssi"]
    if "free_heap" in payload:
        device.free_heap = payload["free_heap"]

    await db.commit()

    return {
        "status": "success",
        "server_time": datetime.utcnow().isoformat(),
    }


@router.get("/{device_id}/commands")
async def get_device_commands(
    device_id: int,
    device: Device = Depends(verify_device_key),
    redis: Redis = Depends(get_redis),
):
    """Poll for pending relay commands for a device.

    The device must authenticate with X-Device-Id and X-Device-Key headers.
    Commands are one-time: the Redis key is deleted after reading.
    """
    import json

    # Verify the authenticated device matches the requested device_id
    if device.device_id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device ID mismatch",
        )

    key = f"command:relay:{device_id}"
    raw = await redis.get(key)
    if raw:
        await redis.delete(key)
        commands = json.loads(raw)
        # Ensure commands is a list
        if not isinstance(commands, list):
            commands = [commands]
        return {"commands": commands}

    return {"commands": []}
