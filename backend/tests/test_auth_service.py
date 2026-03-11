"""Tests for app.services.auth_service — authenticate_user and create_tokens."""
import pytest
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.enums import UserRole
from app.services.auth_service import authenticate_user, create_tokens
from app.utils.security import decode_token, hash_password
from app.config import settings


# ---------------------------------------------------------------------------
# authenticate_user
# ---------------------------------------------------------------------------


async def test_authenticate_user_correct_credentials(db_session: AsyncSession):
    """authenticate_user() with correct credentials returns the User object."""
    user = await authenticate_user(db_session, "admin", "admin123")
    assert user is not None
    assert user.username == "admin"
    assert user.role == UserRole.SUPER_ADMIN


async def test_authenticate_user_wrong_password_returns_none(db_session: AsyncSession):
    """authenticate_user() with wrong password returns None and increments login_attempts."""
    # First, reset login_attempts to a known state
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    admin.login_attempts = 0
    admin.locked_until = None
    await db_session.commit()

    user = await authenticate_user(db_session, "admin", "wrongpassword")
    assert user is None

    # Verify login_attempts was incremented
    db_session.expire_all()
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    assert admin.login_attempts == 1


async def test_authenticate_user_lockout_after_max_attempts(db_session: AsyncSession):
    """authenticate_user() locks out after MAX_LOGIN_ATTEMPTS consecutive failures."""
    # Reset state
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    admin.login_attempts = 0
    admin.locked_until = None
    await db_session.commit()

    # Fail MAX_LOGIN_ATTEMPTS times (default 5)
    for i in range(settings.MAX_LOGIN_ATTEMPTS):
        user = await authenticate_user(db_session, "admin", "wrong")
        assert user is None

    # Next attempt should raise 429
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await authenticate_user(db_session, "admin", "wrong")
    assert exc_info.value.status_code == 429
    assert "locked" in exc_info.value.detail.lower()

    # Verify locked_until was set
    db_session.expire_all()
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    assert admin.locked_until is not None
    # SQLite stores naive datetimes; compare accordingly
    locked = admin.locked_until
    now_utc = datetime.now(timezone.utc)
    if locked.tzinfo is None:
        now_utc = now_utc.replace(tzinfo=None)
    assert locked > now_utc


async def test_authenticate_user_auto_unlock_after_lockout_duration(db_session: AsyncSession):
    """authenticate_user() auto-unlocks after LOCKOUT_DURATION_MINUTES has passed."""
    # Set locked_until to the past to simulate expired lockout
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    admin.login_attempts = settings.MAX_LOGIN_ATTEMPTS
    admin.locked_until = datetime.now(timezone.utc) - timedelta(minutes=1)
    await db_session.commit()

    # Should succeed now (lockout expired, attempts reset, then correct password works)
    user = await authenticate_user(db_session, "admin", "admin123")
    assert user is not None
    assert user.username == "admin"
    assert user.login_attempts == 0
    assert user.locked_until is None


async def test_authenticate_user_nonexistent_username(db_session: AsyncSession):
    """authenticate_user() with nonexistent username returns None."""
    user = await authenticate_user(db_session, "no_such_user", "anypassword")
    assert user is None


# ---------------------------------------------------------------------------
# create_tokens
# ---------------------------------------------------------------------------


async def test_create_tokens_returns_access_and_refresh(db_session: AsyncSession):
    """create_tokens() returns dict with access_token and refresh_token strings."""
    # Reset lockout state first
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    admin.login_attempts = 0
    admin.locked_until = None
    await db_session.commit()

    user = await authenticate_user(db_session, "admin", "admin123")
    assert user is not None

    tokens = create_tokens(user)
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert isinstance(tokens["access_token"], str)
    assert isinstance(tokens["refresh_token"], str)
    assert len(tokens["access_token"]) > 20
    assert len(tokens["refresh_token"]) > 20


async def test_create_tokens_decode_to_correct_claims(db_session: AsyncSession):
    """create_tokens() tokens decode to correct user_id, owner_id, role."""
    result = await db_session.execute(select(User).where(User.username == "admin"))
    admin = result.scalar_one()
    admin.login_attempts = 0
    admin.locked_until = None
    await db_session.commit()

    user = await authenticate_user(db_session, "admin", "admin123")
    assert user is not None

    tokens = create_tokens(user)

    # Decode access token
    access_payload = decode_token(tokens["access_token"])
    assert access_payload["sub"] == str(user.user_id)
    assert access_payload["owner_id"] == user.owner_id
    assert access_payload["role"] == user.role.value
    assert access_payload["type"] == "access"

    # Decode refresh token
    refresh_payload = decode_token(tokens["refresh_token"])
    assert refresh_payload["sub"] == str(user.user_id)
    assert refresh_payload["type"] == "refresh"
