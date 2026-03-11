"""Authentication endpoint tests (cookie-based auth)."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    """POST /api/v1/auth/login with valid admin creds returns 200 and sets cookies."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "admin"
    # Verify cookies were set
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """POST /api/v1/auth/login with wrong password returns 401."""
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_protected_route_without_auth(client: AsyncClient):
    """GET /api/v1/users/ without cookies returns 401."""
    response = await client.get("/api/v1/users/")
    assert response.status_code in (401, 403)
