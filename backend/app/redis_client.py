import redis.asyncio as redis
from typing import AsyncGenerator

from app.config import settings

redis_client: redis.Redis | None = None


async def init_redis() -> None:
    global redis_client
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


async def close_redis() -> None:
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None


async def get_redis() -> AsyncGenerator[redis.Redis, None]:
    if redis_client is None:
        raise RuntimeError("Redis client is not initialized. Call init_redis() first.")
    yield redis_client
