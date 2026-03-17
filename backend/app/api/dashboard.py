import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, extract, case, cast, Float
from redis.asyncio import Redis

from app.database import get_db
from app.redis_client import get_redis
from app.utils.time import utcnow_naive
from app.models.user import User
from app.models.plant import Plant
from app.models.room import Room
from app.models.device import Device
from app.models.alert import Alert
from app.models.harvest import Harvest
from app.models.growth_cycle import GrowthCycle
from app.models.enums import Severity, UserRole, SubscriptionStatus, RoomType, HarvestGrade
from app.schemas.dashboard import (
    DashboardSummary,
    AdminDashboardSummary,
    DeviceStatusBreakdown,
    SubscriptionBreakdown,
    RoomTypeBreakdown,
    AlertSummaryBreakdown,
    PlantOverviewEnhanced,
    RecentDeviceEvent,
    PlantDashboardSummary,
    PlantRoomSummary,
)
from app.api.deps import get_current_user, require_roles

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary, summary="Get dashboard summary counts")
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


@router.get("/current-readings", summary="Get all live sensor readings from Redis")
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


@router.get("/admin-summary", response_model=AdminDashboardSummary, summary="Get comprehensive admin dashboard data")
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
    today_start = utcnow_naive().replace(
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

    # --- Per-plant overview (with monthly harvest yield) ---
    plants_list = await db.execute(
        select(Plant).where(Plant.owner_id == owner_id, Plant.is_active == True)
    )
    all_plants = plants_list.scalars().all()

    # Batch fetch monthly harvest stats per plant (via room -> plant join)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    plant_harvest_stats: dict[int, dict] = {}
    overall_yield = 0.0
    overall_harvests = 0
    overall_grade_a = 0
    overall_grade_b = 0
    overall_grade_c = 0
    if all_plants:
        plant_ids = [p.plant_id for p in all_plants]
        ph_q = await db.execute(
            select(
                Room.plant_id,
                func.coalesce(func.sum(cast(Harvest.weight_kg, Float)), 0.0),
                func.count(Harvest.harvest_id),
                func.count(case((Harvest.grade == HarvestGrade.A, 1))),
                func.count(case((Harvest.grade == HarvestGrade.B, 1))),
                func.count(case((Harvest.grade == HarvestGrade.C, 1))),
            )
            .join(Room, Room.room_id == Harvest.room_id)
            .where(
                Room.plant_id.in_(plant_ids),
                Harvest.harvested_at >= month_start,
            )
            .group_by(Room.plant_id)
        )
        for row in ph_q.all():
            y, c, a, b, cc = float(row[1]), row[2], row[3], row[4], row[5]
            plant_harvest_stats[row[0]] = {"yield_kg": y, "count": c, "a": a, "b": b, "c": cc}
            overall_yield += y
            overall_harvests += c
            overall_grade_a += a
            overall_grade_b += b
            overall_grade_c += cc

    plant_overviews = []
    for plant in all_plants:
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

        ph = plant_harvest_stats.get(pid, {})
        plant_overviews.append(
            PlantOverviewEnhanced(
                plant_id=pid,
                plant_name=plant.plant_name,
                plant_code=plant.plant_code,
                plant_type=plant.plant_type.value if plant.plant_type else "UNKNOWN",
                total_rooms=p_rooms,
                total_devices=p_devices,
                online_devices=p_online,
                active_alerts=p_alerts,
                month_yield_kg=ph.get("yield_kg", 0.0),
                month_harvests=ph.get("count", 0),
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
        overall_yield_kg=overall_yield,
        overall_harvests=overall_harvests,
        overall_grade_a=overall_grade_a,
        overall_grade_b=overall_grade_b,
        overall_grade_c=overall_grade_c,
    )


@router.get("/plant/{plant_id}", response_model=PlantDashboardSummary, summary="Get plant-specific dashboard data")
async def get_plant_dashboard(
    plant_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
):
    """Return plant-specific dashboard data with live readings & harvest stats."""
    result = await db.execute(
        select(Plant).where(Plant.plant_id == plant_id, Plant.is_active == True)
    )
    plant = result.scalar_one_or_none()
    if not plant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plant not found")
    if plant.owner_id != current_user.owner_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to view this plant")

    # Rooms for this plant
    rooms_result = await db.execute(
        select(Room).where(Room.plant_id == plant_id, Room.is_active == True)
    )
    rooms = rooms_result.scalars().all()
    total_rooms = len(rooms)

    # Current month boundaries for harvest query
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Harvest summary for all rooms in this plant (current month)
    room_ids = [r.room_id for r in rooms]
    harvest_stats: dict[int, dict] = {}
    if room_ids:
        harvest_q = await db.execute(
            select(
                Harvest.room_id,
                func.coalesce(func.sum(cast(Harvest.weight_kg, Float)), 0.0),
                func.count(Harvest.harvest_id),
                func.count(case((Harvest.grade == HarvestGrade.A, 1))),
                func.count(case((Harvest.grade == HarvestGrade.B, 1))),
                func.count(case((Harvest.grade == HarvestGrade.C, 1))),
            )
            .where(
                Harvest.room_id.in_(room_ids),
                Harvest.harvested_at >= month_start,
            )
            .group_by(Harvest.room_id)
        )
        for row in harvest_q.all():
            harvest_stats[row[0]] = {
                "yield_kg": float(row[1]),
                "count": row[2],
                "a": row[3], "b": row[4], "c": row[5],
            }

    # Active growth cycles for rooms (with day count)
    growth_info: dict[int, dict] = {}
    if room_ids:
        gc_q = await db.execute(
            select(GrowthCycle.room_id, GrowthCycle.current_stage, GrowthCycle.stage_changed_at, GrowthCycle.started_at)
            .where(GrowthCycle.room_id.in_(room_ids), GrowthCycle.is_active == True)
        )
        for row in gc_q.all():
            stage_start = row[2] or row[3]  # stage_changed_at or started_at
            days = (now - stage_start.replace(tzinfo=timezone.utc)).days if stage_start else None
            growth_info[row[0]] = {
                "stage": row[1].value if row[1] else None,
                "days": days,
            }

    # Per-room active alert counts
    room_alert_counts: dict[int, int] = {}
    if room_ids:
        ra_q = await db.execute(
            select(Room.room_id, func.count(Alert.alert_id))
            .join(Device, Device.room_id == Room.room_id)
            .join(Alert, Alert.device_id == Device.device_id)
            .where(
                Room.room_id.in_(room_ids),
                Alert.is_resolved == False,
            )
            .group_by(Room.room_id)
        )
        for row in ra_q.all():
            room_alert_counts[row[0]] = row[1]

    # Build room summaries with device info + live data + harvest
    room_summaries = []
    plant_yield = 0.0
    plant_harvests = 0
    plant_grade_a = 0
    plant_grade_b = 0
    plant_grade_c = 0

    for room in rooms:
        dev_result = await db.execute(
            select(Device).where(
                Device.room_id == room.room_id, Device.is_active == True
            )
        )
        device = dev_result.scalars().first()

        # Live sensor data from Redis
        co2_ppm = None
        room_temp = None
        room_humidity = None
        bag_temps = []
        last_reading_at = None
        if device:
            try:
                raw = await redis.get(f"live:device:{device.device_id}")
                if raw:
                    reading = json.loads(raw)
                    co2_ppm = reading.get("co2_ppm")
                    room_temp = reading.get("room_temp")
                    room_humidity = reading.get("room_humidity")
                    bag_temps = reading.get("bag_temps", [])
                    last_reading_at = reading.get("timestamp")
            except Exception:
                pass

        # Harvest stats for this room
        h = harvest_stats.get(room.room_id, {})
        room_yield = h.get("yield_kg", 0.0)
        room_harvests = h.get("count", 0)
        room_a = h.get("a", 0)
        room_b = h.get("b", 0)
        room_c = h.get("c", 0)

        plant_yield += room_yield
        plant_harvests += room_harvests
        plant_grade_a += room_a
        plant_grade_b += room_b
        plant_grade_c += room_c

        room_summaries.append(
            PlantRoomSummary(
                room_id=room.room_id,
                room_name=room.room_name,
                room_code=room.room_code,
                room_type=room.room_type.value if room.room_type else "FRUITING",
                status=room.status.value if room.status else "ACTIVE",
                has_device=device is not None,
                device_name=device.device_name if device else None,
                device_id=device.device_id if device else None,
                is_online=device.is_online if device else False,
                co2_ppm=co2_ppm,
                room_temp=room_temp,
                room_humidity=room_humidity,
                bag_temps=bag_temps or [],
                last_reading_at=last_reading_at,
                month_yield_kg=room_yield,
                month_harvests=room_harvests,
                grade_a=room_a,
                grade_b=room_b,
                grade_c=room_c,
                growth_stage=growth_info.get(room.room_id, {}).get("stage"),
                days_in_stage=growth_info.get(room.room_id, {}).get("days"),
                active_alerts=room_alert_counts.get(room.room_id, 0),
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
        month_yield_kg=plant_yield,
        month_harvests=plant_harvests,
        month_grade_a=plant_grade_a,
        month_grade_b=plant_grade_b,
        month_grade_c=plant_grade_c,
        rooms=room_summaries,
    )
