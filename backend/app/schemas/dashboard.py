from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_plants: int
    total_rooms: int
    total_devices: int
    active_devices: int
    active_alerts: int
    critical_alerts: int


class DeviceStatusBreakdown(BaseModel):
    total: int
    online: int
    offline: int
    unassigned: int


class SubscriptionBreakdown(BaseModel):
    active: int
    pending: int
    suspended: int
    expired: int


class RoomTypeBreakdown(BaseModel):
    fruiting: int
    spawn_run: int
    incubation: int
    storage: int


class AlertSummaryBreakdown(BaseModel):
    active: int
    critical: int
    warning: int
    acknowledged: int
    resolved_today: int


class PlantOverview(BaseModel):
    plant_id: int
    plant_name: str
    plant_code: str
    plant_type: str
    total_rooms: int
    total_devices: int
    online_devices: int
    active_alerts: int


class RecentDeviceEvent(BaseModel):
    device_id: int
    device_name: str
    event: str
    timestamp: str


class AdminDashboardSummary(BaseModel):
    total_plants: int
    total_rooms: int
    total_devices: int
    total_users: int
    device_status: DeviceStatusBreakdown
    subscriptions: SubscriptionBreakdown
    room_types: RoomTypeBreakdown
    alerts: AlertSummaryBreakdown
    plants: list[PlantOverview]
    recent_events: list[RecentDeviceEvent]
