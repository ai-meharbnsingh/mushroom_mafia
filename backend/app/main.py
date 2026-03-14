import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter

from app.logging_config import setup_logging, RequestIdMiddleware

# Configure logging before anything else
setup_logging()

from app.config import settings
from app.redis_client import init_redis, close_redis
import app.redis_client as redis_client_module
from app.services.mqtt_client import mqtt_manager
from app.services.relay_scheduler import run_relay_scheduler
from app.services.device_monitor import start_device_monitor, stop_device_monitor

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Store startup timestamp
    app.state.startup_time = datetime.now(timezone.utc)

    # Production guard: refuse to start with default secrets
    if settings.is_production:
        if settings.JWT_SECRET.startswith("change-me"):
            raise RuntimeError("FATAL: JWT_SECRET not set — refusing to start in production with default secret")
        if settings.DEVICE_ENCRYPTION_KEY.startswith("change-me"):
            raise RuntimeError("FATAL: DEVICE_ENCRYPTION_KEY not set — refusing to start in production with default key")

    # Redis (optional — graceful fallback if unavailable)
    try:
        await init_redis()
        await FastAPILimiter.init(redis_client_module.redis_client)
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis unavailable, rate limiting disabled: {e}")

    # MQTT client (optional — graceful fallback if unavailable)
    mqtt_task = None
    scheduler_task = None
    try:
        mqtt_task = asyncio.create_task(mqtt_manager.start())
        logger.info("MQTT client starting...")
        scheduler_task = asyncio.create_task(run_relay_scheduler())
        logger.info("Relay scheduler starting...")
    except Exception as e:
        logger.warning(f"MQTT unavailable: {e}")

    # Device health monitor (checks for offline devices every 5 minutes)
    try:
        start_device_monitor()
        logger.info("Device monitor starting...")
    except Exception as e:
        logger.warning(f"Device monitor failed to start: {e}")

    yield

    # Stop device monitor
    stop_device_monitor()

    # Shutdown
    if mqtt_task:
        await mqtt_manager.stop()
        mqtt_task.cancel()
        try:
            await mqtt_task
        except asyncio.CancelledError:
            pass
    if scheduler_task:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
    await close_redis()


app = FastAPI(
    title="Mushroom Farm IoT Platform API",
    description="REST API for mushroom farm IoT monitoring — manages plants, rooms, devices, sensors, relays, growth cycles, harvests, and real-time climate data.",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)


@app.middleware("http")
async def normalize_trailing_slash(request, call_next):
    """Silently append trailing slash instead of 307 redirect (avoids CORS issues)."""
    path = request.scope["path"]
    if not path.endswith("/") and "/." not in path and not path.startswith("/docs") and not path.startswith("/openapi"):
        request.scope["path"] = path + "/"
    return await call_next(request)


# Middleware ordering: outermost first
# 1. Request ID (outermost — every request gets an ID)
app.add_middleware(RequestIdMiddleware)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Metrics middleware (fire-and-forget, safe even if Redis is down)
from app.middleware.metrics import MetricsMiddleware

app.add_middleware(MetricsMiddleware)

# Health router (mounted at root, not under /api/v1)
from app.api.health import router as health_router

app.include_router(health_router)

# API router
from app.api.router import api_router

app.include_router(api_router, prefix="/api/v1")
