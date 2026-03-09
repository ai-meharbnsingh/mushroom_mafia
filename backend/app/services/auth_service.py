from datetime import datetime, timedelta

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
    """Authenticate user by username and password. Handle lockout logic."""
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        return None

    # Check lockout
    if user.locked_until and user.locked_until > datetime.utcnow():
        return None

    if not verify_password(password, user.password_hash):
        user.login_attempts = (user.login_attempts or 0) + 1
        if user.login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
        await db.commit()
        return None

    # Reset login attempts on success
    user.login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
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
