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
from sqlalchemy import event, BigInteger, Integer
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# ---------- Environment overrides (BEFORE any app imports) ----------
# Force SQLite for tests and a safe JWT secret
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["JWT_SECRET"] = "test-secret-key-for-ci"
os.environ["DEVICE_ENCRYPTION_KEY"] = "dGVzdC1lbmNyeXB0aW9uLWtleS0xMjM0NQ=="  # dummy Fernet-compat not needed for these tests
os.environ["ENVIRONMENT"] = "development"

from sqlalchemy.ext.compiler import compiles

# Make BigInteger behave as Integer on SQLite so autoincrement works
@compiles(BigInteger, "sqlite")
def _compile_big_int_sqlite(type_, compiler, **kw):
    return "INTEGER"

from app.database import Base, get_db
from app.redis_client import get_redis
from app.models import Owner, User, Plant, Room, Device, Threshold
from app.models.enums import (
    UserRole, PlantType, RoomType, DeviceType, ThresholdParameter,
    SubscriptionStatus, CommunicationMode,
)
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
    """In-memory Redis fake that actually stores/retrieves values via an internal dict."""

    def __init__(self):
        self._store: dict[str, bytes | str] = {}

    async def get(self, key: str) -> bytes | None:
        val = self._store.get(key)
        if val is None:
            return None
        # Real Redis returns bytes
        if isinstance(val, str):
            return val.encode("utf-8")
        return val

    async def set(self, key: str, value, **kwargs) -> bool:
        if isinstance(value, bytes):
            self._store[key] = value
        else:
            self._store[key] = str(value)
        return True

    async def setex(self, key: str, seconds: int, value) -> bool:
        # Store the value; ignore TTL for test purposes
        if isinstance(value, bytes):
            self._store[key] = value
        else:
            self._store[key] = str(value)
        return True

    async def delete(self, key: str) -> int:
        if key in self._store:
            del self._store[key]
            return 1
        return 0

    async def incr(self, key: str) -> int:
        current = self._store.get(key, "0")
        if isinstance(current, bytes):
            current = current.decode("utf-8")
        new_val = int(current) + 1
        self._store[key] = str(new_val)
        return new_val

    async def expire(self, key: str, seconds: int) -> bool:
        # No-op for tests (no real TTL tracking)
        return key in self._store

    async def ping(self) -> bool:
        return True

    async def close(self):
        pass

    def clear(self):
        """Helper to reset state between tests."""
        self._store.clear()


# Shared FakeRedis instance so tests can inspect stored values
_fake_redis_instance = FakeRedis()


async def override_get_redis():
    yield _fake_redis_instance


class FakeWSManager:
    """Records broadcast calls for assertion in tests."""

    def __init__(self):
        self.calls: list[dict] = []

    async def broadcast_to_owner(self, owner_id: int, event: str, data: dict):
        self.calls.append({
            "owner_id": owner_id,
            "event": event,
            "data": data,
        })

    def reset(self):
        self.calls.clear()


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
async def db_session(setup_database) -> AsyncGenerator[AsyncSession, None]:
    """Provide a raw async DB session for service-level tests (no HTTP)."""
    async with TestSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture()
def fake_redis() -> FakeRedis:
    """Return the shared FakeRedis instance, cleared for each test."""
    _fake_redis_instance.clear()
    return _fake_redis_instance


@pytest_asyncio.fixture()
def fake_ws() -> FakeWSManager:
    """Return a fresh FakeWSManager for each test."""
    return FakeWSManager()


@pytest_asyncio.fixture()
async def seed_owner_plant_room_device(db_session: AsyncSession):
    """Create a full Owner -> Plant -> Room -> Device chain and return all objects.

    Uses owner_id=2 to avoid conflict with the session-scoped seed_admin (owner_id=1).
    Returns a dict with keys: owner, user, plant, room, device.
    """
    from sqlalchemy import select

    # Check if owner 2 already exists (from a previous test in the same session DB)
    existing = (await db_session.execute(
        select(Owner).where(Owner.owner_id == 2)
    )).scalar_one_or_none()

    if existing:
        # Fetch all related objects
        user = (await db_session.execute(
            select(User).where(User.username == "testowner")
        )).scalar_one()
        plant = (await db_session.execute(
            select(Plant).where(Plant.plant_code == "TST-001")
        )).scalar_one()
        room = (await db_session.execute(
            select(Room).where(Room.room_code == "TST-R01")
        )).scalar_one()
        device = (await db_session.execute(
            select(Device).where(Device.license_key == "LIC-TEST-ABCD-1234")
        )).scalar_one()
        return {
            "owner": existing,
            "user": user,
            "plant": plant,
            "room": room,
            "device": device,
        }

    # Owner
    owner = Owner(
        owner_id=2,
        company_name="Test Mushroom Co",
        owner_name="Test Owner 2",
        email="owner2@test.com",
    )
    db_session.add(owner)
    await db_session.flush()

    # User (ADMIN role under this owner)
    user = User(
        owner_id=2,
        username="testowner",
        email="testowner@test.com",
        password_hash=hash_password("pass1234"),
        first_name="Test",
        last_name="Owner",
        role=UserRole.ADMIN,
        is_active=True,
        login_attempts=0,
    )
    db_session.add(user)
    await db_session.flush()

    # Plant
    plant = Plant(
        owner_id=2,
        plant_name="Test Plant",
        plant_code="TST-001",
        plant_type=PlantType.OYSTER,
        location="Test City",
    )
    db_session.add(plant)
    await db_session.flush()

    # Room
    room = Room(
        plant_id=plant.plant_id,
        room_name="Fruiting Room 1",
        room_code="TST-R01",
        room_type=RoomType.FRUITING,
    )
    db_session.add(room)
    await db_session.flush()

    # Device (linked to room)
    device = Device(
        room_id=room.room_id,
        assigned_to_plant_id=plant.plant_id,
        mac_address="AA:BB:CC:DD:EE:F1",
        license_key="LIC-TEST-ABCD-1234",
        device_name="Test ESP32",
        device_type=DeviceType.ESP32,
        firmware_version="4.0.0",
        is_online=False,
        is_active=True,
        subscription_status=SubscriptionStatus.ACTIVE,
        communication_mode=CommunicationMode.HTTP,
    )
    db_session.add(device)
    await db_session.commit()

    # Refresh to populate auto-generated fields
    await db_session.refresh(owner)
    await db_session.refresh(user)
    await db_session.refresh(plant)
    await db_session.refresh(room)
    await db_session.refresh(device)

    return {
        "owner": owner,
        "user": user,
        "plant": plant,
        "room": room,
        "device": device,
    }


@pytest_asyncio.fixture()
async def seed_thresholds(db_session: AsyncSession, seed_owner_plant_room_device):
    """Create Threshold records for CO2, Temperature, Humidity in the seeded room."""
    from sqlalchemy import select

    room = seed_owner_plant_room_device["room"]

    # Check if thresholds already exist for this room
    existing = (await db_session.execute(
        select(Threshold).where(Threshold.room_id == room.room_id)
    )).scalars().all()
    if existing:
        return existing

    thresholds = []
    configs = [
        (ThresholdParameter.CO2, 400, 1500, 50),
        (ThresholdParameter.TEMPERATURE, 15, 28, 2),
        (ThresholdParameter.HUMIDITY, 60, 95, 5),
    ]
    for param, min_val, max_val, hyst in configs:
        t = Threshold(
            room_id=room.room_id,
            parameter=param,
            min_value=min_val,
            max_value=max_val,
            hysteresis=hyst,
            is_active=True,
        )
        db_session.add(t)
        thresholds.append(t)

    await db_session.commit()
    for t in thresholds:
        await db_session.refresh(t)
    return thresholds


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


# ---------- Extra fixtures for API endpoint tests (from agent-3) ----------

@pytest_asyncio.fixture()
async def seed_owner(setup_database):
    """Seed owner_id=2 with an ADMIN user for ownership-based tests."""
    from sqlalchemy import select
    async with TestSessionLocal() as session:
        existing = (await session.execute(select(Owner).where(Owner.owner_id == 2))).scalar_one_or_none()
        if existing:
            return existing
        owner = Owner(owner_id=2, company_name="Test Mushroom Co", owner_name="Test Owner 2", email="owner2@test.com")
        session.add(owner)
        await session.flush()
        user = User(owner_id=2, username="owneruser", email="owneruser@test.com", password_hash=hash_password("owner123"), first_name="Owner", last_name="User", role=UserRole.ADMIN, is_active=True, login_attempts=0)
        session.add(user)
        await session.commit()
        return owner


@pytest_asyncio.fixture()
async def seed_plant_room_device(seed_owner):
    """Create Plant->Room->Device chain under owner_id=2."""
    from sqlalchemy import select
    async with TestSessionLocal() as session:
        existing = (await session.execute(select(Plant).where(Plant.plant_code == "TST-001"))).scalar_one_or_none()
        if existing:
            plant = existing
            room = (await session.execute(select(Room).where(Room.room_code == "TST-R01"))).scalar_one()
            device = (await session.execute(select(Device).where(Device.license_key == "LIC-TEST-ABCD-1234"))).scalar_one()
            return {"plant": plant, "room": room, "device": device}
        plant = Plant(owner_id=2, plant_name="Test Plant", plant_code="TST-001", plant_type=PlantType.OYSTER, location="Test City")
        session.add(plant)
        await session.flush()
        room = Room(plant_id=plant.plant_id, room_name="Fruiting Room 1", room_code="TST-R01", room_type=RoomType.FRUITING)
        session.add(room)
        await session.flush()
        device = Device(room_id=room.room_id, assigned_to_plant_id=plant.plant_id, mac_address="AA:BB:CC:DD:EE:F1", license_key="LIC-TEST-ABCD-1234", device_name="Test ESP32", device_type=DeviceType.ESP32, firmware_version="4.0.0", is_online=False, is_active=True, subscription_status=SubscriptionStatus.ACTIVE, communication_mode=CommunicationMode.HTTP)
        session.add(device)
        await session.commit()
        await session.refresh(plant)
        await session.refresh(room)
        await session.refresh(device)
        return {"plant": plant, "room": room, "device": device}


def _extract_csrf(client):
    """Extract CSRF token from cookies without raising CookieConflict."""
    for cookie in client.cookies.jar:
        if cookie.name == "csrf_token":
            return cookie.value
    return None


@pytest_asyncio.fixture()
async def owner_client(client: AsyncClient, seed_plant_room_device) -> AsyncClient:
    """Authenticated test client as owneruser (owner_id=2)."""
    response = await client.post("/api/v1/auth/login", json={"username": "owneruser", "password": "owner123"})
    assert response.status_code == 200, f"Owner login failed: {response.text}"
    cookies = {}
    for key, value in response.cookies.items():
        cookies[key] = value
    client.cookies.update(cookies)
    return client


@pytest_asyncio.fixture()
def fake_redis_instance():
    """Provide the shared FakeRedis instance for pre-populating data."""
    _fake_redis_instance.clear()
    return _fake_redis_instance
