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
    await init_redis()
    await FastAPILimiter.init(redis_client_module.redis_client)
    # Start MQTT client in background
    mqtt_task = asyncio.create_task(mqtt_manager.start())
    logger.info("MQTT client starting...")
    # Start relay scheduler in background
    scheduler_task = asyncio.create_task(run_relay_scheduler())
    logger.info("Relay scheduler starting...")
    yield
    # Shutdown
    await mqtt_manager.stop()
    mqtt_task.cancel()
    scheduler_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
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
