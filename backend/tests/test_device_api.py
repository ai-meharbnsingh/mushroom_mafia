"""Device API endpoint tests."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_poll_provisioning_invalid_format(client: AsyncClient):
    """GET /api/v1/device/provision/INVALID-KEY returns 400 for bad key format."""
    response = await client.get("/api/v1/device/provision/INVALID-KEY")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_poll_provisioning_not_found(client: AsyncClient):
    """GET /api/v1/device/provision/LIC-XXXX-XXXX-XXXX returns 404 for unknown valid-format key."""
    response = await client.get("/api/v1/device/provision/LIC-FAKE-FAKE-FAKE")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_device_register_unauthorized(client: AsyncClient):
    """POST /api/v1/device/register with invalid credentials returns 401."""
    response = await client.post(
        "/api/v1/device/register",
        json={
            "license_key": "LIC-FAKE-FAKE-FAKE",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "firmware_version": "1.0.0",
            "hardware_version": "1.0",
        },
    )
    assert response.status_code == 401
