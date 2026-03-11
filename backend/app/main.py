import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi_limiter import FastAPILimiter

from app.config import settings
from app.redis_client import init_redis, close_redis
import app.redis_client as redis_client_module
from app.services.mqtt_client import mqtt_manager
from app.services.relay_scheduler import run_relay_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
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

    yield

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
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


from app.api.router import api_router

app.include_router(api_router, prefix="/api/v1")
