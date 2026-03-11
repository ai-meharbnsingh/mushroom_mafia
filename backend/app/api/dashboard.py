import json
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from redis.asyncio import Redis

from app.database import get_db
from app.redis_client import get_redis
from app.models.user import User
from app.models.plant import Plant
from app.models.room import Room
from app.models.device import Device
from app.models.alert import Alert
from app.models.enums import Severity, UserRole, SubscriptionStatus, RoomType
from app.schemas.dashboard import (
    DashboardSummary,
    AdminDashboardSummary,
    DeviceStatusBreakdown,
    SubscriptionBreakdown,
    RoomTypeBreakdown,
    AlertSummaryBreakdown,
    PlantOverview,
    RecentDeviceEvent,
    PlantDashboardSummary,
    PlantRoomSummary,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return dashboard summary counts filtered by the current user's owner_id and assigned plants."""
    owner_id = current_user.owner_id
    
    plant_condition = Plant.owner_id == owner_id
    is_admin = current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
    if not is_admin:
        if not current_user.assigned_plants:
            # If no assigned plants and not an admin, everything is 0
            return DashboardSummary(
                total_plants=0, total_rooms=0, total_devices=0,
                active_devices=0, active_alerts=0, critical_alerts=0
            )
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        plant_condition = Plant.plant_id.in_(assigned_ids)

    # Count plants
    plants_result = await db.execute(
        select(func.count(Plant.plant_id)).where(
            plant_condition, Plant.is_active == True
        )
    )
    total_plants = plants_result.scalar() or 0

    # Count rooms (via plants)
    rooms_result = await db.execute(
        select(func.count(Room.room_id))
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(plant_condition, Room.is_active == True)
    )
    total_rooms = rooms_result.scalar() or 0

    # Count devices (total + online), via rooms -> plants
    devices_result = await db.execute(
        select(func.count(Device.device_id))
        .join(Room, Room.room_id == Device.room_id)
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(plant_condition, Device.is_active == True)
    )
    total_devices = devices_result.scalar() or 0

    online_devices_result = await db.execute(
        select(func.count(Device.device_id))
        .join(Room, Room.room_id == Device.room_id)
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(
            plant_condition,
            Device.is_active == True,
            Device.is_online == True,
        )
    )
    active_devices = online_devices_result.scalar() or 0

    # Count active (unresolved) alerts
    active_alerts_result = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .join(Room, Room.room_id == Device.room_id)
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(plant_condition, Alert.is_resolved == False)
    )
    active_alerts = active_alerts_result.scalar() or 0

    # Count critical alerts (unresolved + CRITICAL severity)
    critical_alerts_result = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .join(Room, Room.room_id == Device.room_id)
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(
            plant_condition,
            Alert.is_resolved == False,
            Alert.severity == Severity.CRITICAL,
        )
    )
    critical_alerts = critical_alerts_result.scalar() or 0

    return DashboardSummary(
        total_plants=total_plants,
        total_rooms=total_rooms,
        total_devices=total_devices,
        active_devices=active_devices,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
    )


@router.get("/current-readings")
async def get_current_readings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Return all live readings for the current owner's devices from Redis."""
    owner_id = current_user.owner_id

    plant_condition = Plant.owner_id == owner_id
    is_admin = current_user.role in [UserRole.SUPER_ADMIN, UserRole.ADMIN]
    if not is_admin:
        if not current_user.assigned_plants:
            return {"readings": []}
        assigned_ids = [int(pid) for pid in current_user.assigned_plants]
        plant_condition = Plant.plant_id.in_(assigned_ids)

    # Get all device IDs for this owner/assigned plants
    result = await db.execute(
        select(Device.device_id)
        .join(Room, Room.room_id == Device.room_id)
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(plant_condition, Device.is_active == True)
    )
    device_ids = [row[0] for row in result.all()]

    readings = []
    for device_id in device_ids:
        raw = await redis.get(f"live:device:{device_id}")
        if raw:
            readings.append(json.loads(raw))

    return {"readings": readings}


@router.get("/admin-summary", response_model=AdminDashboardSummary)
async def get_admin_dashboard(
    current_user: User = Depends(
        require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return comprehensive admin dashboard data filtered by owner_id."""
    owner_id = current_user.owner_id

    # --- Top-level counts ---
    plants_q = await db.execute(
        select(func.count(Plant.plant_id)).where(
            Plant.owner_id == owner_id, Plant.is_active == True
        )
    )
    total_plants = plants_q.scalar() or 0

    rooms_q = await db.execute(
        select(func.count(Room.room_id))
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(Plant.owner_id == owner_id, Room.is_active == True)
    )
    total_rooms = rooms_q.scalar() or 0

    # Total devices (all active devices for this owner, including unassigned)
    # Devices linked via assigned_to_plant_id OR via room->plant
    devices_q = await db.execute(
        select(func.count(Device.device_id)).where(
            Device.is_active == True,
            or_(
                Device.assigned_to_plant_id.in_(
                    select(Plant.plant_id).where(Plant.owner_id == owner_id)
                ),
                Device.room_id.in_(
                    select(Room.room_id)
                    .join(Plant, Plant.plant_id == Room.plant_id)
                    .where(Plant.owner_id == owner_id)
                ),
            ),
        )
    )
    total_devices = devices_q.scalar() or 0

    users_q = await db.execute(
        select(func.count(User.user_id)).where(
            User.owner_id == owner_id, User.is_active == True
        )
    )
    total_users = users_q.scalar() or 0

    # --- Device status breakdown ---
    # Build a subquery for owner's devices
    owner_device_ids = (
        select(Device.device_id)
        .where(
            Device.is_active == True,
            or_(
                Device.assigned_to_plant_id.in_(
                    select(Plant.plant_id).where(Plant.owner_id == owner_id)
                ),
                Device.room_id.in_(
                    select(Room.room_id)
                    .join(Plant, Plant.plant_id == Room.plant_id)
                    .where(Plant.owner_id == owner_id)
                ),
            ),
        )
    ).scalar_subquery()

    online_q = await db.execute(
        select(func.count(Device.device_id)).where(
            Device.device_id.in_(owner_device_ids),
            Device.is_online == True,
        )
    )
    online_count = online_q.scalar() or 0

    unassigned_q = await db.execute(
        select(func.count(Device.device_id)).where(
            Device.device_id.in_(owner_device_ids),
            Device.room_id.is_(None),
        )
    )
    unassigned_count = unassigned_q.scalar() or 0

    device_status = DeviceStatusBreakdown(
        total=total_devices,
        online=online_count,
        offline=total_devices - online_count,
        unassigned=unassigned_count,
    )

    # --- Subscription breakdown ---
    sub_q = await db.execute(
        select(
            Device.subscription_status,
            func.count(Device.device_id),
        )
        .where(Device.device_id.in_(owner_device_ids))
        .group_by(Device.subscription_status)
    )
    sub_counts = {row[0]: row[1] for row in sub_q.all()}
    subscriptions = SubscriptionBreakdown(
        active=sub_counts.get(SubscriptionStatus.ACTIVE, 0),
        pending=sub_counts.get(SubscriptionStatus.PENDING, 0),
        suspended=sub_counts.get(SubscriptionStatus.SUSPENDED, 0),
        expired=sub_counts.get(SubscriptionStatus.EXPIRED, 0),
    )

    # --- Room type breakdown ---
    room_type_q = await db.execute(
        select(Room.room_type, func.count(Room.room_id))
        .join(Plant, Plant.plant_id == Room.plant_id)
        .where(Plant.owner_id == owner_id, Room.is_active == True)
        .group_by(Room.room_type)
    )
    room_type_counts = {row[0]: row[1] for row in room_type_q.all()}
    room_types = RoomTypeBreakdown(
        fruiting=room_type_counts.get(RoomType.FRUITING, 0),
        spawn_run=room_type_counts.get(RoomType.SPAWN_RUN, 0),
        incubation=room_type_counts.get(RoomType.INCUBATION, 0),
        storage=room_type_counts.get(RoomType.STORAGE, 0),
    )

    # --- Alert summary ---
    today_start = datetime.utcnow().replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    alert_active_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .where(Device.device_id.in_(owner_device_ids), Alert.is_resolved == False)
    )
    alert_active = alert_active_q.scalar() or 0

    alert_critical_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .where(
            Device.device_id.in_(owner_device_ids),
            Alert.is_resolved == False,
            Alert.severity == Severity.CRITICAL,
        )
    )
    alert_critical = alert_critical_q.scalar() or 0

    alert_warning_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .where(
            Device.device_id.in_(owner_device_ids),
            Alert.is_resolved == False,
            Alert.severity == Severity.WARNING,
        )
    )
    alert_warning = alert_warning_q.scalar() or 0

    alert_ack_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .where(
            Device.device_id.in_(owner_device_ids),
            Alert.is_resolved == False,
            Alert.acknowledged_at.isnot(None),
        )
    )
    alert_acknowledged = alert_ack_q.scalar() or 0

    alert_resolved_today_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .where(
            Device.device_id.in_(owner_device_ids),
            Alert.is_resolved == True,
            Alert.resolved_at >= today_start,
        )
    )
    alert_resolved_today = alert_resolved_today_q.scalar() or 0

    alerts = AlertSummaryBreakdown(
        active=alert_active,
        critical=alert_critical,
        warning=alert_warning,
        acknowledged=alert_acknowledged,
        resolved_today=alert_resolved_today,
    )

    # --- Per-plant overview ---
    plants_list = await db.execute(
        select(Plant).where(Plant.owner_id == owner_id, Plant.is_active == True)
    )
    plant_overviews = []
    for plant in plants_list.scalars().all():
        pid = plant.plant_id

        p_rooms_q = await db.execute(
            select(func.count(Room.room_id)).where(
                Room.plant_id == pid, Room.is_active == True
            )
        )
        p_rooms = p_rooms_q.scalar() or 0

        p_devices_q = await db.execute(
            select(func.count(Device.device_id))
            .join(Room, Room.room_id == Device.room_id)
            .where(Room.plant_id == pid, Device.is_active == True)
        )
        p_devices = p_devices_q.scalar() or 0

        p_online_q = await db.execute(
            select(func.count(Device.device_id))
            .join(Room, Room.room_id == Device.room_id)
            .where(
                Room.plant_id == pid,
                Device.is_active == True,
                Device.is_online == True,
            )
        )
        p_online = p_online_q.scalar() or 0

        p_alerts_q = await db.execute(
            select(func.count(Alert.alert_id))
            .join(Device, Device.device_id == Alert.device_id)
            .join(Room, Room.room_id == Device.room_id)
            .where(Room.plant_id == pid, Alert.is_resolved == False)
        )
        p_alerts = p_alerts_q.scalar() or 0

        plant_overviews.append(
            PlantOverview(
                plant_id=pid,
                plant_name=plant.plant_name,
                plant_code=plant.plant_code,
                plant_type=plant.plant_type.value if plant.plant_type else "UNKNOWN",
                total_rooms=p_rooms,
                total_devices=p_devices,
                online_devices=p_online,
                active_alerts=p_alerts,
            )
        )

    # --- Recent device events ---
    recent_q = await db.execute(
        select(Device.device_id, Device.device_name, Device.registered_at, Device.last_seen, Device.is_online)
        .where(Device.device_id.in_(owner_device_ids))
        .order_by(func.coalesce(Device.last_seen, Device.registered_at).desc())
        .limit(10)
    )
    recent_events = []
    for row in recent_q.all():
        dev_id, dev_name, reg_at, last_seen, is_online = row
        if last_seen:
            event = "online" if is_online else "offline"
            ts = last_seen.isoformat()
        else:
            event = "registered"
            ts = reg_at.isoformat() if reg_at else ""
        recent_events.append(
            RecentDeviceEvent(
                device_id=dev_id,
                device_name=dev_name or f"Device-{dev_id}",
                event=event,
                timestamp=ts,
            )
        )

    return AdminDashboardSummary(
        total_plants=total_plants,
        total_rooms=total_rooms,
        total_devices=total_devices,
        total_users=total_users,
        device_status=device_status,
        subscriptions=subscriptions,
        room_types=room_types,
        alerts=alerts,
        plants=plant_overviews,
        recent_events=recent_events,
    )


@router.get("/plant/{plant_id}", response_model=PlantDashboardSummary)
async def get_plant_dashboard(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return plant-specific dashboard data. Ownership check applied."""
    from app.models.enums import RoomStatus

    result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = result.scalar_one_or_none()
    if not plant:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Plant not found")
    if plant.owner_id != current_user.owner_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not allowed to view this plant")

    # Rooms for this plant
    rooms_result = await db.execute(
        select(Room).where(Room.plant_id == plant_id, Room.is_active == True)
    )
    rooms = rooms_result.scalars().all()
    total_rooms = len(rooms)

    # Build room summaries with device info
    room_summaries = []
    for room in rooms:
        dev_result = await db.execute(
            select(Device).where(
                Device.room_id == room.room_id, Device.is_active == True
            )
        )
        device = dev_result.scalars().first()
        room_summaries.append(
            PlantRoomSummary(
                room_id=room.room_id,
                room_name=room.room_name,
                room_code=room.room_code,
                room_type=room.room_type.value if room.room_type else "FRUITING",
                status=room.status.value if room.status else "ACTIVE",
                has_device=device is not None,
                device_name=device.device_name if device else None,
                is_online=device.is_online if device else False,
            )
        )

    # Device counts
    devices_q = await db.execute(
        select(func.count(Device.device_id))
        .join(Room, Room.room_id == Device.room_id)
        .where(Room.plant_id == plant_id, Device.is_active == True)
    )
    total_devices = devices_q.scalar() or 0

    online_q = await db.execute(
        select(func.count(Device.device_id))
        .join(Room, Room.room_id == Device.room_id)
        .where(Room.plant_id == plant_id, Device.is_active == True, Device.is_online == True)
    )
    online_devices = online_q.scalar() or 0

    # Alert counts
    alerts_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .join(Room, Room.room_id == Device.room_id)
        .where(Room.plant_id == plant_id, Alert.is_resolved == False)
    )
    active_alerts = alerts_q.scalar() or 0

    critical_q = await db.execute(
        select(func.count(Alert.alert_id))
        .join(Device, Device.device_id == Alert.device_id)
        .join(Room, Room.room_id == Device.room_id)
        .where(
            Room.plant_id == plant_id,
            Alert.is_resolved == False,
            Alert.severity == Severity.CRITICAL,
        )
    )
    critical_alerts = critical_q.scalar() or 0

    return PlantDashboardSummary(
        plant_id=plant.plant_id,
        plant_name=plant.plant_name,
        plant_code=plant.plant_code,
        plant_type=plant.plant_type.value if plant.plant_type else "OYSTER",
        city=plant.city,
        state=plant.state,
        pincode=plant.pincode,
        total_rooms=total_rooms,
        total_devices=total_devices,
        online_devices=online_devices,
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        rooms=room_summaries,
    )
