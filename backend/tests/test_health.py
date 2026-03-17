"""Tests for health check endpoints."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """GET /health should return 200 with status ok or degraded (no Redis/MQTT in test)."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_docs_endpoint(client: AsyncClient):
    """GET /docs should return 200 (Swagger UI)."""
    response = await client.get("/docs")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_json(client: AsyncClient):
    """GET /openapi.json should return 200 with valid schema."""
    response = await client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "paths" in data
    assert "info" in data
    assert data["info"]["title"] == "Mushroom Farm IoT Platform API"
