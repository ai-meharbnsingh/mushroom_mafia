from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.utils.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.config import settings


async def authenticate_user(
    db: AsyncSession, username: str, password: str
) -> User | None:
    """Authenticate user by username and password. Handle lockout logic.

    Lockout auto-expires after LOCKOUT_DURATION_MINUTES (default 15).
    When expired, attempts are reset and the user can try again.
    """
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        return None

    # Check lockout — auto-unlock if the lockout period has expired
    if user.locked_until:
        if user.locked_until > datetime.now(timezone.utc):
            remaining = int((user.locked_until - datetime.now(timezone.utc)).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Account temporarily locked due to too many failed attempts. Try again in {remaining} minute(s).",
            )
        else:
            # Lockout period expired — reset attempts and allow login
            user.login_attempts = 0
            user.locked_until = None
            await db.commit()

    if not verify_password(password, user.password_hash):
        user.login_attempts = (user.login_attempts or 0) + 1
        if user.login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=settings.LOCKOUT_DURATION_MINUTES
            )
        await db.commit()
        return None

    # Reset login attempts on success
    user.login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.now(timezone.utc)
    await db.commit()
    return user


def create_tokens(user: User) -> dict:
    """Create access + refresh tokens for a user."""
    access_data = {
        "sub": str(user.user_id),
        "owner_id": user.owner_id,
        "role": user.role.value,
    }
    refresh_data = {"sub": str(user.user_id), "type": "refresh"}
    return {
        "access_token": create_access_token(access_data),
        "refresh_token": create_refresh_token(refresh_data),
    }
