"""Structured JSON logging configuration with request ID middleware."""

import logging
import sys
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings

# Context variable to hold the current request ID
request_id_var: ContextVar[str | None] = ContextVar("request_id", default=None)


class RequestIdFilter(logging.Filter):
    """Logging filter that injects request_id into every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_var.get() or "-"
        return True


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Starlette middleware that generates a UUID per request,
    stores it in a ContextVar, and adds X-Request-ID response header."""

    async def dispatch(self, request: Request, call_next) -> Response:
        rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request_id_var.set(rid)
        response = await call_next(request)
        response.headers["X-Request-ID"] = rid
        return response


class JsonFormatter(logging.Formatter):
    """Simple JSON log formatter (avoids heavy dependencies in minimal installs)."""

    def format(self, record: logging.LogRecord) -> str:
        import json
        from datetime import datetime, timezone

        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def setup_logging() -> None:
    """Configure root logging. JSON in production, colored human-readable in dev."""
    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Remove existing handlers to avoid duplicates
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if settings.is_production:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "\033[36m%(asctime)s\033[0m | \033[1m%(levelname)-8s\033[0m | "
                "%(name)s | \033[33m%(request_id)s\033[0m | %(message)s",
                datefmt="%H:%M:%S",
            )
        )

    handler.addFilter(RequestIdFilter())
    root.addHandler(handler)

    # Quiet noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("aiomqtt").setLevel(logging.WARNING)
