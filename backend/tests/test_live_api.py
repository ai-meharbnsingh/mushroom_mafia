"""Live data API endpoint tests (/api/v1/live/)."""
import json
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from tests.conftest import _extract_csrf


@pytest.mark.asyncio
async def test_send_relay_command(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """POST /api/v1/live/relay/{device_id} — sends relay command, logs to DB."""
    csrf = _extract_csrf(owner_client)
    with patch("app.api.live.ws_manager") as mock_ws:
        mock_ws.broadcast_to_owner = AsyncMock()
        response = await owner_client.post(
            "/api/v1/live/relay/100",
            json={"relay_type": "CO2", "state": True},
            headers={"x-csrf-token": csrf},
        )
    assert response.status_code == 200, response.text
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_relay_command_wrong_owner(auth_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """POST /api/v1/live/relay/{device_id} — admin on owner_id=1 gets 403 for device on owner_id=2."""
    csrf = _extract_csrf(auth_client)
    with patch("app.api.live.ws_manager") as mock_ws:
        mock_ws.broadcast_to_owner = AsyncMock()
        response = await auth_client.post(
            "/api/v1/live/relay/100",
            json={"relay_type": "CO2", "state": True},
            headers={"x-csrf-token": csrf},
        )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_relay_command_device_not_found(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """POST /api/v1/live/relay/99999 — non-existent device returns 404."""
    csrf = _extract_csrf(owner_client)
    response = await owner_client.post(
        "/api/v1/live/relay/99999",
        json={"relay_type": "CO2", "state": True},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_relay_states_empty(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """GET /api/v1/live/relay/{device_id} — returns empty relay states when Redis has no data."""
    response = await owner_client.get("/api/v1/live/relay/100")
    assert response.status_code == 200
    data = response.json()
    assert "relay_states" in data


@pytest.mark.asyncio
async def test_get_relay_states_with_data(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """GET /api/v1/live/relay/{device_id} — returns relay states from Redis."""
    relay_data = {"CO2": True, "HUMIDITY": False}
    fake_redis_instance._store["live:relay:100"] = json.dumps(relay_data)
    response = await owner_client.get("/api/v1/live/relay/100")
    assert response.status_code == 200
    data = response.json()
    assert data["relay_states"]["CO2"] is True


@pytest.mark.asyncio
async def test_get_relay_config_defaults(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/live/relay-config/{device_id} — returns 7 relay configs with defaults."""
    response = await owner_client.get("/api/v1/live/relay-config/100")
    assert response.status_code == 200
    data = response.json()
    assert "configs" in data
    assert len(data["configs"]) == 7
    relay_types = {c["relay_type"] for c in data["configs"]}
    assert "CO2" in relay_types
    assert "HUMIDITY" in relay_types
    assert "EXTRA" in relay_types


@pytest.mark.asyncio
async def test_update_relay_config(owner_client: AsyncClient, seed_plant_room_device):
    """PUT /api/v1/live/relay-config/{device_id} — upserts relay config."""
    csrf = _extract_csrf(owner_client)
    response = await owner_client.put(
        "/api/v1/live/relay-config/100",
        json=[{
            "relay_type": "CO2",
            "mode": "AUTO",
            "threshold_param": "CO2",
            "action_on_high": "ON",
            "action_on_low": "OFF",
        }],
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert "CO2" in data["updated"]


@pytest.mark.asyncio
async def test_create_relay_schedule(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/live/relay-schedule/{device_id} — creates schedule with valid time."""
    csrf = _extract_csrf(owner_client)
    response = await owner_client.post(
        "/api/v1/live/relay-schedule/100",
        json={
            "relay_type": "CO2",
            "days_of_week": 127,
            "time_on": "08:00",
            "time_off": "18:00",
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "success"
    assert data["schedule"]["relay_type"] == "CO2"
    assert data["schedule"]["time_on"] == "08:00"


@pytest.mark.asyncio
async def test_create_relay_schedule_invalid_time(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/live/relay-schedule/{device_id} — rejects invalid time format."""
    csrf = _extract_csrf(owner_client)
    response = await owner_client.post(
        "/api/v1/live/relay-schedule/100",
        json={
            "relay_type": "CO2",
            "days_of_week": 127,
            "time_on": "25:00",
            "time_off": "18:00",
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_relay_schedule(owner_client: AsyncClient, seed_plant_room_device):
    """DELETE /api/v1/live/relay-schedule/{schedule_id} — deletes schedule."""
    csrf = _extract_csrf(owner_client)
    # Create first
    create_resp = await owner_client.post(
        "/api/v1/live/relay-schedule/100",
        json={
            "relay_type": "HUMIDITY",
            "days_of_week": 31,
            "time_on": "06:00",
            "time_off": "22:00",
        },
        headers={"x-csrf-token": csrf},
    )
    assert create_resp.status_code == 200
    schedule_id = create_resp.json()["schedule"]["schedule_id"]

    # Delete
    response = await owner_client.delete(
        f"/api/v1/live/relay-schedule/{schedule_id}",
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_get_live_readings(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """GET /api/v1/live/readings — returns live readings for owner's devices."""
    reading = {"device_id": 100, "temperature": 22.0}
    fake_redis_instance._store["live:device:100"] = json.dumps(reading)
    response = await owner_client.get("/api/v1/live/readings")
    assert response.status_code == 200
    data = response.json()
    assert "readings" in data
