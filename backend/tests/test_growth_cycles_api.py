"""Growth Cycles API endpoint tests (/api/v1/growth-cycles/)."""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from tests.conftest import _extract_csrf


@pytest.mark.asyncio
async def test_create_growth_cycle(owner_client: AsyncClient, seed_plant_room_device):
    """POST /api/v1/growth-cycles/ — creates cycle for room."""
    csrf = _extract_csrf(owner_client)
    response = await owner_client.post(
        "/api/v1/growth-cycles/",
        json={
            "room_id": 1,
            "current_stage": "INOCULATION",
            "notes": "Test cycle",
        },
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["room_id"] == 1
    assert data["current_stage"] == "INOCULATION"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_get_current_cycle(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/growth-cycles/room/{id}/current — returns active cycle."""
    # Ensure a cycle exists
    csrf = _extract_csrf(owner_client)
    await owner_client.post(
        "/api/v1/growth-cycles/",
        json={"room_id": 1, "current_stage": "INOCULATION"},
        headers={"x-csrf-token": csrf},
    )

    response = await owner_client.get("/api/v1/growth-cycles/room/1/current")
    assert response.status_code == 200
    data = response.json()
    assert data["room_id"] == 1
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_advance_growth_stage(owner_client: AsyncClient, seed_plant_room_device):
    """PUT /api/v1/growth-cycles/{id}/advance — advances stage correctly."""
    csrf = _extract_csrf(owner_client)

    # Create a fresh cycle
    create_resp = await owner_client.post(
        "/api/v1/growth-cycles/",
        json={"room_id": 1, "current_stage": "INOCULATION"},
        headers={"x-csrf-token": csrf},
    )
    assert create_resp.status_code == 200
    cycle_id = create_resp.json()["cycle_id"]

    # Advance (INOCULATION -> SPAWN_RUN)
    with patch("app.api.growth_cycles.on_stage_advanced", new_callable=AsyncMock):
        response = await owner_client.put(
            f"/api/v1/growth-cycles/{cycle_id}/advance",
            headers={"x-csrf-token": csrf},
        )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["current_stage"] == "SPAWN_RUN"


@pytest.mark.asyncio
async def test_advance_growth_stage_to_specific(owner_client: AsyncClient, seed_plant_room_device):
    """PUT /api/v1/growth-cycles/{id}/advance — can jump to a specified stage."""
    csrf = _extract_csrf(owner_client)

    create_resp = await owner_client.post(
        "/api/v1/growth-cycles/",
        json={"room_id": 1, "current_stage": "INOCULATION"},
        headers={"x-csrf-token": csrf},
    )
    assert create_resp.status_code == 200
    cycle_id = create_resp.json()["cycle_id"]

    with patch("app.api.growth_cycles.on_stage_advanced", new_callable=AsyncMock):
        response = await owner_client.put(
            f"/api/v1/growth-cycles/{cycle_id}/advance",
            json={"current_stage": "FRUITING"},
            headers={"x-csrf-token": csrf},
        )
    assert response.status_code == 200, response.text
    assert response.json()["current_stage"] == "FRUITING"


@pytest.mark.asyncio
async def test_advance_final_stage_errors(owner_client: AsyncClient, seed_plant_room_device):
    """PUT /api/v1/growth-cycles/{id}/advance — errors on final stage (IDLE)."""
    csrf = _extract_csrf(owner_client)

    # Create cycle at IDLE stage
    create_resp = await owner_client.post(
        "/api/v1/growth-cycles/",
        json={"room_id": 1, "current_stage": "IDLE"},
        headers={"x-csrf-token": csrf},
    )
    assert create_resp.status_code == 200
    cycle_id = create_resp.json()["cycle_id"]

    # Advance should fail at final stage
    with patch("app.api.growth_cycles.on_stage_advanced", new_callable=AsyncMock):
        response = await owner_client.put(
            f"/api/v1/growth-cycles/{cycle_id}/advance",
            headers={"x-csrf-token": csrf},
        )
    assert response.status_code == 400
    assert "final stage" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_room_cycles(owner_client: AsyncClient, seed_plant_room_device):
    """GET /api/v1/growth-cycles/room/{id} — lists all cycles for room."""
    response = await owner_client.get("/api/v1/growth-cycles/room/1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
