"""Metrics collection middleware — writes counters to Redis (fire-and-forget)."""

import logging
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)

# TTL for metric keys (24 hours)
_METRIC_TTL = 86400


async def record_metric(name: str, value: int = 1, metric_type: str = "counter") -> None:
    """Increment a Redis counter for the given metric name.

    Gracefully handles Redis being unavailable — metrics should never crash the app.
    """
    try:
        from app.redis_client import redis_client

        if redis_client is None:
            return

        key = f"metrics:{name}"
        if metric_type == "counter":
            pipe = redis_client.pipeline(transaction=False)
            pipe.incr(key, value)
            pipe.expire(key, _METRIC_TTL)
            await pipe.execute()
    except Exception:
        pass  # Fire-and-forget — never crash the app for metrics


class MetricsMiddleware(BaseHTTPMiddleware):
    """Records per-request metrics to Redis: request count and latency."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000

        # Fire-and-forget metrics recording
        try:
            from app.redis_client import redis_client

            if redis_client is None:
                return response

            method = request.method
            # Normalise path: strip query params, collapse IDs to {id}
            path = request.url.path.rstrip("/") or "/"

            status_code = response.status_code

            pipe = redis_client.pipeline(transaction=False)

            # Request counter
            counter_key = f"metrics:api:requests:{method}:{path}:{status_code}"
            pipe.incr(counter_key, 1)
            pipe.expire(counter_key, _METRIC_TTL)

            # Latency list (keep last 100)
            latency_key = f"metrics:api:latency:{path}"
            pipe.lpush(latency_key, round(elapsed_ms, 2))
            pipe.ltrim(latency_key, 0, 99)
            pipe.expire(latency_key, _METRIC_TTL)

            await pipe.execute()
        except Exception:
            pass  # Fire-and-forget

        return response
