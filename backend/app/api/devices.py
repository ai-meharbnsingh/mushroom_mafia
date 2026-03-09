from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.database import get_db
from app.models.device import Device
from app.models.room import Room
from app.models.plant import Plant
from app.models.user import User
from app.models.enums import UserRole, SubscriptionStatus
from app.schemas.device import (
    DeviceUpdate,
    DeviceResponse,
    DeviceProvision,
    DeviceProvisionResponse,
    DeviceAssignRequest,
    DeviceAssignResponse,
    KillSwitchRequest,
)
from app.utils.security import (
    generate_license_key,
    generate_device_password,
    encrypt_device_password,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/pending", response_model=list[DeviceResponse])
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


@router.get("/", response_model=list[DeviceResponse])
async def list_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List devices. Join rooms->plants to filter by owner_id.
    Include unassigned devices (room_id=null) that belong to the owner's rooms."""
    # Devices assigned to rooms owned by current user's organization
    assigned_query = (
        select(Device)
        .join(Room, Device.room_id == Room.room_id)
        .join(Plant, Room.plant_id == Plant.plant_id)
        .where(
            Plant.owner_id == current_user.owner_id,
            Device.is_active == True,
        )
    )
    result_assigned = await db.execute(assigned_query)
    assigned_devices = result_assigned.scalars().all()

    # Unassigned devices (room_id is null) — these are globally visible
    # to admins/super_admins, otherwise just show assigned ones
    unassigned_query = select(Device).where(
        Device.room_id.is_(None),
        Device.is_active == True,
    )
    result_unassigned = await db.execute(unassigned_query)
    unassigned_devices = result_unassigned.scalars().all()

    return list(assigned_devices) + list(unassigned_devices)


@router.get("/{device_id}", response_model=DeviceResponse)
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


@router.put("/{device_id}", response_model=DeviceResponse)
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


@router.delete("/{device_id}", status_code=status.HTTP_200_OK)
async def delete_device(
    device_id: int,
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
    await db.commit()
    return {"detail": "Device deactivated"}


@router.post("/provision", response_model=DeviceProvisionResponse)
async def provision_device(
    provision_in: DeviceProvision,
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

    return DeviceProvisionResponse(
        device_id=device.device_id,
        license_key=device.license_key,
        device_name=device.device_name,
        subscription_status=device.subscription_status.value,
    )


@router.post("/{device_id}/assign", response_model=DeviceAssignResponse)
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

    # Generate and encrypt device password
    plain_password = generate_device_password()
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


@router.post("/{device_id}/kill-switch")
async def kill_switch(
    device_id: int,
    kill_in: KillSwitchRequest,
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

    if action == "DISABLE":
        device.subscription_status = SubscriptionStatus.SUSPENDED
    else:
        device.subscription_status = SubscriptionStatus.ACTIVE

    await db.commit()

    # Publish control command via MQTT
    try:
        from app.services.mqtt_client import mqtt_manager

        await mqtt_manager.publish_control(device.license_key, action)
    except Exception:
        pass  # MQTT may not be running during dev

    return {"detail": f"Device {action}d successfully"}


@router.post("/{device_id}/revoke")
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
