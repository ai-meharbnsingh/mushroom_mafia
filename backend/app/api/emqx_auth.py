from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.device import Device
from app.models.enums import SubscriptionStatus
from app.utils.security import decrypt_device_password

router = APIRouter()


class EmqxAuthRequest(BaseModel):
    username: str  # license_key
    password: str  # device_password (plain)


class EmqxAclRequest(BaseModel):
    username: str  # license_key
    topic: str
    action: str  # "publish" or "subscribe"


@router.post("/auth")
async def emqx_authenticate(
    request: EmqxAuthRequest, db: AsyncSession = Depends(get_db)
):
    """EMQX calls this to authenticate MQTT connections.
    Username = license_key, password = device_password (plaintext)."""
    # Also allow backend_service user (for the backend MQTT client)
    from app.config import settings

    if (
        request.username == settings.MQTT_USERNAME
        and request.password == settings.MQTT_PASSWORD
    ):
        return {"result": "allow", "is_superuser": True}

    result = await db.execute(
        select(Device).where(
            Device.license_key == request.username,
            Device.is_active == True,
            Device.subscription_status.in_(
                [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING]
            ),
        )
    )
    device = result.scalar_one_or_none()
    if not device or not device.device_password:
        return {"result": "deny"}

    try:
        decrypted = decrypt_device_password(device.device_password)
        if decrypted == request.password:
            return {"result": "allow", "is_superuser": False}
    except Exception:
        pass
    return {"result": "deny"}


@router.post("/acl")
async def emqx_authorize(request: EmqxAclRequest, db: AsyncSession = Depends(get_db)):
    """EMQX calls this for topic-level ACL.
    Devices can only pub/sub to their own license_key topics."""
    from app.config import settings

    # Backend service is superuser -- allow all
    if request.username == settings.MQTT_USERNAME:
        return {"result": "allow"}

    # Device can only access device/{their_license_key}/...
    allowed_prefix = f"device/{request.username}/"
    if request.topic.startswith(allowed_prefix):
        return {"result": "allow"}
    return {"result": "deny"}
