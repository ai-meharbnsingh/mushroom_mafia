import hashlib
import io
import logging
import os
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Header
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, desc

from app.database import get_db
from app.utils.time import utcnow_naive
from app.models.device import Device
from app.models.firmware import Firmware
from app.models.firmware_file import FirmwareFile
from app.models.user import User
from app.models.enums import UserRole, SubscriptionStatus
from app.schemas.firmware import (
    FirmwareResponse,
    OTARolloutRequest,
    OTAStatusResponse,
)
from app.api.deps import get_current_user, require_roles

logger = logging.getLogger(__name__)

router = APIRouter()

# Firmware binary storage directory
FIRMWARE_DIR = Path(__file__).resolve().parent.parent.parent / "firmware_files"
FIRMWARE_DIR.mkdir(exist_ok=True)


async def verify_device_key(
    x_device_id: int = Header(..., alias="X-Device-ID"),
    x_device_key: str = Header(..., alias="X-Device-Key"),
    db: AsyncSession = Depends(get_db),
) -> Device:
    """Verify device credentials via headers."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == x_device_id,
            Device.secret_key == x_device_key,
            Device.is_active == True,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid device credentials",
        )
    return device


@router.post("/upload", response_model=FirmwareResponse)
async def upload_firmware(
    file: UploadFile = File(...),
    version: str = Form(...),
    release_notes: str = Form(None),
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Upload a firmware .bin file (ADMIN+ only).

    Computes SHA256 checksum, saves the file to disk, and creates a DB record.
    Marks all previous firmware versions as inactive.
    """
    # Validate file extension
    if not file.filename or not file.filename.endswith(".bin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .bin firmware files are accepted",
        )

    # Validate version format (alphanumeric, dots, hyphens, plus signs)
    if not re.match(r'^[\w][\w.+-]*$', version):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid version format. Use alphanumeric characters, dots, hyphens, and plus signs.",
        )

    # Check version uniqueness
    existing = await db.execute(
        select(Firmware).where(Firmware.version == version)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Firmware version {version} already exists",
        )

    # Read file content and compute SHA256
    content = await file.read()
    file_size = len(content)
    checksum = hashlib.sha256(content).hexdigest()

    # Save file to disk
    filename = f"firmware_v{version}.bin"
    file_path = FIRMWARE_DIR / filename
    file_path.write_bytes(content)

    # Mark all previous firmware as inactive
    await db.execute(
        update(Firmware).where(Firmware.is_active == True).values(is_active=False)
    )

    # Create DB record
    firmware = Firmware(
        version=version,
        checksum_sha256=checksum,
        file_path=str(file_path),
        file_size=file_size,
        release_notes=release_notes,
        created_by=current_user.user_id,
        is_active=True,
    )
    db.add(firmware)
    await db.commit()
    await db.refresh(firmware)

    logger.info(
        "Firmware v%s uploaded by user %s (size=%d, sha256=%s)",
        version, current_user.user_id, file_size, checksum,
    )

    return firmware


@router.get("/", response_model=list[FirmwareResponse])
async def list_firmware(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all firmware versions ordered by created_at descending."""
    result = await db.execute(
        select(Firmware).order_by(Firmware.created_at.desc())
    )
    return result.scalars().all()


@router.get("/latest", response_model=FirmwareResponse)
async def get_latest_firmware(
    db: AsyncSession = Depends(get_db),
    device: Device = Depends(verify_device_key),
):
    """Returns the latest active firmware version and metadata.

    Requires X-Device-ID and X-Device-Key headers.
    """
    result = await db.execute(
        select(Firmware)
        .where(Firmware.is_active == True)
        .order_by(Firmware.created_at.desc())
        .limit(1)
    )
    firmware = result.scalar_one_or_none()
    if not firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active firmware version found",
        )
    return firmware


@router.get("/{firmware_id}/download")
async def download_firmware(
    firmware_id: int,
    db: AsyncSession = Depends(get_db),
    device: Device = Depends(verify_device_key),
):
    """Download firmware .bin file by ID.

    Used by ESP32 devices during OTA update. Requires X-Device-ID and X-Device-Key headers.
    """
    result = await db.execute(
        select(Firmware).where(Firmware.firmware_id == firmware_id)
    )
    firmware = result.scalar_one_or_none()
    if not firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware not found",
        )

    file_path = Path(firmware.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware file not found on disk",
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/octet-stream",
        filename=f"firmware_v{firmware.version}.bin",
        headers={
            "X-Checksum-SHA256": firmware.checksum_sha256,
            "X-Firmware-Version": firmware.version,
        },
    )


@router.post("/rollout")
async def rollout_firmware(
    rollout_in: OTARolloutRequest,
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Trigger OTA rollout to selected devices (ADMIN+ only).

    Publishes an MQTT message to each selected device's OTA topic
    with the download URL, version, and checksum.
    If device_ids is empty, targets all active devices.
    """
    # Validate firmware exists
    result = await db.execute(
        select(Firmware).where(Firmware.firmware_id == rollout_in.firmware_id)
    )
    firmware = result.scalar_one_or_none()
    if not firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware not found",
        )

    # Get target devices
    if rollout_in.device_ids:
        device_result = await db.execute(
            select(Device).where(
                Device.device_id.in_(rollout_in.device_ids),
                Device.is_active == True,
            )
        )
    else:
        # Target all active devices
        device_result = await db.execute(
            select(Device).where(
                Device.is_active == True,
                Device.subscription_status == SubscriptionStatus.ACTIVE,
            )
        )
    devices = device_result.scalars().all()

    if not devices:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active devices found for rollout",
        )

    # Build download URL
    api_scheme = os.getenv("API_SCHEME", "https")
    api_host = os.getenv("API_HOST", "localhost")
    api_port = os.getenv("API_PORT", "3800")
    download_url = (
        f"{api_scheme}://{api_host}:{api_port}/api/v1/firmware/"
        f"{firmware.firmware_id}/download"
    )

    # Publish MQTT OTA command to each device
    import json

    success_count = 0
    failed_count = 0

    try:
        from app.services.mqtt_client import mqtt_manager

        for device in devices:
            try:
                # Update device OTA status
                device.ota_status = "downloading"
                device.last_ota_at = utcnow_naive()

                # Publish OTA command via MQTT
                if mqtt_manager._client:
                    topic = f"device/{device.license_key}/ota"
                    payload = json.dumps({
                        "action": "update",
                        "version": firmware.version,
                        "url": download_url,
                        "checksum": firmware.checksum_sha256,
                        "size": firmware.file_size,
                    })
                    await mqtt_manager._client.publish(topic, payload)
                    logger.info(
                        "OTA command sent to device %s (license=%s) for v%s",
                        device.device_id, device.license_key, firmware.version,
                    )
                    success_count += 1
                else:
                    logger.warning(
                        "MQTT not connected — cannot send OTA to device %s",
                        device.device_id,
                    )
                    device.ota_status = "failed"
                    failed_count += 1
            except Exception as e:
                logger.error(
                    "Failed to send OTA to device %s: %s",
                    device.device_id, e,
                )
                device.ota_status = "failed"
                failed_count += 1

        await db.commit()
    except Exception as e:
        logger.error("OTA rollout error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OTA rollout failed: {str(e)}",
        )

    return {
        "detail": f"OTA rollout initiated for firmware v{firmware.version}",
        "firmware_version": firmware.version,
        "total_devices": len(devices),
        "success": success_count,
        "failed": failed_count,
        "download_url": download_url,
    }


@router.get("/status", response_model=list[OTAStatusResponse])
async def get_ota_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns OTA status for all active devices."""
    result = await db.execute(
        select(Device).where(Device.is_active == True)
    )
    devices = result.scalars().all()

    return [
        OTAStatusResponse(
            device_id=d.device_id,
            device_name=d.device_name or f"Device-{d.device_id}",
            firmware_version=d.firmware_version,
            ota_status=d.ota_status,
            last_ota_at=d.last_ota_at,
        )
        for d in devices
    ]


# =====================================================================
# FirmwareFile endpoints (in-DB binary storage for Web Serial / devices)
# =====================================================================


@router.post("/files/upload")
async def upload_firmware_file(
    file: UploadFile = File(...),
    version: str = Form(...),
    board_type: str = Form("ESP32"),
    notes: str = Form(None),
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Upload a .bin firmware file and store it in the database (ADMIN+ only).

    Computes SHA256, stores binary in DB, and marks it as the active version
    for the given board_type (deactivating previous active versions).
    """
    if not file.filename or not file.filename.endswith(".bin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .bin firmware files are accepted",
        )

    # Check version uniqueness
    existing = await db.execute(
        select(FirmwareFile).where(FirmwareFile.version == version)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Firmware file version {version} already exists",
        )

    content = await file.read()
    file_size = len(content)
    checksum = hashlib.sha256(content).hexdigest()

    # Deactivate previous active firmware for the same board_type
    await db.execute(
        update(FirmwareFile)
        .where(FirmwareFile.board_type == board_type, FirmwareFile.is_active == True)
        .values(is_active=False)
    )

    fw = FirmwareFile(
        version=version,
        filename=file.filename,
        file_data=content,
        file_size=file_size,
        checksum_sha256=checksum,
        board_type=board_type,
        upload_notes=notes,
        uploaded_by=current_user.user_id,
        is_active=True,
    )
    db.add(fw)
    await db.commit()
    await db.refresh(fw)

    logger.info(
        "FirmwareFile v%s uploaded by user %s (size=%d, sha256=%s, board=%s)",
        version, current_user.user_id, file_size, checksum, board_type,
    )

    return {
        "id": fw.id,
        "version": fw.version,
        "filename": fw.filename,
        "file_size": fw.file_size,
        "checksum_sha256": fw.checksum_sha256,
        "board_type": fw.board_type,
        "uploaded_at": fw.uploaded_at.isoformat() if fw.uploaded_at else None,
        "is_active": fw.is_active,
    }


@router.get("/files/latest")
async def get_latest_firmware_file(
    db: AsyncSession = Depends(get_db),
):
    """Get latest active firmware file metadata (no auth — devices call this)."""
    result = await db.execute(
        select(FirmwareFile)
        .where(FirmwareFile.is_active == True)
        .order_by(desc(FirmwareFile.uploaded_at))
        .limit(1)
    )
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active firmware file found",
        )
    return {
        "version": fw.version,
        "filename": fw.filename,
        "file_size": fw.file_size,
        "checksum_sha256": fw.checksum_sha256,
        "board_type": fw.board_type,
        "uploaded_at": fw.uploaded_at.isoformat() if fw.uploaded_at else None,
    }


@router.get("/files/latest/bin")
async def download_latest_firmware_file_bin(
    db: AsyncSession = Depends(get_db),
):
    """Download latest active firmware .bin binary (no auth — devices and Web Serial use this)."""
    result = await db.execute(
        select(FirmwareFile)
        .where(FirmwareFile.is_active == True)
        .order_by(desc(FirmwareFile.uploaded_at))
        .limit(1)
    )
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active firmware file found",
        )
    return StreamingResponse(
        io.BytesIO(fw.file_data),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{fw.filename}"',
            "Content-Length": str(fw.file_size),
            "X-Checksum-SHA256": fw.checksum_sha256,
            "X-Firmware-Version": fw.version,
        },
    )


@router.get("/files/versions")
async def list_firmware_file_versions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all firmware file versions (any authenticated user)."""
    result = await db.execute(
        select(FirmwareFile).order_by(desc(FirmwareFile.uploaded_at))
    )
    files = result.scalars().all()
    return [
        {
            "id": fw.id,
            "version": fw.version,
            "filename": fw.filename,
            "file_size": fw.file_size,
            "checksum_sha256": fw.checksum_sha256,
            "board_type": fw.board_type,
            "upload_notes": fw.upload_notes,
            "uploaded_at": fw.uploaded_at.isoformat() if fw.uploaded_at else None,
            "is_active": fw.is_active,
        }
        for fw in files
    ]


@router.get("/files/{version}/bin")
async def download_firmware_file_by_version(
    version: str,
    db: AsyncSession = Depends(get_db),
):
    """Download a specific firmware version .bin (no auth — devices use this)."""
    result = await db.execute(
        select(FirmwareFile).where(FirmwareFile.version == version)
    )
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Firmware file version {version} not found",
        )
    return StreamingResponse(
        io.BytesIO(fw.file_data),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": f'attachment; filename="{fw.filename}"',
            "Content-Length": str(fw.file_size),
            "X-Checksum-SHA256": fw.checksum_sha256,
            "X-Firmware-Version": fw.version,
        },
    )


@router.delete("/files/{version}")
async def delete_firmware_file(
    version: str,
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Delete a firmware file version (ADMIN+ only). Sets is_active=False."""
    result = await db.execute(
        select(FirmwareFile).where(FirmwareFile.version == version)
    )
    fw = result.scalar_one_or_none()
    if not fw:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Firmware file version {version} not found",
        )
    fw.is_active = False
    await db.commit()
    logger.info("FirmwareFile v%s deactivated by user %s", version, current_user.user_id)
    return {"detail": f"Firmware file version {version} deactivated"}
