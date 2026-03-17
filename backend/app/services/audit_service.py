"""Audit logging service — writes to AuditLog table for security-relevant actions."""

import logging
from typing import Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.enums import AuditAction

logger = logging.getLogger(__name__)


async def write_audit_log(
    db: AsyncSession,
    action: AuditAction,
    *,
    user_id: Optional[int] = None,
    table_name: Optional[str] = None,
    record_id: Optional[int] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    """Write an audit log entry. Best-effort — never raises."""
    try:
        ip_address = None
        user_agent = None
        if request:
            ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("user-agent", "")[:255]

        entry = AuditLog(
            user_id=user_id,
            action=action,
            table_name=table_name,
            record_id=record_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(entry)
        await db.flush()
    except Exception:
        logger.warning("Failed to write audit log", exc_info=True)
