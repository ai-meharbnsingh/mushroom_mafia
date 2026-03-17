import logging
import time
from collections import defaultdict

from fastapi import Depends, Header, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.device import Device
from app.models.enums import SubscriptionStatus
from app.utils.security import decode_token

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# In-memory rate limit fallback when Redis is unavailable.
# Key: (client_ip, route), Value: list of request timestamps.
_memory_rate_limits: dict[tuple[str, str], list[float]] = defaultdict(list)


def safe_rate_limit(times: int = 5, seconds: int = 60):
    """Rate limiter with in-memory fallback when Redis is unavailable."""

    async def _dependency(request: Request):
        try:
            from fastapi_limiter.depends import RateLimiter

            limiter = RateLimiter(times=times, seconds=seconds)
            await limiter(request)
        except HTTPException:
            raise  # Re-raise 429 Too Many Requests
        except Exception:
            # Redis unavailable — use in-memory fallback
            client_ip = request.client.host if request.client else "unknown"
            key = (client_ip, request.url.path)
            now = time.monotonic()
            # Purge expired entries
            _memory_rate_limits[key] = [
                t for t in _memory_rate_limits[key] if now - t < seconds
            ]
            if len(_memory_rate_limits[key]) >= times:
                logger.warning(
                    "In-memory rate limit hit for %s on %s", client_ip, request.url.path
                )
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests",
                )
            _memory_rate_limits[key].append(now)
            logger.debug("Rate limiter using in-memory fallback (Redis unavailable)")

    return _dependency


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract user from JWT token from Bearer header or cookie, enforce CSRF for cookie auth."""
    # Prefer Bearer token (from Authorization header) — CSRF-immune
    token = None
    using_bearer = False
    if credentials:
        token = credentials.credentials
        using_bearer = True

    # Fall back to cookie-based auth
    if not token:
        token = request.cookies.get("access_token")

    # CSRF only needed for cookie-based auth (Bearer tokens are CSRF-immune)
    if not using_bearer and request.method in ["POST", "PUT", "DELETE", "PATCH"]:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("x-csrf-token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="CSRF token missing or invalid",
            )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
        )
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    result = await db.execute(
        select(User).where(User.user_id == int(user_id), User.is_active == True)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return user


def require_roles(*roles):
    """Dependency factory for role-based access."""

    async def check_role(current_user: User = Depends(get_current_user)):
        if current_user.role.value not in [
            r.value if hasattr(r, "value") else r for r in roles
        ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return check_role


async def verify_device_key(
    x_device_id: int = Header(...),
    x_device_key: str = Header(...),
    db: AsyncSession = Depends(get_db),
) -> Device:
    """Verify ESP32 device credentials from headers.

    Validates license_key + device_id match AND subscription is ACTIVE.
    Accepts license_key in X-Device-Key header (backward compat with old secret_key).
    """
    result = await db.execute(
        select(Device).where(
            Device.device_id == x_device_id,
            Device.license_key == x_device_key,
            Device.is_active == True,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device credentials",
        )
    if device.subscription_status not in (
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.PENDING,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Device subscription is {device.subscription_status.value}",
        )
    return device
