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


class PlantOverviewEnhanced(BaseModel):
    plant_id: int
    plant_name: str
    plant_code: str
    plant_type: str
    total_rooms: int
    total_devices: int
    online_devices: int
    active_alerts: int
    month_yield_kg: float = 0.0
    month_harvests: int = 0


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
    plants: list[PlantOverviewEnhanced]
    recent_events: list[RecentDeviceEvent]
    # Overall monthly grade breakdown across all plants
    overall_yield_kg: float = 0.0
    overall_harvests: int = 0
    overall_grade_a: int = 0
    overall_grade_b: int = 0
    overall_grade_c: int = 0


class PlantRoomSummary(BaseModel):
    room_id: int
    room_name: str
    room_code: str
    room_type: str
    status: str
    has_device: bool
    device_name: str | None = None
    device_id: int | None = None
    is_online: bool = False
    # Live sensor data
    co2_ppm: float | None = None
    room_temp: float | None = None
    room_humidity: float | None = None
    bag_temps: list[float] = []
    last_reading_at: str | None = None
    # Monthly harvest summary
    month_yield_kg: float = 0.0
    month_harvests: int = 0
    grade_a: int = 0
    grade_b: int = 0
    grade_c: int = 0
    # Growth cycle
    growth_stage: str | None = None
    days_in_stage: int | None = None
    # Per-room alert count
    active_alerts: int = 0


class PlantDashboardSummary(BaseModel):
    plant_id: int
    plant_name: str
    plant_code: str
    plant_type: str
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    total_rooms: int
    total_devices: int
    online_devices: int
    active_alerts: int
    critical_alerts: int
    # Plant-level monthly totals
    month_yield_kg: float = 0.0
    month_harvests: int = 0
    month_grade_a: int = 0
    month_grade_b: int = 0
    month_grade_c: int = 0
    rooms: list[PlantRoomSummary]
