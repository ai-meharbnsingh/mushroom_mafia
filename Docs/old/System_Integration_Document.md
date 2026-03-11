# MUSHROOM FARM — SYSTEM INTEGRATION DOCUMENT

## Document Purpose
This document explains exactly how to build and run the system. Share this with ANY developer working on the project. It covers database models, API contracts, Redis patterns, WebSocket events, data flows, and verification checklists.

For business context, architecture decisions, and ESP32 firmware details, see the **Blueprint** (`MUSHROOM_FARM_BLUEPRINT.md`).

---

## SECTION 1: SYSTEM ARCHITECTURE

```
+-----------------------------------------------------------------------------+
|                         COMPLETE SYSTEM ARCHITECTURE                          |
+-----------------------------------------------------------------------------+
|                                                                               |
|  +-----------------------------------------------------------------------+  |
|  |                       USER (Browser / Mobile PWA)                      |  |
|  |                                                                        |  |
|  |   Create Profile       View Dashboard         Toggle Relays           |  |
|  |   Create Plants        View Live Readings      Set Thresholds         |  |
|  |   Create Rooms         View Alerts             Generate Reports       |  |
|  |   Manage Devices       Acknowledge Alerts      All CRUD actions       |  |
|  +-----------------------------------+------------------------------------+  |
|                                      |                                       |
|                                      v                                       |
|  +-----------------------------------------------------------------------+  |
|  |                    WEBAPP (React 18 + TS) - Port 3000                   |  |
|  |                                                                        |  |
|  |   All pages with complete UI                                          |  |
|  |   Forms that SUBMIT to API                                            |  |
|  |   WebSocket connection for live data (replaces polling)               |  |
|  |   Historical data from PostgreSQL via API                             |  |
|  +-----------------------------------+------------------------------------+  |
|                                      |                                       |
|                                      v                                       |
|  +-----------------------------------------------------------------------+  |
|  |                    BACKEND (FastAPI) - Port 3800                        |  |
|  |                                                                        |  |
|  |   +------------------+ +------------------+ +-------------------+     |  |
|  |   | Auth APIs        | | CRUD APIs        | | Live APIs         |     |  |
|  |   | /auth/login      | | /users           | | /live/readings    |     |  |
|  |   | /auth/me         | | /plants          | | /live/relay       |     |  |
|  |   | /auth/refresh    | | /rooms           | | /ws (WebSocket)   |     |  |
|  |   +------------------+ | /devices         | +--------+----------+     |  |
|  |                        | /thresholds      |          |                 |  |
|  |   +------------------+ | /alerts          |          |                 |  |
|  |   | Device APIs      | | /reports         |          |                 |  |
|  |   | /device/readings | +--------+---------+          |                 |  |
|  |   | /device/heartbeat|          |                    |                 |  |
|  |   | /device/register |          |                    |                 |  |
|  |   | /device/{id}/cmds|          |                    |                 |  |
|  |   +------------------+          |                    |                 |  |
|  +----------------------------------+--------------------+-----------------+  |
|                                     |                    |                    |
|                     +---------------+------+     +-------+------+            |
|                     v                      v     v              v            |
|  +-------------------------------+  +-------------------------------+       |
|  |   PostgreSQL (Port 5432)      |  |      Redis (Port 6379)        |       |
|  |                               |  |                               |       |
|  |  owners, users, plants        |  |  live:device:{id}   TTL:60s  |       |
|  |  rooms, devices, thresholds   |  |  live:room:{id}     TTL:60s  |       |
|  |  room_readings, relay_status  |  |  live:relay:{id}    TTL:60s  |       |
|  |  alerts, reports, audit_log   |  |  command:relay:{id} TTL:30s  |       |
|  +-------------------------------+  +-------------------------------+       |
|                                                                               |
|  +-----------------------------------------------------------------------+  |
|  |                    ESP32 DEVICE (On-Farm)                               |  |
|  |                                                                        |  |
|  |   HTTP POST /device/readings   every 30s (target) / 5min (current)   |  |
|  |   HTTP POST /device/heartbeat  every 5 minutes                        |  |
|  |   HTTP GET  /device/{id}/commands  every 30s (polls for relay cmds)   |  |
|  |                                                                        |  |
|  |   Headers: X-Device-ID + X-Device-Key                                 |  |
|  +-----------------------------------------------------------------------+  |
|                                                                               |
+-----------------------------------------------------------------------------+
```

---

## SECTION 2: DATA HIERARCHY

```
OWNER (Company)
|
+-- owner_id (PK)
+-- company_name, owner_name, email, mobile
+-- address, city, state, pincode, country
+-- gst_number, latitude, longitude
+-- is_active, created_at, updated_at
|
+-- HAS MANY --> USERS
|   +-- user_id (PK), owner_id (FK)
|   +-- username, email, password_hash
|   +-- role (SUPER_ADMIN / ADMIN / MANAGER / OPERATOR / VIEWER)
|   +-- assigned_plants (JSON array of plant_ids)
|   +-- login_attempts, locked_until
|   +-- is_active, last_login
|
+-- HAS MANY --> PLANTS
    +-- plant_id (PK), owner_id (FK)
    +-- plant_name, plant_code (unique)
    +-- plant_type (OYSTER / BUTTON / SHIITAKE / MIXED)
    +-- location, address, city, state, latitude, longitude
    +-- plant_size_sqft, no_of_rooms
    |
    +-- HAS MANY --> ROOMS
        +-- room_id (PK), plant_id (FK)
        +-- room_name, room_code (unique)
        +-- room_type (SPAWN_RUN / FRUITING / INCUBATION / STORAGE)
        +-- room_size_sqft, no_of_racks, no_of_bags, bags_per_rack
        +-- floor_number, is_active
        |
        +-- HAS ONE per parameter --> THRESHOLDS
        |   +-- threshold_id (PK), room_id (FK)
        |   +-- parameter (CO2 / HUMIDITY / TEMPERATURE)
        |   +-- min_value, max_value, hysteresis
        |   +-- is_active, updated_by (user_id)
        |
        +-- HAS MANY --> DEVICES
            +-- device_id (PK), room_id (FK, nullable)
            +-- secret_key (12 char, unique), mac_address (unique)
            +-- device_name, device_type, firmware_version, hardware_version
            +-- is_online, last_seen, device_ip, wifi_rssi, free_heap
            |
            +-- HAS MANY --> ROOM_READINGS
            |   +-- reading_id (PK), device_id (FK), room_id (FK)
            |   +-- co2_ppm, room_temp, room_humidity
            |   +-- bag_temp_1 ... bag_temp_10
            |   +-- outdoor_temp, outdoor_humidity
            |   +-- recorded_at, created_at
            |
            +-- HAS MANY --> RELAY_STATUS
            |   +-- status_id (PK), device_id (FK)
            |   +-- relay_type (CO2 / HUMIDITY / TEMPERATURE)
            |   +-- state (true/false)
            |   +-- trigger_type (MANUAL / AUTO / SCHEDULE)
            |   +-- trigger_value, triggered_by (user_id)
            |   +-- changed_at
            |
            +-- HAS MANY --> ALERTS
                +-- alert_id (PK), device_id (FK), room_id (FK)
                +-- alert_type, severity (CRITICAL / WARNING / INFO)
                +-- parameter, current_value, threshold_value, message
                +-- is_read, acknowledged_by, acknowledged_at
                +-- is_resolved, resolved_at, created_at
```

---

## SECTION 3: DATABASE MODELS (SQLAlchemy)

All models use SQLAlchemy with PostgreSQL. Migrations managed by Alembic.

### Base Setup

```python
from sqlalchemy import (
    Column, Integer, BigInteger, String, Text, Boolean,
    Numeric, DateTime, Date, JSON, Enum, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()

class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"

class RoomType(str, enum.Enum):
    SPAWN_RUN = "SPAWN_RUN"
    FRUITING = "FRUITING"
    INCUBATION = "INCUBATION"
    STORAGE = "STORAGE"

class PlantType(str, enum.Enum):
    OYSTER = "OYSTER"
    BUTTON = "BUTTON"
    SHIITAKE = "SHIITAKE"
    MIXED = "MIXED"

class DeviceType(str, enum.Enum):
    ESP32 = "ESP32"
    ESP8266 = "ESP8266"
    ARDUINO = "ARDUINO"
    PLC = "PLC"

class RelayType(str, enum.Enum):
    CO2 = "CO2"
    HUMIDITY = "HUMIDITY"
    TEMPERATURE = "TEMPERATURE"

class TriggerType(str, enum.Enum):
    MANUAL = "MANUAL"
    AUTO = "AUTO"
    SCHEDULE = "SCHEDULE"

class ThresholdParameter(str, enum.Enum):
    CO2 = "CO2"
    HUMIDITY = "HUMIDITY"
    TEMPERATURE = "TEMPERATURE"

class AlertType(str, enum.Enum):
    CO2_HIGH = "CO2_HIGH"
    CO2_LOW = "CO2_LOW"
    TEMP_HIGH = "TEMP_HIGH"
    TEMP_LOW = "TEMP_LOW"
    HUMIDITY_HIGH = "HUMIDITY_HIGH"
    HUMIDITY_LOW = "HUMIDITY_LOW"
    DEVICE_OFFLINE = "DEVICE_OFFLINE"
    SENSOR_ERROR = "SENSOR_ERROR"

class Severity(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class ReportType(str, enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    CUSTOM = "CUSTOM"

class ReportFormat(str, enum.Enum):
    PDF = "PDF"
    EXCEL = "EXCEL"
    CSV = "CSV"

class AuditAction(str, enum.Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    EXPORT = "EXPORT"
    CONFIG_CHANGE = "CONFIG_CHANGE"
```

### Table 1: owners
```python
class Owner(Base):
    __tablename__ = "owners"
    owner_id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(100), nullable=False)
    owner_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    mobile = Column(String(15), unique=True)
    address = Column(Text)
    city = Column(String(50))
    state = Column(String(50))
    country = Column(String(50), default="India")
    pincode = Column(String(10))
    gst_number = Column(String(20))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    users = relationship("User", back_populates="owner")
    plants = relationship("Plant", back_populates="owner")
```

### Table 2: users
```python
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("owners.owner_id"), nullable=False)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(50))
    last_name = Column(String(50))
    mobile = Column(String(15))
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    assigned_plants = Column(JSON)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime)
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    owner = relationship("Owner", back_populates="users")
    __table_args__ = (
        Index("idx_users_owner", "owner_id"),
        Index("idx_users_role", "role"),
    )
```

### Table 3: plants
```python
class Plant(Base):
    __tablename__ = "plants"
    plant_id = Column(Integer, primary_key=True, autoincrement=True)
    owner_id = Column(Integer, ForeignKey("owners.owner_id"), nullable=False)
    plant_name = Column(String(100), nullable=False)
    plant_code = Column(String(20), unique=True, nullable=False)
    plant_type = Column(Enum(PlantType), default=PlantType.OYSTER)
    location = Column(String(100))
    address = Column(Text)
    city = Column(String(50))
    state = Column(String(50))
    latitude = Column(Numeric(10, 8))
    longitude = Column(Numeric(11, 8))
    plant_size_sqft = Column(Integer)
    no_of_rooms = Column(Integer, default=0)
    established_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    owner = relationship("Owner", back_populates="plants")
    rooms = relationship("Room", back_populates="plant")
    __table_args__ = (Index("idx_plants_owner", "owner_id"),)
```

### Table 4: rooms
```python
class Room(Base):
    __tablename__ = "rooms"
    room_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.plant_id"), nullable=False)
    room_name = Column(String(100), nullable=False)
    room_code = Column(String(20), unique=True)
    room_type = Column(Enum(RoomType), default=RoomType.FRUITING)
    room_size_sqft = Column(Integer)
    no_of_racks = Column(Integer, default=0)
    no_of_bags = Column(Integer, default=0)
    bags_per_rack = Column(Integer)
    floor_number = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    plant = relationship("Plant", back_populates="rooms")
    devices = relationship("Device", back_populates="room")
    thresholds = relationship("Threshold", back_populates="room")
    __table_args__ = (Index("idx_rooms_plant", "plant_id"),)
```

### Table 5: devices
```python
class Device(Base):
    __tablename__ = "devices"
    device_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=True)
    mac_address = Column(String(17), unique=True, nullable=False)
    secret_key = Column(String(12), unique=True, nullable=False)
    device_name = Column(String(50))
    device_type = Column(Enum(DeviceType), default=DeviceType.ESP32)
    firmware_version = Column(String(20), default="1.0.0")
    hardware_version = Column(String(20))
    device_ip = Column(String(45))
    wifi_rssi = Column(Integer)
    free_heap = Column(Integer)
    is_online = Column(Boolean, default=False)
    last_seen = Column(DateTime)
    is_active = Column(Boolean, default=True)
    registered_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    room = relationship("Room", back_populates="devices")
    readings = relationship("RoomReading", back_populates="device")
    relay_statuses = relationship("RelayStatus", back_populates="device")
    alerts = relationship("Alert", back_populates="device")
    __table_args__ = (
        Index("idx_devices_room", "room_id"),
        Index("idx_devices_secret_key", "secret_key"),
        Index("idx_devices_mac", "mac_address"),
    )
```

### Table 6: thresholds
```python
class Threshold(Base):
    __tablename__ = "thresholds"
    threshold_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    parameter = Column(Enum(ThresholdParameter), nullable=False)
    min_value = Column(Numeric(10, 2))
    max_value = Column(Numeric(10, 2))
    hysteresis = Column(Numeric(10, 2))
    is_active = Column(Boolean, default=True)
    updated_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    room = relationship("Room", back_populates="thresholds")
    __table_args__ = (
        UniqueConstraint("room_id", "parameter", name="uq_room_parameter"),
        Index("idx_thresholds_room", "room_id"),
    )
```

**Default Threshold Values:**

| Parameter | Min | Max | Hysteresis |
|-----------|-----|-----|------------|
| CO2 | 1200 ppm | 1300 ppm | 100 ppm |
| HUMIDITY | 87.5% | 90% | 2.5% |
| TEMPERATURE | 16 C | 17 C | 1 C |

### Table 7: room_readings
```python
class RoomReading(Base):
    __tablename__ = "room_readings"
    reading_id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    co2_ppm = Column(Integer)
    room_temp = Column(Numeric(5, 2))
    room_humidity = Column(Numeric(5, 2))
    bag_temp_1 = Column(Numeric(5, 2))
    bag_temp_2 = Column(Numeric(5, 2))
    bag_temp_3 = Column(Numeric(5, 2))
    bag_temp_4 = Column(Numeric(5, 2))
    bag_temp_5 = Column(Numeric(5, 2))
    bag_temp_6 = Column(Numeric(5, 2))
    bag_temp_7 = Column(Numeric(5, 2))
    bag_temp_8 = Column(Numeric(5, 2))
    bag_temp_9 = Column(Numeric(5, 2))
    bag_temp_10 = Column(Numeric(5, 2))
    outdoor_temp = Column(Numeric(5, 2))
    outdoor_humidity = Column(Numeric(5, 2))
    recorded_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    device = relationship("Device", back_populates="readings")
    __table_args__ = (
        Index("idx_readings_device_time", "device_id", "recorded_at"),
        Index("idx_readings_room_time", "room_id", "recorded_at"),
    )
```

### Table 8: relay_status
```python
class RelayStatus(Base):
    __tablename__ = "relay_status"
    status_id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    relay_type = Column(Enum(RelayType), nullable=False)
    state = Column(Boolean, nullable=False)
    trigger_type = Column(Enum(TriggerType), default=TriggerType.AUTO)
    trigger_value = Column(Numeric(10, 2))
    triggered_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    changed_at = Column(DateTime, server_default=func.now())
    device = relationship("Device", back_populates="relay_statuses")
    __table_args__ = (
        Index("idx_relay_device", "device_id", "relay_type"),
        Index("idx_relay_changed", "changed_at"),
    )
```

### Table 9: alerts
```python
class Alert(Base):
    __tablename__ = "alerts"
    alert_id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.device_id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    alert_type = Column(Enum(AlertType), nullable=False)
    severity = Column(Enum(Severity), default=Severity.WARNING, nullable=False)
    parameter = Column(String(50))
    current_value = Column(Numeric(10, 2))
    threshold_value = Column(Numeric(10, 2))
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    acknowledged_at = Column(DateTime)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    device = relationship("Device", back_populates="alerts")
    __table_args__ = (
        Index("idx_alerts_room", "room_id", "is_resolved", "created_at"),
        Index("idx_alerts_severity", "severity"),
        Index("idx_alerts_unread", "is_read"),
    )
```

### Table 10: reports
```python
class Report(Base):
    __tablename__ = "reports"
    report_id = Column(Integer, primary_key=True, autoincrement=True)
    plant_id = Column(Integer, ForeignKey("plants.plant_id"))
    report_type = Column(Enum(ReportType), nullable=False)
    report_name = Column(String(100))
    file_path = Column(String(255))
    file_size = Column(Integer)
    format = Column(Enum(ReportFormat), default=ReportFormat.PDF)
    date_from = Column(Date)
    date_to = Column(Date)
    generated_by = Column(Integer, ForeignKey("users.user_id"))
    generated_at = Column(DateTime, server_default=func.now())
```

### Table 11: audit_log
```python
class AuditLog(Base):
    __tablename__ = "audit_log"
    log_id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    action = Column(Enum(AuditAction), nullable=False)
    table_name = Column(String(50))
    record_id = Column(Integer)
    old_value = Column(JSON)
    new_value = Column(JSON)
    ip_address = Column(String(45))
    user_agent = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())
    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_table", "table_name"),
        Index("idx_audit_created", "created_at"),
    )
```

---

## SECTION 4: REDIS KEYS

### Live Data Keys (Updated by Backend when ESP32 posts data)

| Key Pattern | Data | TTL | Updated When |
|-------------|------|-----|--------------|
| `live:device:{device_id}` | Latest sensor reading | 60s | Every device POST |
| `live:room:{room_id}` | Aggregated room reading | 60s | Every device POST |
| `live:relay:{device_id}` | Current relay states | 60s | Relay state change |

### Command Keys (Set by WebApp via API, polled by ESP32)

| Key Pattern | Data | TTL | Set When |
|-------------|------|-----|----------|
| `command:relay:{device_id}` | Pending relay commands | 30s | User toggles relay |

### Example Redis Data

**live:device:1**
```json
{
    "device_id": 1,
    "room_id": 3,
    "co2_ppm": 1250,
    "room_temp": 17.2,
    "room_humidity": 88.5,
    "bag_temps": [16.8, 17.1, 16.9, 17.0, 16.7, 17.2, 16.8, 17.0, 16.9, 17.1],
    "outdoor_temp": 22.5,
    "outdoor_humidity": 65.0,
    "relay_states": {"co2": true, "humidity": false, "temperature": true},
    "timestamp": "2026-03-08T10:30:00Z"
}
```

**command:relay:1**
```json
{
    "commands": [{"relay_type": "co2", "state": true, "triggered_by": 3}],
    "updated_at": "2026-03-08T10:30:05Z"
}
```

---

## SECTION 5: API ENDPOINTS (Complete List)

All endpoints prefixed with `/api/v1/`. Auth required unless noted.

### Authentication APIs (JWT)

| Endpoint | Method | Auth | Description | Request Body | Response |
|----------|--------|------|-------------|-------------|----------|
| `/auth/login` | POST | None | User login | `{username, password}` | `{access_token, refresh_token, user}` |
| `/auth/logout` | POST | JWT | User logout | - | `{message}` |
| `/auth/refresh` | POST | None | Refresh token | `{refresh_token}` | `{access_token}` |
| `/auth/me` | GET | JWT | Current user | - | `{user object}` |
| `/auth/change-password` | POST | JWT | Change password | `{old_password, new_password}` | `{message}` |

### Owner APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/owners` | GET | JWT (SUPER_ADMIN) | List all owners |
| `/owners/{id}` | GET | JWT | Get owner by ID |
| `/owners` | POST | JWT (SUPER_ADMIN) | Create owner |
| `/owners/{id}` | PUT | JWT (ADMIN+) | Update owner |

### User APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users` | GET | JWT | List users (RLS filtered) |
| `/users/{id}` | GET | JWT | Get user by ID |
| `/users` | POST | JWT (ADMIN+) | Create user |
| `/users/{id}` | PUT | JWT (ADMIN+) | Update user |
| `/users/{id}` | DELETE | JWT (ADMIN+) | Soft delete user |

### Plant APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/plants` | GET | JWT | List plants (RLS filtered) |
| `/plants/{id}` | GET | JWT | Get plant by ID |
| `/plants` | POST | JWT (ADMIN+) | Create plant |
| `/plants/{id}` | PUT | JWT (ADMIN+) | Update plant |
| `/plants/{id}` | DELETE | JWT (ADMIN+) | Soft delete plant |
| `/plants/{id}/rooms` | GET | JWT | Get rooms of plant |

### Room APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/rooms` | GET | JWT | List rooms (RLS filtered) |
| `/rooms/{id}` | GET | JWT | Get room by ID |
| `/rooms` | POST | JWT (ADMIN/MANAGER) | Create room |
| `/rooms/{id}` | PUT | JWT (ADMIN/MANAGER) | Update room |
| `/rooms/{id}` | DELETE | JWT (ADMIN+) | Soft delete room |

### Device APIs (Web User)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/devices` | GET | JWT | List devices (RLS filtered) |
| `/devices/{id}` | GET | JWT | Get device by ID |
| `/devices/{id}` | PUT | JWT (ADMIN/MANAGER) | Update device (assign room) |
| `/devices/{id}` | DELETE | JWT (ADMIN+) | Delete device |

### Device APIs (ESP32)

| Endpoint | Method | Auth | Description | Request Body |
|----------|--------|------|-------------|-------------|
| `/device/register` | POST | Key | Register device | `{mac_address, firmware_version, hardware_version, secret_key}` |
| `/device/readings` | POST | Key | Submit reading | `{co2_ppm, room_temp, room_humidity, bag_temps[], outdoor_temp, outdoor_humidity, relay_states{}}` |
| `/device/heartbeat` | POST | Key | Health check | `{device_ip, wifi_rssi, free_heap, uptime_seconds}` |
| `/device/{id}/commands` | GET | Key | Poll relay commands | - |

**Device Auth Headers:** `X-Device-ID: 5` and `X-Device-Key: A3F7K9M2P5X8`

### Threshold APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/thresholds/room/{room_id}` | GET | JWT | Get thresholds |
| `/thresholds/room/{room_id}` | PUT | JWT (ADMIN/MANAGER) | Update thresholds |

### Live Data APIs (Redis)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/live/readings` | GET | JWT | All live readings (RLS filtered) |
| `/live/readings/device/{id}` | GET | JWT | Device live reading |
| `/live/readings/room/{id}` | GET | JWT | Room live reading |
| `/live/relay/{device_id}` | GET | JWT | Get relay states |
| `/live/relay/{device_id}` | POST | JWT (OPERATOR+) | Set relay command: `{relay_type, state}` |

### Dashboard APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/dashboard/summary` | GET | JWT | Summary stats |
| `/dashboard/current-readings` | GET | JWT | Current readings all rooms |

### Historical Data APIs

| Endpoint | Method | Auth | Query Params |
|----------|--------|------|-------------|
| `/readings/room/{room_id}` | GET | JWT | `?from=&to=&limit=` |
| `/readings/device/{device_id}` | GET | JWT | `?from=&to=&limit=` |
| `/readings/bag-temps/{device_id}` | GET | JWT | `?from=&to=` |

### Alert APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/alerts` | GET | JWT | List alerts (RLS filtered) |
| `/alerts/active` | GET | JWT | Unresolved alerts |
| `/alerts/{id}` | GET | JWT | Get alert by ID |
| `/alerts/{id}/acknowledge` | POST | JWT (OPERATOR+) | Acknowledge |
| `/alerts/{id}/resolve` | POST | JWT (MANAGER+) | Resolve |

### Report APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/reports` | GET | JWT | List reports |
| `/reports/{id}` | GET | JWT | Download report |
| `/reports/generate` | POST | JWT (MANAGER+) | Generate report |
| `/reports/{id}` | DELETE | JWT (ADMIN+) | Delete report |

### WebSocket

| Endpoint | Auth | Description |
|----------|------|-------------|
| `/ws?token={jwt}` | JWT query param | Real-time event stream |

---

## SECTION 6: WEBSOCKET EVENTS

Frontend connects via WebSocket for real-time push. No polling needed.

### Connection
```javascript
const ws = new WebSocket(`ws://localhost:3800/api/v1/ws?token=${accessToken}`);
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.event) {
        case "sensor_update": updateDashboard(data.payload); break;
        case "relay_state_change": updateRelayUI(data.payload); break;
        case "alert_created": showAlertNotification(data.payload); break;
        case "alert_acknowledged": updateAlertStatus(data.payload); break;
        case "device_status_change": updateDeviceStatus(data.payload); break;
    }
};
```

### Events

**sensor_update** — New reading from ESP32
```json
{"event": "sensor_update", "payload": {"device_id": 1, "room_id": 3, "co2_ppm": 1250, "room_temp": 17.2, "room_humidity": 88.5, "bag_temps": [16.8, 17.1, 16.9, 17.0, 16.7, 17.2, 16.8, 17.0, 16.9, 17.1], "outdoor_temp": 22.5, "outdoor_humidity": 65.0, "timestamp": "2026-03-08T10:30:00Z"}}
```

**relay_state_change** — Relay toggled
```json
{"event": "relay_state_change", "payload": {"device_id": 1, "relay_type": "co2", "state": true, "trigger_type": "MANUAL", "triggered_by": 3}}
```

**alert_created** — Threshold violated
```json
{"event": "alert_created", "payload": {"alert_id": 456, "device_id": 1, "room_id": 3, "alert_type": "CO2_HIGH", "severity": "CRITICAL", "parameter": "CO2", "current_value": 1450, "threshold_value": 1300, "message": "CO2 level 1450 ppm exceeds maximum 1300 ppm", "created_at": "2026-03-08T10:30:00Z"}}
```

**alert_acknowledged** — User acks alert
```json
{"event": "alert_acknowledged", "payload": {"alert_id": 456, "acknowledged_by": 3, "acknowledged_at": "2026-03-08T10:31:00Z"}}
```

**device_status_change** — Device online/offline
```json
{"event": "device_status_change", "payload": {"device_id": 1, "is_online": false, "last_seen": "2026-03-08T10:25:00Z"}}
```

**Tenant Isolation:** Backend only pushes events for the connected user's owner_id.

---

## SECTION 7: DATA FLOWS

### Flow 1: User Creates Plant -> Room -> Assigns Device
```
USER                         WEBAPP                    BACKEND                  DATABASE
1. Fill plant form    ->    POST /plants        ->    Validate (Pydantic) ->   INSERT INTO plants
                      <-    Show success         <-   Return plant        <-   Return plant_id

2. Fill room form     ->    POST /rooms         ->    Validate            ->   INSERT INTO rooms
                      <-    Show success         <-   Return room         <-   UPDATE plants.no_of_rooms

3. Assign device      ->    PUT /devices/{id}   ->    Set room_id         ->   UPDATE devices SET room_id
                      <-    Show success         <-   Return device       <-
```

### Flow 2: User Toggles Relay (CRITICAL)
```
1. User clicks ON     ->    POST /live/relay/1  ->    REDIS: SET command:relay:1 (TTL:30s)
                                                      PgSQL: INSERT relay_status (MANUAL)
                      <-    "Command sent"       <-   WebSocket: relay_state_change

2. ESP32 polls (30s)  ->    GET /device/1/commands -> Returns [{relay_type:"co2", state:true}]
                             ESP32 applies relay

3. ESP32 next POST    ->    POST /device/readings -> relay_states confirms {co2:true}
                                                     WebSocket: sensor_update
```

### Flow 3: ESP32 Sensor Data
```
ESP32 every 30s/5min  ->    POST /device/readings ->  1. REDIS: SET live:device:{id} (TTL:60s)
                                                       2. REDIS: SET live:room:{id} (TTL:60s)
                                                       3. PgSQL: INSERT room_readings
                                                       4. Check thresholds
                                                       5. If violated: INSERT alerts + WS: alert_created
                                                       6. WebSocket: sensor_update
                      <-    {status, reading_id}   <-
```

### Flow 4: Alert Lifecycle
```
1. Threshold exceeded  ->   INSERT alerts (CRITICAL)  ->   WebSocket: alert_created -> Dashboard notification
2. User acknowledges   ->   POST /alerts/{id}/ack     ->   UPDATE alerts is_read=true -> WS: alert_acknowledged
3. User resolves       ->   POST /alerts/{id}/resolve ->   UPDATE alerts is_resolved=true
```

---

## SECTION 8: FRONTEND REQUIREMENTS (React)

### Auth Interceptor (api.js)
```javascript
import axios from 'axios';
const api = axios.create({ baseURL: 'http://localhost:3800/api/v1' });
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const res = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
                    localStorage.setItem('access_token', res.data.access_token);
                    error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
                    return api(error.config);
                } catch { localStorage.clear(); window.location.href = '/login'; }
            }
        }
        return Promise.reject(error);
    }
);
```

### WebSocket Hook (Dashboard)
```javascript
useEffect(() => {
    const token = localStorage.getItem('access_token');
    const ws = new WebSocket(`ws://localhost:3800/api/v1/ws?token=${token}`);
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.event === 'sensor_update')
            setSensorData(prev => ({ ...prev, [data.payload.device_id]: data.payload }));
        if (data.event === 'alert_created')
            setAlerts(prev => [data.payload, ...prev]);
        if (data.event === 'relay_state_change')
            setRelayStates(prev => ({
                ...prev, [data.payload.device_id]: {
                    ...prev[data.payload.device_id], [data.payload.relay_type]: data.payload.state
                }
            }));
    };
    ws.onclose = () => setTimeout(() => { /* reconnect */ }, 3000);
    return () => ws.close();
}, []);
```

### Pages

| Page | Route | Data Source | Key Actions |
|------|-------|------------|-------------|
| Login | /login | Auth API | Login form |
| Dashboard | /dashboard | WebSocket + REST | Live data, charts |
| Plants | /plants | REST | CRUD |
| Rooms | /rooms | REST | CRUD |
| Devices | /devices | REST | Assign to room |
| Thresholds | /settings | REST | Update values |
| Alerts | /alerts | WebSocket + REST | Ack, Resolve |
| Reports | /reports | REST | Generate, Download |
| Users | /users | REST | CRUD (Admin) |
| Profile | /profile | REST | Update profile |

---

## SECTION 9: BACKEND REQUIREMENTS (FastAPI)

### Every Endpoint Must:
1. **Validate input** (Pydantic)
2. **Check auth** (JWT for web, device key for ESP32)
3. **Set tenant context** (`SET app.current_owner_id` from JWT)
4. **Check authorization** (role permissions)
5. **Handle errors** (proper HTTP codes)
6. **Audit log** (write operations)

### Example: Relay Toggle
```python
@router.post("/live/relay/{device_id}")
async def set_relay_command(device_id: int, command: RelayCommand,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db), redis: Redis = Depends(get_redis)):
    device = await db.get(Device, device_id)
    if not device: raise HTTPException(404, "Device not found")
    # Redis command
    await redis.setex(f"command:relay:{device_id}", 30, json.dumps({
        "commands": [{"relay_type": command.relay_type, "state": command.state,
                       "triggered_by": current_user.user_id}],
        "updated_at": datetime.utcnow().isoformat()
    }))
    # PostgreSQL history
    db.add(RelayStatus(device_id=device_id, relay_type=command.relay_type.upper(),
        state=command.state, trigger_type=TriggerType.MANUAL, triggered_by=current_user.user_id))
    await db.commit()
    # WebSocket push
    await ws_manager.broadcast_to_owner(current_user.owner_id, "relay_state_change",
        {"device_id": device_id, "relay_type": command.relay_type, "state": command.state,
         "trigger_type": "MANUAL", "triggered_by": current_user.user_id})
    return {"status": "success"}
```

### Device Auth Dependency
```python
async def verify_device_key(x_device_id: int = Header(...), x_device_key: str = Header(...),
    db: AsyncSession = Depends(get_db)) -> Device:
    result = await db.execute(select(Device).where(
        Device.device_id == x_device_id, Device.secret_key == x_device_key, Device.is_active == True))
    device = result.scalar_one_or_none()
    if not device: raise HTTPException(401, "Invalid device credentials")
    return device
```

---

## SECTION 10: ESP32 <-> BACKEND API CONTRACT

### 1. Register: `POST /api/v1/device/register`
```json
// Request
{"mac_address": "AA:BB:CC:DD:EE:FF", "firmware_version": "1.2", "hardware_version": "1.0", "secret_key": "A3F7K9M2P5X8"}
// Response 201
{"status": "success", "device_id": 5, "device_name": "Device-5"}
```

### 2. Readings: `POST /api/v1/device/readings`
```json
// Headers: X-Device-ID: 5, X-Device-Key: A3F7K9M2P5X8
// Request
{"co2_ppm": 1250, "room_temp": 18.5, "room_humidity": 85.2,
 "bag_temps": [16.2, 16.5, 16.1, 16.8, 16.3, 16.7, 16.4, 16.6, 16.2, 16.5],
 "outdoor_temp": 22.3, "outdoor_humidity": 65.0,
 "relay_states": {"co2": true, "humidity": false, "temperature": true}}
// Response 200
{"status": "success", "reading_id": 12345, "timestamp": "2026-03-08T10:30:00Z"}
```

### 3. Heartbeat: `POST /api/v1/device/heartbeat`
```json
// Headers: X-Device-ID: 5, X-Device-Key: A3F7K9M2P5X8
// Request
{"device_ip": "192.168.1.100", "wifi_rssi": -65, "free_heap": 120000, "uptime_seconds": 86400}
// Response 200
{"status": "success", "server_time": "2026-03-08T10:30:00Z"}
```

### 4. Commands: `GET /api/v1/device/5/commands`
```json
// Headers: X-Device-Key: A3F7K9M2P5X8
// Response 200 (pending)
{"commands": [{"relay_type": "co2", "state": true, "triggered_by": "user:3"}]}
// Response 200 (none)
{"commands": []}
```

---

## SECTION 11: VERIFICATION CHECKLIST

### User Actions -> PostgreSQL

| Action | API | Table | Done |
|--------|-----|-------|------|
| Create User | POST /users | users | [ ] |
| Update User | PUT /users/{id} | users | [ ] |
| Create Plant | POST /plants | plants | [ ] |
| Create Room | POST /rooms | rooms | [ ] |
| Assign Device | PUT /devices/{id} | devices | [ ] |
| Set Thresholds | PUT /thresholds/room/{id} | thresholds | [ ] |
| Toggle Relay | POST /live/relay/{id} | relay_status + Redis | [ ] |
| Ack Alert | POST /alerts/{id}/acknowledge | alerts | [ ] |
| Resolve Alert | POST /alerts/{id}/resolve | alerts | [ ] |
| Generate Report | POST /reports/generate | reports | [ ] |

### Live Data -> Redis + WebSocket

| Data | Redis Key | WS Event | Trigger |
|------|-----------|----------|---------|
| Sensor Reading | live:device:{id} | sensor_update | ESP32 POST |
| Room Reading | live:room:{id} | sensor_update | ESP32 POST |
| Relay States | live:relay:{id} | relay_state_change | Toggle |
| Relay Command | command:relay:{id} | - | User action |

### Historical Data -> PostgreSQL

| Data | Table | Trigger |
|------|-------|---------|
| Sensor Readings | room_readings | Every ESP32 POST |
| Relay Changes | relay_status | Relay state change |
| Alerts | alerts | Threshold exceeded |
| Audit Trail | audit_log | Any write operation |

---

## SECTION 12: REAL vs SIMULATED

**Real (stored in PostgreSQL):** All user actions — CRUD for users, plants, rooms, devices, thresholds, relay commands, alerts, reports.

**Simulated (dev only):** A Python simulator generates sensor data for development without ESP32 hardware. In production, all sensor data comes from real ESP32 devices.

---

## CROSS-REFERENCE

Both this document and the Blueprint (`MUSHROOM_FARM_BLUEPRINT.md`) use identical values for: tech stack, API prefix (`/api/v1/`), Redis keys/TTLs, WebSocket events, table definitions, device auth headers, and sync intervals (30s target / 5min current).

*Share this with any developer working on the project.*
