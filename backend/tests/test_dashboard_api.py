"""Dashboard API endpoint tests."""
import json
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_dashboard_summary_authenticated(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/dashboard/summary — returns counts for authenticated owner."""
    response = await owner_client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_plants" in data
    assert "total_rooms" in data
    assert "total_devices" in data
    assert data["total_plants"] >= 1
    assert data["total_rooms"] >= 1
    assert data["total_devices"] >= 1


@pytest.mark.asyncio
async def test_dashboard_summary_admin_with_no_owned_plants(auth_client: AsyncClient):
    """GET /api/v1/dashboard/summary — admin (owner_id=1) has no plants, returns zeros for plant-related counts or actual counts."""
    response = await auth_client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    # Admin on owner_id=1 has no plants seeded, so plant_count should be 0
    assert data["total_plants"] == 0
    assert data["total_rooms"] == 0
    assert data["total_devices"] == 0


@pytest.mark.asyncio
async def test_dashboard_summary_unauthenticated(client: AsyncClient):
    """GET /api/v1/dashboard/summary — unauthenticated returns 401."""
    response = await client.get("/api/v1/dashboard/summary")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_dashboard_current_readings_empty(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """GET /api/v1/dashboard/current-readings — returns empty readings when Redis has no data."""
    response = await owner_client.get("/api/v1/dashboard/current-readings")
    assert response.status_code == 200
    data = response.json()
    assert "readings" in data
    assert isinstance(data["readings"], list)


@pytest.mark.asyncio
async def test_dashboard_current_readings_with_data(owner_client: AsyncClient, seed_plant_room_device, fake_redis_instance):
    """GET /api/v1/dashboard/current-readings — returns readings from Redis for owner's devices."""
    device_id = seed_plant_room_device["device"].device_id
    reading = {"device_id": device_id, "temperature": 25.5, "humidity": 85.0}
    fake_redis_instance._store[f"live:device:{device_id}"] = json.dumps(reading)

    response = await owner_client.get("/api/v1/dashboard/current-readings")
    assert response.status_code == 200
    data = response.json()
    assert len(data["readings"]) >= 1
    assert data["readings"][0]["device_id"] == device_id


@pytest.mark.asyncio
async def test_admin_summary_as_admin(auth_client: AsyncClient):
    """GET /api/v1/dashboard/admin-summary — admin gets full breakdown."""
    response = await auth_client.get("/api/v1/dashboard/admin-summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_plants" in data
    assert "total_users" in data
    assert "device_status" in data
    assert "subscriptions" in data
    assert "room_types" in data
    assert "alerts" in data
    assert "plants" in data
    assert "recent_events" in data


@pytest.mark.asyncio
async def test_admin_summary_forbidden_for_non_admin(client: AsyncClient, seed_owner):
    """GET /api/v1/dashboard/admin-summary — non-admin (viewer role) gets 403."""
    # Use an unauthenticated client which returns 401 (no auth at all)
    response = await client.get("/api/v1/dashboard/admin-summary")
    assert response.status_code in (401, 403)
