"""Firmware API endpoint tests (/api/v1/firmware/)."""
import io
import pytest
from httpx import AsyncClient
from tests.conftest import _extract_csrf


@pytest.mark.asyncio
async def test_upload_firmware_bin(auth_client: AsyncClient):
    """POST /api/v1/firmware/upload — uploads .bin file, creates DB record with checksum."""
    csrf = _extract_csrf(auth_client)
    bin_content = b"\x00\x01\x02\x03" * 100
    response = await auth_client.post(
        "/api/v1/firmware/upload",
        data={"version": "1.0.0", "release_notes": "Initial release"},
        files={"file": ("firmware_v1.0.0.bin", io.BytesIO(bin_content), "application/octet-stream")},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["version"] == "1.0.0"
    assert data["is_active"] is True
    assert len(data["checksum_sha256"]) == 64
    assert data["file_size"] == len(bin_content)


@pytest.mark.asyncio
async def test_upload_firmware_rejects_non_bin(auth_client: AsyncClient):
    """POST /api/v1/firmware/upload — rejects non-.bin file."""
    csrf = _extract_csrf(auth_client)
    response = await auth_client.post(
        "/api/v1/firmware/upload",
        data={"version": "1.0.1"},
        files={"file": ("firmware.txt", io.BytesIO(b"not binary"), "text/plain")},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 400
    assert "bin" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_firmware_rejects_invalid_version(auth_client: AsyncClient):
    """POST /api/v1/firmware/upload — rejects path traversal version like '../etc'."""
    csrf = _extract_csrf(auth_client)
    response = await auth_client.post(
        "/api/v1/firmware/upload",
        data={"version": "../etc"},
        files={"file": ("evil.bin", io.BytesIO(b"\x00"), "application/octet-stream")},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 400
    assert "version" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_upload_firmware_rejects_duplicate_version(auth_client: AsyncClient):
    """POST /api/v1/firmware/upload — rejects duplicate version."""
    csrf = _extract_csrf(auth_client)
    # First upload
    await auth_client.post(
        "/api/v1/firmware/upload",
        data={"version": "2.0.0"},
        files={"file": ("fw.bin", io.BytesIO(b"\x00\x01"), "application/octet-stream")},
        headers={"x-csrf-token": csrf},
    )
    # Duplicate
    response = await auth_client.post(
        "/api/v1/firmware/upload",
        data={"version": "2.0.0"},
        files={"file": ("fw.bin", io.BytesIO(b"\x00\x01"), "application/octet-stream")},
        headers={"x-csrf-token": csrf},
    )
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_firmware(auth_client: AsyncClient):
    """GET /api/v1/firmware/ — lists all firmware versions."""
    response = await auth_client.get("/api/v1/firmware/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "version" in data[0]
    assert "checksum_sha256" in data[0]


@pytest.mark.asyncio
async def test_latest_firmware_requires_device_auth(client: AsyncClient):
    """GET /api/v1/firmware/latest — requires device auth headers, returns 422/401 without them."""
    response = await client.get("/api/v1/firmware/latest")
    assert response.status_code in (401, 422)


@pytest.mark.asyncio
async def test_upload_firmware_forbidden_for_non_admin(client: AsyncClient):
    """POST /api/v1/firmware/upload — unauthenticated returns 401/403."""
    response = await client.post(
        "/api/v1/firmware/upload",
        data={"version": "9.9.9"},
        files={"file": ("fw.bin", io.BytesIO(b"\x00"), "application/octet-stream")},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_firmware_ota_status(auth_client: AsyncClient):
    """GET /api/v1/firmware/status — returns OTA status for devices."""
    response = await auth_client.get("/api/v1/firmware/status")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
