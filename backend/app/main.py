import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.redis_client import init_redis, close_redis
from app.services.mqtt_client import mqtt_manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_redis()
    # Start MQTT client in background
    mqtt_task = asyncio.create_task(mqtt_manager.start())
    logger.info("MQTT client starting...")
    yield
    # Shutdown
    await mqtt_manager.stop()
    mqtt_task.cancel()
    try:
        await mqtt_task
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
