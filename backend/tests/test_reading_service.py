"""Tests for app.services.reading_service — process_reading and related logic."""
import json
from unittest.mock import patch, AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import RoomReading, Device
from app.services.reading_service import process_reading
from tests.conftest import FakeRedis, FakeWSManager


# ---------------------------------------------------------------------------
# process_reading — DB persistence
# ---------------------------------------------------------------------------


async def test_process_reading_creates_room_reading(
    db_session: AsyncSession,
    fake_redis: FakeRedis,
    fake_ws: FakeWSManager,
    seed_owner_plant_room_device,
):
    """process_reading() creates a RoomReading record in the DB."""
    device = seed_owner_plant_room_device["device"]
    data = {
        "co2_ppm": 800,
        "room_temp": 22.5,
        "room_humidity": 85.0,
        "outdoor_temp": 30.0,
        "outdoor_humidity": 60.0,
        "bag_temps": [21.0, 21.5, 22.0],
    }

    # Patch evaluate_auto_relays to avoid MQTT import issues
    with patch("app.services.reading_service.evaluate_auto_relays", new_callable=AsyncMock):
        reading_id = await process_reading(db_session, fake_redis, device, data, fake_ws)

    assert reading_id is not None
    assert isinstance(reading_id, int)

    # Verify the record exists in DB
    result = await db_session.execute(
        select(RoomReading).where(RoomReading.reading_id == reading_id)
    )
    reading = result.scalar_one()
    assert reading.co2_ppm == 800
    assert float(reading.room_temp) == 22.5
    assert float(reading.room_humidity) == 85.0


async def test_process_reading_stores_live_data_in_redis(
    db_session: AsyncSession,
    fake_redis: FakeRedis,
    fake_ws: FakeWSManager,
    seed_owner_plant_room_device,
):
    """process_reading() stores live data in Redis under the expected keys."""
    device = seed_owner_plant_room_device["device"]
    data = {
        "co2_ppm": 900,
        "room_temp": 23.0,
        "room_humidity": 80.0,
    }

    with patch("app.services.reading_service.evaluate_auto_relays", new_callable=AsyncMock):
        await process_reading(db_session, fake_redis, device, data, fake_ws)

    # Check Redis keys
    device_key = f"live:device:{device.device_id}"
    raw = await fake_redis.get(device_key)
    assert raw is not None
    live_data = json.loads(raw)
    assert live_data["device_id"] == device.device_id
    assert live_data["co2_ppm"] == 900

    # Room key should also be set
    if device.room_id:
        room_key = f"live:room:{device.room_id}"
        raw_room = await fake_redis.get(room_key)
        assert raw_room is not None

    # Relay key should also be set
    relay_key = f"live:relay:{device.device_id}"
    raw_relay = await fake_redis.get(relay_key)
    assert raw_relay is not None


async def test_process_reading_updates_device_online_and_last_seen(
    db_session: AsyncSession,
    fake_redis: FakeRedis,
    fake_ws: FakeWSManager,
    seed_owner_plant_room_device,
):
    """process_reading() sets device.is_online=True and updates device.last_seen."""
    device = seed_owner_plant_room_device["device"]

    # Ensure device starts offline
    device.is_online = False
    device.last_seen = None
    await db_session.commit()

    data = {"co2_ppm": 700}

    with patch("app.services.reading_service.evaluate_auto_relays", new_callable=AsyncMock):
        await process_reading(db_session, fake_redis, device, data, fake_ws)

    await db_session.refresh(device)
    assert device.is_online is True
    assert device.last_seen is not None


# ---------------------------------------------------------------------------
# process_reading — bag_temps array
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bag_temps,expected_count",
    [
        ([], 0),
        ([21.0, 22.0, 23.0, 24.0, 25.0], 5),
        ([20.0] * 10, 10),
    ],
    ids=["empty_bag_temps", "five_bag_temps", "ten_bag_temps"],
)
async def test_process_reading_handles_bag_temps(
    db_session: AsyncSession,
    fake_redis: FakeRedis,
    fake_ws: FakeWSManager,
    seed_owner_plant_room_device,
    bag_temps,
    expected_count,
):
    """process_reading() maps bag_temps array to bag_temp_1..bag_temp_10 columns correctly."""
    device = seed_owner_plant_room_device["device"]
    data = {
        "co2_ppm": 600,
        "bag_temps": bag_temps,
    }

    with patch("app.services.reading_service.evaluate_auto_relays", new_callable=AsyncMock):
        reading_id = await process_reading(db_session, fake_redis, device, data, fake_ws)

    result = await db_session.execute(
        select(RoomReading).where(RoomReading.reading_id == reading_id)
    )
    reading = result.scalar_one()

    # Verify each bag_temp column
    for i in range(1, 11):
        col_val = getattr(reading, f"bag_temp_{i}")
        if i <= expected_count:
            assert col_val is not None, f"bag_temp_{i} should be set"
            assert float(col_val) == bag_temps[i - 1]
        else:
            assert col_val is None, f"bag_temp_{i} should be None"


# ---------------------------------------------------------------------------
# process_reading — partial sensor data
# ---------------------------------------------------------------------------


async def test_process_reading_with_partial_data(
    db_session: AsyncSession,
    fake_redis: FakeRedis,
    fake_ws: FakeWSManager,
    seed_owner_plant_room_device,
):
    """process_reading() with missing sensor fields still works — creates reading with nulls."""
    device = seed_owner_plant_room_device["device"]
    # Only co2_ppm provided, everything else missing
    data = {"co2_ppm": 1200}

    with patch("app.services.reading_service.evaluate_auto_relays", new_callable=AsyncMock):
        reading_id = await process_reading(db_session, fake_redis, device, data, fake_ws)

    result = await db_session.execute(
        select(RoomReading).where(RoomReading.reading_id == reading_id)
    )
    reading = result.scalar_one()
    assert reading.co2_ppm == 1200
    assert reading.room_temp is None
    assert reading.room_humidity is None
    assert reading.outdoor_temp is None


# ---------------------------------------------------------------------------
# process_reading — WebSocket broadcast
# ---------------------------------------------------------------------------


async def test_process_reading_broadcasts_via_websocket(
    db_session: AsyncSession,
    fake_redis: FakeRedis,
    fake_ws: FakeWSManager,
    seed_owner_plant_room_device,
):
    """process_reading() calls ws_manager.broadcast_to_owner with a sensor_update event."""
    device = seed_owner_plant_room_device["device"]
    owner = seed_owner_plant_room_device["owner"]
    data = {
        "co2_ppm": 850,
        "room_temp": 22.0,
        "room_humidity": 75.0,
    }

    with patch("app.services.reading_service.evaluate_auto_relays", new_callable=AsyncMock):
        await process_reading(db_session, fake_redis, device, data, fake_ws)

    # The ws_manager should have received at least one broadcast
    sensor_updates = [c for c in fake_ws.calls if c["event"] == "sensor_update"]
    assert len(sensor_updates) >= 1

    call = sensor_updates[0]
    assert call["owner_id"] == owner.owner_id
    assert call["data"]["device_id"] == device.device_id
    assert call["data"]["co2_ppm"] == 850
