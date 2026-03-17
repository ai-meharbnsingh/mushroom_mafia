from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.utils.time import utcnow_naive
from app.models.device import Device
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole, SubscriptionStatus, AuditAction
from app.schemas.device import (
    DeviceUpdate,
    DeviceResponse,
    DeviceProvision,
    DeviceProvisionResponse,
    DeviceAssignRequest,
    DeviceAssignResponse,
    KillSwitchRequest,
    DeviceLinkRequest,
    DeviceLinkResponse,
    PendingApprovalResponse,
    DeviceApproveRequest,
    QrImageUpload,
    QrImageResponse,
)
from app.utils.security import (
    generate_license_key,
    encrypt_device_password,
)
from app.api.deps import get_current_user, require_roles
from app.services.ws_manager import ws_manager
from app.services.audit_service import write_audit_log

router = APIRouter()


@router.get("/pending", response_model=list[DeviceResponse], summary="List devices with PENDING status")
async def list_pending_devices(
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List devices with subscription_status=PENDING."""
    result = await db.execute(
        select(Device).where(
            Device.subscription_status == SubscriptionStatus.PENDING,
            Device.is_active == True,
        )
    )
    return result.scalars().all()


@router.get("/", response_model=list[DeviceResponse], summary="List all devices for the current user")
async def list_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List devices filtered by owner_id. Unassigned devices only visible to admins of same org."""
    assigned_conditions = [
        Plant.owner_id == current_user.owner_id,
        Device.is_active == True,
    ]

    is_admin = current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]

    if not is_admin:
        if not current_user.assigned_plants:
            return []
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        assigned_conditions.append(Plant.plant_id.in_(assigned_ids))

    # Devices assigned to rooms owned by current user's organization
    assigned_query = (
        select(Device)
        .join(Room, Device.room_id == Room.room_id)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(*assigned_conditions)
    )
    result_assigned = await db.execute(assigned_query)
    assigned_devices = list(result_assigned.scalars().all())

    # Unassigned devices — only admins, scoped to their org's plants
    unassigned_devices = []
    if is_admin:
        unassigned_query = select(Device).where(
            Device.room_id.is_(None),
            Device.is_active == True,
            Device.assigned_to_plant_id.in_(
                select(Plant.plant_id).where(Plant.owner_id == current_user.owner_id)
            ),
        )
        result_unassigned = await db.execute(unassigned_query)
        unassigned_devices = list(result_unassigned.scalars().all())

        # SUPER_ADMIN also sees truly orphaned devices (no plant yet)
        if current_user.role == UserRole.SUPER_ADMIN:
            orphan_query = select(Device).where(
                Device.room_id.is_(None),
                Device.assigned_to_plant_id.is_(None),
                Device.is_active == True,
            )
            result_orphan = await db.execute(orphan_query)
            unassigned_devices += list(result_orphan.scalars().all())

    return assigned_devices + unassigned_devices


@router.get("/{device_id}", response_model=DeviceResponse, summary="Get a device by ID")
async def get_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get device by ID."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )
    # If device is assigned to a room, verify ownership
    if device.room_id is not None:
        room_result = await db.execute(
            select(Room)
            .join(Plant, Room.plant_id == Plant.plant_id)
            .where(
                Room.room_id == device.room_id,
                Plant.owner_id == current_user.owner_id,
            )
        )
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not allowed to view this device",
            )
    return device


@router.put("/{device_id}", response_model=DeviceResponse, summary="Update device details or assign to a room")
async def update_device(
    device_id: int,
    device_in: DeviceUpdate,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Update device (assign room, rename). ADMIN/MANAGER."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )
    update_data = device_in.model_dump(exclude_unset=True)
    # If assigning to a room, verify the room belongs to the user's owner
    if "room_id" in update_data and update_data["room_id"] is not None:
        room_result = await db.execute(
            select(Room)
            .join(Plant, Room.plant_id == Plant.plant_id)
            .where(
                Room.room_id == update_data["room_id"],
                Plant.owner_id == current_user.owner_id,
            )
        )
        room = room_result.scalar_one_or_none()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or does not belong to your organization",
            )
    for field, value in update_data.items():
        setattr(device, field, value)
    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{device_id}", status_code=status.HTTP_200_OK, summary="Deactivate a device")
async def delete_device(
    device_id: int,
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Delete device. ADMIN+ only."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )
    device.is_active = False
    await write_audit_log(
        db, AuditAction.DELETE,
        user_id=current_user.user_id, table_name="devices",
        record_id=device_id,
        old_value={"device_name": device.device_name, "license_key": device.license_key},
        request=request,
    )
    await db.commit()
    return {"detail": "Device deactivated"}


@router.post("/provision", response_model=DeviceProvisionResponse, summary="Provision a new device and generate license key")
async def provision_device(
    provision_in: DeviceProvision,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Provision a new device (ADMIN+ only).
    Auto-generates a license_key. Device starts with PENDING status."""
    from app.models.enums import DeviceType

    license_key = generate_license_key()

    device = Device(
        mac_address=provision_in.mac_address,
        device_name=provision_in.device_name,
        device_type=DeviceType(provision_in.device_type),
        license_key=license_key,
        subscription_status=SubscriptionStatus.PENDING,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    await write_audit_log(
        db, AuditAction.CREATE,
        user_id=current_user.user_id, table_name="devices",
        record_id=device.device_id,
        new_value={"device_name": device.device_name, "mac_address": device.mac_address, "license_key": license_key},
        request=request,
    )
    await db.commit()

    return DeviceProvisionResponse(
        device_id=device.device_id,
        license_key=device.license_key,
        device_name=device.device_name,
        subscription_status=device.subscription_status.value,
    )


@router.post("/{device_id}/assign", response_model=DeviceAssignResponse, summary="Assign a device to a plant")
async def assign_device(
    device_id: int,
    assign_in: DeviceAssignRequest,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Assign a device to a plant (ADMIN+ only).
    Generates a device password, encrypts it, sets status to ACTIVE."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    # Verify the plant exists
    plant_result = await db.execute(
        select(Plant).where(Plant.plant_id == assign_in.plant_id)
    )
    plant = plant_result.scalar_one_or_none()
    if not plant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found"
        )

    # Use the HiveMQ broker password so the device can authenticate
    from app.config import settings
    plain_password = settings.MQTT_PASSWORD
    encrypted_password = encrypt_device_password(plain_password)

    device.device_password = encrypted_password
    device.assigned_to_plant_id = assign_in.plant_id
    device.subscription_status = SubscriptionStatus.ACTIVE

    await db.commit()
    await db.refresh(device)

    return DeviceAssignResponse(
        device_id=device.device_id,
        license_key=device.license_key,
        assigned_to_plant_id=device.assigned_to_plant_id,
        subscription_status=device.subscription_status.value,
    )


@router.post("/{device_id}/kill-switch", summary="Enable or disable a device remotely")
async def kill_switch(
    device_id: int,
    kill_in: KillSwitchRequest,
    request: Request,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Enable or disable a device via kill-switch (ADMIN+ only).
    DISABLE = suspend device, ENABLE = reactivate device.
    Publishes control command via MQTT."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    action = kill_in.action.upper()
    if action not in ("ENABLE", "DISABLE"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be ENABLE or DISABLE",
        )

    old_status = device.subscription_status.value
    if action == "DISABLE":
        device.subscription_status = SubscriptionStatus.SUSPENDED
    else:
        device.subscription_status = SubscriptionStatus.ACTIVE

    await write_audit_log(
        db, AuditAction.CONFIG_CHANGE,
        user_id=current_user.user_id, table_name="devices",
        record_id=device_id,
        old_value={"subscription_status": old_status},
        new_value={"subscription_status": device.subscription_status.value, "action": action},
        request=request,
    )
    await db.commit()

    # Publish control command via MQTT
    try:
        from app.services.mqtt_client import mqtt_manager

        await mqtt_manager.publish_control(device.license_key, action)
    except Exception:
        pass  # MQTT may not be running during dev

    return {"detail": f"Device {action}d successfully"}


@router.post("/{device_id}/revoke", summary="Permanently revoke a device")
async def revoke_device(
    device_id: int,
    current_user: User = Depends(require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Revoke a device permanently (ADMIN+ only).
    Sets subscription to EXPIRED, deactivates device, publishes DISABLE via MQTT."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    device.subscription_status = SubscriptionStatus.EXPIRED
    device.is_active = False

    await db.commit()

    # Publish DISABLE via MQTT
    try:
        from app.services.mqtt_client import mqtt_manager

        await mqtt_manager.publish_control(device.license_key, "DISABLE")
    except Exception:
        pass  # MQTT may not be running during dev

    return {"detail": "Device revoked successfully"}


# --- Device Onboarding (QR Scan / Link / Approve / QR Image) ---


@router.post("/link", response_model=DeviceLinkResponse, summary="Link a device to a room via QR scan")
async def link_device(
    link_in: DeviceLinkRequest,
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Link a device to a room via QR scan (ADMIN+ only).

    Finds device by license_key, validates it is in PENDING status,
    validates the room belongs to the user's organization, then sets
    the device to PENDING_APPROVAL status awaiting admin approval.
    """
    # Find device by license_key
    result = await db.execute(
        select(Device).where(
            Device.license_key == link_in.license_key,
            Device.is_active == True,
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found with the provided license key",
        )

    # Device must be in PENDING status to be linked
    if device.subscription_status != SubscriptionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device is not in PENDING status (current: {device.subscription_status.value})",
        )

    # Validate room exists and belongs to the user's organization
    room_result = await db.execute(
        select(Room)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Room.room_id == link_in.room_id,
            Plant.owner_id == current_user.owner_id,
        )
    )
    room = room_result.scalar_one_or_none()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found or does not belong to your organization",
        )

    # Update device
    device.subscription_status = SubscriptionStatus.PENDING_APPROVAL
    device.room_id = link_in.room_id
    device.linked_by_user_id = current_user.user_id
    device.linked_at = utcnow_naive()

    await db.commit()
    await db.refresh(device)

    # Broadcast WebSocket event to plant owner
    try:
        owner_result = await db.execute(
            select(Plant.owner_id)
            .join(Room, Room.plant_id == Plant.plant_id)
            .where(Room.room_id == device.room_id)
        )
        owner_id = owner_result.scalar_one_or_none()
        if owner_id:
            await ws_manager.broadcast_to_owner(
                owner_id,
                "device_registered",
                {
                    "device_id": device.device_id,
                    "device_name": device.device_name or f"Device-{device.device_id}",
                    "room_id": device.room_id,
                    "status": "PENDING_APPROVAL",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                },
            )
    except Exception:
        pass  # WebSocket notification is best-effort

    return DeviceLinkResponse(
        device_id=device.device_id,
        name=device.device_name or f"Device-{device.device_id}",
        status=device.subscription_status.value,
        room_id=device.room_id,
    )


@router.get("/pending-approval", response_model=list[PendingApprovalResponse], summary="List devices awaiting approval")
async def list_pending_approval_devices(
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """List devices with subscription_status=PENDING_APPROVAL (SUPER_ADMIN only)."""
    result = await db.execute(
        select(
            Device.device_id,
            Device.device_name,
            Device.license_key,
            Device.mac_address,
            Device.room_id,
            Room.room_name,
            User.username,
            Device.linked_at,
        )
        .outerjoin(Room, Device.room_id == Room.room_id)
        .outerjoin(User, Device.linked_by_user_id == User.user_id)
        .where(
            Device.subscription_status == SubscriptionStatus.PENDING_APPROVAL,
            Device.is_active == True,
        )
    )
    rows = result.all()

    return [
        PendingApprovalResponse(
            device_id=row.device_id,
            name=row.device_name or f"Device-{row.device_id}",
            license_key=row.license_key,
            mac_address=row.mac_address,
            room_id=row.room_id,
            room_name=row.room_name,
            linked_by_username=row.username,
            linked_at=row.linked_at,
        )
        for row in rows
    ]


@router.post("/{device_id}/approve", summary="Approve or reject a pending device")
async def approve_device(
    device_id: int,
    approve_in: DeviceApproveRequest,
    request: Request,
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Approve or reject a device that is pending approval (SUPER_ADMIN only).

    APPROVE: Generate MQTT credentials, set status to ACTIVE.
    REJECT: Revert status to PENDING, clear room assignment and link info.
    """
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    if device.subscription_status != SubscriptionStatus.PENDING_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Device is not pending approval (current: {device.subscription_status.value})",
        )

    action = approve_in.action.upper()
    if action not in ("APPROVE", "REJECT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action must be APPROVE or REJECT",
        )

    if action == "APPROVE":
        # Use the HiveMQ broker password so the device can authenticate
        from app.config import settings
        plain_password = settings.MQTT_PASSWORD
        encrypted_password = encrypt_device_password(plain_password)
        device.device_password = encrypted_password
        device.subscription_status = SubscriptionStatus.ACTIVE
        await write_audit_log(
            db, AuditAction.CONFIG_CHANGE,
            user_id=current_user.user_id, table_name="devices",
            record_id=device_id,
            old_value={"subscription_status": "PENDING_APPROVAL"},
            new_value={"subscription_status": "ACTIVE", "action": "APPROVE"},
            request=request,
        )
        await db.commit()
        await db.refresh(device)
        return {
            "detail": "Device approved successfully",
            "device_id": device.device_id,
            "status": device.subscription_status.value,
        }
    else:
        # REJECT: revert to PENDING, clear link info
        device.subscription_status = SubscriptionStatus.PENDING
        device.room_id = None
        device.linked_by_user_id = None
        device.linked_at = None
        await write_audit_log(
            db, AuditAction.CONFIG_CHANGE,
            user_id=current_user.user_id, table_name="devices",
            record_id=device_id,
            old_value={"subscription_status": "PENDING_APPROVAL"},
            new_value={"subscription_status": "PENDING", "action": "REJECT"},
            request=request,
        )
        await db.commit()
        await db.refresh(device)
        return {
            "detail": "Device rejected, reverted to PENDING",
            "device_id": device.device_id,
            "status": device.subscription_status.value,
        }


@router.post("/{device_id}/qr-image", summary="Upload a QR code image for a device")
async def upload_qr_image(
    device_id: int,
    qr_in: QrImageUpload,
    current_user: User = Depends(
        require_roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Upload a QR code image (base64) for a device (ADMIN+ only)."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    device.qr_code_image = qr_in.image
    await db.commit()

    return {"detail": "QR code image saved successfully"}


@router.get("/{device_id}/qr-image", response_model=QrImageResponse, summary="Get the stored QR code image for a device")
async def get_qr_image(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get the stored QR code image for a device."""
    result = await db.execute(
        select(Device).where(
            Device.device_id == device_id, Device.is_active == True
        )
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Device not found"
        )

    if not device.qr_code_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No QR code image stored for this device",
        )

    return QrImageResponse(image=device.qr_code_image)
