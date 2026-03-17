"""Health check endpoints for monitoring and observability."""

import asyncio
import logging
import sys
import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select, text, func

from app.api.deps import get_current_user, require_roles
from app.database import async_session_factory
from app.models.enums import UserRole
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


async def _check_db() -> dict:
    """Check database connectivity with a 2s timeout."""
    start = time.perf_counter()
    try:
        async with async_session_factory() as session:
            await asyncio.wait_for(
                session.execute(text("SELECT 1")),
                timeout=2.0,
            )
        latency = (time.perf_counter() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency, 2)}
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return {"status": "unhealthy", "latency_ms": round(latency, 2), "error": str(e)}


async def _check_redis() -> dict:
    """Check Redis connectivity with a 1s timeout."""
    from app.redis_client import redis_client

    start = time.perf_counter()
    if redis_client is None:
        return {"status": "unavailable", "latency_ms": 0}
    try:
        await asyncio.wait_for(redis_client.ping(), timeout=1.0)
        latency = (time.perf_counter() - start) * 1000
        return {"status": "healthy", "latency_ms": round(latency, 2)}
    except Exception as e:
        latency = (time.perf_counter() - start) * 1000
        return {"status": "unhealthy", "latency_ms": round(latency, 2), "error": str(e)}


def _check_mqtt() -> dict:
    """Check if MQTT client is connected (non-blocking)."""
    from app.services.mqtt_client import mqtt_manager

    connected = mqtt_manager._client is not None
    return {"status": "healthy" if connected else "disconnected"}


@router.get("/health")
async def health_check():
    """Basic health check for Railway health probes (no auth).

    Returns healthy/degraded/unhealthy based on DB, Redis, and MQTT status.
    """
    db_status, redis_status = await asyncio.gather(_check_db(), _check_redis())
    mqtt_status = _check_mqtt()

    db_ok = db_status["status"] == "healthy"
    redis_ok = redis_status["status"] == "healthy"
    mqtt_ok = mqtt_status["status"] == "healthy"

    if db_ok and redis_ok and mqtt_ok:
        overall = "healthy"
    elif db_ok:
        overall = "degraded"
    else:
        overall = "unhealthy"

    return {
        "status": overall,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/detailed")
async def health_detailed(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Detailed health check with latencies and device counts (requires auth)."""
    from app.models.device import Device

    db_status, redis_status = await asyncio.gather(_check_db(), _check_redis())
    mqtt_status = _check_mqtt()

    # Device counts
    device_counts = {"total_active": 0, "online": 0, "offline": 0}
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(
                    func.count(Device.device_id).label("total"),
                    func.count(Device.device_id)
                    .filter(Device.is_online == True)
                    .label("online"),
                ).where(Device.is_active == True)
            )
            row = result.one()
            device_counts["total_active"] = row.total
            device_counts["online"] = row.online
            device_counts["offline"] = row.total - row.online
    except Exception:
        pass

    # Uptime
    startup_time = getattr(request.app.state, "startup_time", None)
    uptime_seconds = None
    if startup_time:
        uptime_seconds = round(
            (datetime.now(timezone.utc) - startup_time).total_seconds(), 1
        )

    return {
        "status": "healthy" if db_status["status"] == "healthy" else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": {
            "database": db_status,
            "redis": redis_status,
            "mqtt": mqtt_status,
        },
        "devices": device_counts,
        "uptime_seconds": uptime_seconds,
        "python_version": sys.version,
        "app_version": request.app.version,
    }


@router.get("/health/metrics")
async def health_metrics(
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN)),
):
    """Raw platform metrics from Redis counters (SUPER_ADMIN only)."""
    from app.redis_client import redis_client

    metrics: dict = {
        "telemetry_messages_total": 0,
        "mqtt_reconnects": 0,
        "relay_acks": 0,
        "api_requests": {},
        "active_alerts": 0,
    }

    if redis_client is None:
        return metrics

    try:
        # Telemetry counter
        val = await redis_client.get("metrics:telemetry_messages")
        metrics["telemetry_messages_total"] = int(val) if val else 0

        # MQTT reconnects
        val = await redis_client.get("metrics:mqtt_reconnects")
        metrics["mqtt_reconnects"] = int(val) if val else 0

        # Relay acks
        val = await redis_client.get("metrics:relay_acks")
        metrics["relay_acks"] = int(val) if val else 0

        # API request counters — scan for metrics:api:requests:* keys
        cursor = "0"
        api_requests: dict[str, int] = {}
        while True:
            cursor, keys = await redis_client.scan(
                cursor=cursor, match="metrics:api:requests:*", count=100
            )
            for key in keys:
                # key format: metrics:api:requests:{method}:{path}:{status}
                val = await redis_client.get(key)
                short_key = key.replace("metrics:api:requests:", "")
                api_requests[short_key] = int(val) if val else 0
            if cursor == 0 or cursor == "0":
                break
        metrics["api_requests"] = api_requests

        # Active alerts count
        try:
            async with async_session_factory() as session:
                from app.models.alert import Alert

                result = await session.execute(
                    select(func.count(Alert.alert_id)).where(Alert.is_resolved == False)
                )
                metrics["active_alerts"] = result.scalar() or 0
        except Exception:
            pass

    except Exception as e:
        logger.warning("Failed to read metrics from Redis: %s", e)

    return metrics
