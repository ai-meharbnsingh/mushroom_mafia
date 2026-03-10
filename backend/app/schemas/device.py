from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class DeviceProvision(BaseModel):
    """Super Admin provisions a new device (factory step)."""
    mac_address: str
    device_name: str
    device_type: str = "ESP32"


class DeviceProvisionResponse(BaseModel):
    device_id: int
    license_key: str
    device_name: str
    subscription_status: str


class DeviceUpdate(BaseModel):
    room_id: Optional[int] = None
    device_name: Optional[str] = None


class DeviceAssignRequest(BaseModel):
    """Super Admin assigns device to a plant."""
    plant_id: int


class DeviceAssignResponse(BaseModel):
    device_id: int
    license_key: str
    assigned_to_plant_id: int
    subscription_status: str


class KillSwitchRequest(BaseModel):
    action: str  # "ENABLE" or "DISABLE"


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    device_id: int
    room_id: Optional[int] = None
    assigned_to_plant_id: Optional[int] = None
    license_key: str
    mac_address: str
    device_name: str
    device_type: str
    firmware_version: str
    hardware_version: Optional[str] = None
    is_online: bool
    last_seen: Optional[datetime] = None
    device_ip: Optional[str] = None
    wifi_rssi: Optional[int] = None
    free_heap: Optional[int] = None
    subscription_status: str = "PENDING"
    subscription_expires_at: Optional[datetime] = None
    communication_mode: str = "HTTP"
    registered_at: datetime


class DeviceRegisterRequest(BaseModel):
    license_key: str
    mac_address: str
    firmware_version: str
    hardware_version: Optional[str] = None


class DeviceRegisterResponse(BaseModel):
    status: str
    device_id: int
    device_name: str
    subscription_status: str


class DeviceProvisioningInfo(BaseModel):
    """Returned when ESP32 polls for MQTT credentials."""
    status: str  # "pending", "pending_approval", or "ready"
    message: Optional[str] = None
    mqtt_password: Optional[str] = None
    mqtt_host: Optional[str] = None
    mqtt_port: Optional[int] = None
    device_id: Optional[int] = None


# --- Device Onboarding (QR Scan / Link / Approve) ---


class DeviceLinkRequest(BaseModel):
    """Link a device to a room via QR scan."""
    license_key: str
    room_id: int


class DeviceLinkResponse(BaseModel):
    device_id: int
    name: str
    status: str
    room_id: int


class PendingApprovalResponse(BaseModel):
    device_id: int
    name: str
    license_key: str
    mac_address: str
    room_id: Optional[int] = None
    room_name: Optional[str] = None
    linked_by_username: Optional[str] = None
    linked_at: Optional[datetime] = None


class DeviceApproveRequest(BaseModel):
    action: str  # "APPROVE" or "REJECT"


class QrImageUpload(BaseModel):
    image: str  # base64 PNG string (e.g., "data:image/png;base64,iVBOR...")


class QrImageResponse(BaseModel):
    image: str
