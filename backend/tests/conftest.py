"""
Test configuration and fixtures for backend CI tests.

Uses SQLite async (aiosqlite) instead of PostgreSQL for fast, isolated testing.
Overrides database, Redis, MQTT, and lifespan dependencies so tests run
without any external services.
"""
import os
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# ---------- Environment overrides (BEFORE any app imports) ----------
# Force SQLite for tests and a safe JWT secret
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["JWT_SECRET"] = "test-secret-key-for-ci"
os.environ["DEVICE_ENCRYPTION_KEY"] = "dGVzdC1lbmNyeXB0aW9uLWtleS0xMjM0NQ=="  # dummy Fernet-compat not needed for these tests
os.environ["ENVIRONMENT"] = "development"

from app.database import Base, get_db
from app.redis_client import get_redis
from app.models import Owner, User
from app.models.enums import UserRole
from app.utils.security import hash_password

# ---------- Test DB engine (SQLite + aiosqlite) ----------
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


# ---------- Dependency overrides ----------
async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


class FakeRedis:
    """Minimal dummy Redis that won't crash when called."""

    async def get(self, key):
        return None

    async def set(self, key, value, **kwargs):
        return True

    async def delete(self, key):
        return True

    async def incr(self, key):
        return 1

    async def expire(self, key, seconds):
        return True

    async def close(self):
        pass


async def override_get_redis():
    yield FakeRedis()


# ---------- Fixtures ----------
@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    """Create all tables before tests, drop them after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    # Clean up the test.db file
    import pathlib
    db_file = pathlib.Path("./test.db")
    if db_file.exists():
        db_file.unlink()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def seed_admin(setup_database):
    """Seed an Owner and an admin User so auth tests can log in."""
    async with TestSessionLocal() as session:
        # Create a default owner
        owner = Owner(
            owner_id=1,
            company_name="Test Farm",
            owner_name="Test Owner",
            email="owner@test.com",
        )
        session.add(owner)
        await session.flush()

        # Create admin user
        admin = User(
            user_id=1,
            owner_id=1,
            username="admin",
            email="admin@test.com",
            password_hash=hash_password("admin123"),
            first_name="Admin",
            last_name="User",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
            login_attempts=0,
        )
        session.add(admin)
        await session.commit()


@pytest_asyncio.fixture()
async def client() -> AsyncGenerator[AsyncClient, None]:
    """
    Async HTTP test client with dependency overrides.

    Uses httpx.AsyncClient with ASGITransport so cookies propagate
    correctly between requests (important for cookie-based auth).
    """
    # Import app here to ensure env overrides are applied
    from app.main import app

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        follow_redirects=True,
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture()
async def auth_client(client: AsyncClient) -> AsyncClient:
    """
    Authenticated test client — logs in as admin and carries
    the access_token + csrf_token cookies on subsequent requests.
    """
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200, f"Login failed: {response.text}"

    # Extract cookies set by the login response
    cookies = {}
    for key, value in response.cookies.items():
        cookies[key] = value

    # Apply cookies to the client for subsequent requests
    client.cookies.update(cookies)
    return client
