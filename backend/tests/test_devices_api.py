"""Device management API endpoint tests (/api/v1/devices/)."""
import pytest
from httpx import AsyncClient
from tests.conftest import _extract_csrf


@pytest.mark.asyncio
async def test_provision_device_as_admin(auth_client: AsyncClient):
    """POST /api/v1/devices/provision — admin creates device with PENDING status."""
    csrf = _extract_csrf(auth_client)
    response = await auth_client.post(
        "/api/v1/devices/provision",
        json={
            "mac_address": "AA:BB:CC:DD:EE:10",
            "device_name": "Provisioned Device 1",
            "device_type": "ESP32",
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["subscription_status"] == "PENDING"
    assert data["license_key"].startswith("LIC-")
    assert data["device_name"] == "Provisioned Device 1"


@pytest.mark.asyncio
async def test_provision_device_forbidden_for_non_admin(client: AsyncClient):
    """POST /api/v1/devices/provision — unauthenticated returns 401/403."""
    response = await client.post(
        "/api/v1/devices/provision",
        json={
            "mac_address": "AA:BB:CC:DD:EE:11",
            "device_name": "Should Fail",
            "device_type": "ESP32",
        },
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_devices_as_admin(auth_client: AsyncClient):
    """GET /api/v1/devices/ — admin sees devices."""
    response = await auth_client.get("/api/v1/devices/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_list_devices_as_owner(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/devices/ — owner sees devices assigned to their plants."""
    response = await owner_client.get("/api/v1/devices/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    device_ids = [d["device_id"] for d in data]
    assert 100 in device_ids


@pytest.mark.asyncio
async def test_assign_device_to_plant(auth_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/devices/{id}/assign — assigns device to plant, sets ACTIVE."""
    # First provision a device
    csrf = _extract_csrf(auth_client)
    prov = await auth_client.post(
        "/api/v1/devices/provision",
        json={
            "mac_address": "AA:BB:CC:DD:EE:20",
            "device_name": "Assign Test Device",
            "device_type": "ESP32",
        },
        headers={"x-csrf-token": csrf},
    )
    assert prov.status_code == 200
    device_id = prov.json()["device_id"]

    # Assign to plant_id=1
    response = await auth_client.post(
        f"/api/v1/devices/{device_id}/assign",
        json={"plant_id": 1},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["assigned_to_plant_id"] == 1
    assert data["subscription_status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_link_device_to_room(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/devices/link — links device to room, sets PENDING_APPROVAL."""
    from unittest.mock import AsyncMock, patch

    csrf = _extract_csrf(owner_client)

    # Provision a fresh device first via admin
    from app.main import app
    from app.database import get_db
    from app.redis_client import get_redis
    from tests.conftest import override_get_db, override_get_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    # Provision using the owner_client (they are ADMIN role)
    prov = await owner_client.post(
        "/api/v1/devices/provision",
        json={
            "mac_address": "AA:BB:CC:DD:EE:30",
            "device_name": "Link Test Device",
            "device_type": "ESP32",
        },
        headers={"x-csrf-token": csrf},
    )
    assert prov.status_code == 200, prov.text
    license_key = prov.json()["license_key"]

    # Link to room_id=1
    with patch("app.api.devices.ws_manager") as mock_ws:
        mock_ws.broadcast_to_owner = AsyncMock()
        response = await owner_client.post(
            "/api/v1/devices/link",
            json={"license_key": license_key, "room_id": 1},
            headers={"x-csrf-token": csrf},
        )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "PENDING_APPROVAL"
    assert data["room_id"] == 1


@pytest.mark.asyncio
async def test_approve_device(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/devices/{id}/approve — APPROVE generates MQTT creds, sets ACTIVE."""
    csrf = _extract_csrf(owner_client)

    # Provision + Link
    prov = await owner_client.post(
        "/api/v1/devices/provision",
        json={
            "mac_address": "AA:BB:CC:DD:EE:40",
            "device_name": "Approve Test",
            "device_type": "ESP32",
        },
        headers={"x-csrf-token": csrf},
    )
    assert prov.status_code == 200
    device_id = prov.json()["device_id"]
    license_key = prov.json()["license_key"]

    from unittest.mock import AsyncMock, patch

    with patch("app.api.devices.ws_manager") as mock_ws:
        mock_ws.broadcast_to_owner = AsyncMock()
        await owner_client.post(
            "/api/v1/devices/link",
            json={"license_key": license_key, "room_id": 1},
            headers={"x-csrf-token": csrf},
        )

    # Approve
    response = await owner_client.post(
        f"/api/v1/devices/{device_id}/approve",
        json={"action": "APPROVE"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "ACTIVE"


@pytest.mark.asyncio
async def test_reject_device(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/devices/{id}/approve — REJECT reverts to PENDING."""
    csrf = _extract_csrf(owner_client)

    prov = await owner_client.post(
        "/api/v1/devices/provision",
        json={
            "mac_address": "AA:BB:CC:DD:EE:41",
            "device_name": "Reject Test",
            "device_type": "ESP32",
        },
        headers={"x-csrf-token": csrf},
    )
    assert prov.status_code == 200
    device_id = prov.json()["device_id"]
    license_key = prov.json()["license_key"]

    from unittest.mock import AsyncMock, patch

    with patch("app.api.devices.ws_manager") as mock_ws:
        mock_ws.broadcast_to_owner = AsyncMock()
        await owner_client.post(
            "/api/v1/devices/link",
            json={"license_key": license_key, "room_id": 1},
            headers={"x-csrf-token": csrf},
        )

    response = await owner_client.post(
        f"/api/v1/devices/{device_id}/approve",
        json={"action": "REJECT"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "PENDING"


@pytest.mark.asyncio
async def test_kill_switch_disable(auth_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/devices/{id}/kill-switch — DISABLE suspends device."""
    csrf = _extract_csrf(auth_client)
    response = await auth_client.post(
        "/api/v1/devices/100/kill-switch",
        json={"action": "DISABLE"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    assert "DISABLE" in response.json()["detail"]


@pytest.mark.asyncio
async def test_kill_switch_enable(auth_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/devices/{id}/kill-switch — ENABLE reactivates device."""
    csrf = _extract_csrf(auth_client)
    response = await auth_client.post(
        "/api/v1/devices/100/kill-switch",
        json={"action": "ENABLE"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    assert "ENABLE" in response.json()["detail"]


@pytest.mark.asyncio
async def test_get_device_by_id(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/devices/{device_id} — returns device details."""
    response = await owner_client.get("/api/v1/devices/100")
    assert response.status_code == 200
    data = response.json()
    assert data["device_id"] == 100
    assert data["device_name"] == "Seed Device"
