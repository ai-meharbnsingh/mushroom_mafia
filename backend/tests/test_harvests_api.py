"""Harvests API endpoint tests (/api/v1/harvests/)."""
import pytest
from httpx import AsyncClient
from tests.conftest import _extract_csrf


@pytest.mark.asyncio
async def test_create_harvest(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/harvests/ — creates harvest entry."""
    room_id = seed_plant_room_device["room"].room_id
    csrf = _extract_csrf(owner_client)
    response = await owner_client.post(
        "/api/v1/harvests/",
        json={
            "room_id": room_id,
            "weight_kg": "12.50",
            "grade": "A",
            "notes": "Good batch",
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["room_id"] == room_id
    assert float(data["weight_kg"]) == 12.50
    assert data["grade"] == "A"


@pytest.mark.asyncio
async def test_create_harvest_invalid_grade(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/harvests/ — rejects invalid grade."""
    room_id = seed_plant_room_device["room"].room_id
    csrf = _extract_csrf(owner_client)
    response = await owner_client.post(
        "/api/v1/harvests/",
        json={
            "room_id": room_id,
            "weight_kg": "5.00",
            "grade": "X",
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 400
    assert "grade" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_room_harvests(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/harvests/room/{id} — lists harvests for room."""
    room_id = seed_plant_room_device["room"].room_id
    csrf = _extract_csrf(owner_client)
    await owner_client.post(
        "/api/v1/harvests/",
        json={"room_id": room_id, "weight_kg": "8.00", "grade": "B"},
        headers={"x-csrf-token": csrf},
    )

    response = await owner_client.get(f"/api/v1/harvests/room/{room_id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["room_id"] == room_id


@pytest.mark.asyncio
async def test_harvest_summary(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/harvests/summary — grouped summaries."""
    room_id = seed_plant_room_device["room"].room_id
    csrf = _extract_csrf(owner_client)
    await owner_client.post(
        "/api/v1/harvests/",
        json={"room_id": room_id, "weight_kg": "10.00", "grade": "A"},
        headers={"x-csrf-token": csrf},
    )

    response = await owner_client.get("/api/v1/harvests/summary")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "total_weight_kg" in data[0]
        assert "total_harvests" in data[0]
        assert "grade_breakdown" in data[0]
        assert "period" in data[0]


@pytest.mark.asyncio
async def test_harvest_room_not_found(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/harvests/room/99999 — non-existent room returns 404."""
    response = await owner_client.get("/api/v1/harvests/room/99999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_harvest_wrong_owner(auth_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/harvests/ — admin on owner_id=1 cannot create harvest for room on owner_id=2."""
    room_id = seed_plant_room_device["room"].room_id
    csrf = _extract_csrf(auth_client)
    response = await auth_client.post(
        "/api/v1/harvests/",
        json={"room_id": room_id, "weight_kg": "5.00", "grade": "C"},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 403
