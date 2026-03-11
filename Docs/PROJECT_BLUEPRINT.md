# Mushroom Farm IoT Monitoring — Project Blueprint

> **Single Source of Truth** for the entire Mushroom Farm IoT + ERP Platform
> **Last Updated:** 2026-03-11
> **Project Type:** Multi-Tenant SaaS | Agricultural IoT | ERP System
> **Business Model:** Platform-as-a-Service with Flexible Pricing
> **Target Market:** Commercial Mushroom Farms (India & Global)

---

## Table of Contents

1. [Vision & Market Opportunity](#1-vision--market-opportunity)
2. [Business Model & Revenue](#2-business-model--revenue)
3. [System Architecture](#3-system-architecture)
4. [Database Schema](#4-database-schema)
5. [API Reference](#5-api-reference)
6. [Hardware Specification](#6-hardware-specification)
7. [Firmware Architecture](#7-firmware-architecture)
8. [Device Registration Flow (V2)](#8-device-registration-flow-v2)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Implementation Phases & Status](#10-implementation-phases--status)
11. [Cloud Deployment](#11-cloud-deployment)
12. [Security](#12-security)
13. [Risk Register](#13-risk-register)
14. [Success Metrics & Timeline](#14-success-metrics--timeline)

---

## 1. Vision & Market Opportunity

### Vision Statement

Build India's first comprehensive IoT + ERP platform for commercial mushroom farming that:
- **Reduces contamination losses** from 12-18% to <7% through real-time monitoring
- **Saves 4-6 lakhs annually** per 100-room farm through automated efficiency
- **Scales from 2 rooms to 500+ rooms** with consistent architecture
- **Operates reliably offline** for weeks via edge computing (Phase 2)
- **Enables data-driven decisions** through analytics and industry benchmarking

### Market Opportunity

| Metric | Value |
|--------|-------|
| Indian mushroom market | Growing 12% CAGR, 2,500+ Cr industry |
| Target customers | 1,000+ commercial farms (10+ rooms each) |
| Pain points | Manual monitoring, 15-20% crop losses, no standardization |
| Competition | Zero India-focused mushroom IoT platforms exist |
| Addressable market | 200-300 Cr opportunity |

### Current State: Inefficiency Crisis

1. **Environmental Monitoring Gaps (73% of farms)** — Manual temp/humidity checks 3-4 times daily, 4-hour average delay in detecting deviations, 12-18% crop loss impact
2. **Contamination Crisis (40-60% batch infection rate)** — Trichoderma detected 7-10 days after infection starts, 1.2L-1.8L annual loss per 10-room farm
3. **Operational Chaos (100% of multi-room farms)** — Paper logs, 2-3 hours daily wasted on data entry, 15-20% inventory discrepancy rate
4. **Scalability Bottleneck** — Farms cannot manage beyond 20 rooms manually, growth ceiling at 2-3 Cr revenue

### Target Customer Profile

**Primary Persona: Rajesh Kumar**
- Age 42, Ludhiana, Punjab — 25 growing rooms, 500 bags/room
- Mushroom Type: Button mushrooms (Agaricus bisporus)
- Monthly Revenue: 4-5 lakhs
- Current Tech: Excel, WhatsApp, manual thermometers
- Spends 4-5 hours daily monitoring; lost 80K last month to contamination
- Wants to expand to 50 rooms but fears losing control
- **Willingness to Pay:** 2K-5K per room/month if proven ROI

### Market Segmentation

| Segment | Farm Size | Count (India) | ARPU (Annual) | TAM |
|---------|-----------|---------------|---------------|-----|
| Small | 2-10 rooms | ~500 farms | 2.4L | 120 Cr |
| Medium | 10-30 rooms | ~400 farms | 12L | 480 Cr |
| Large | 30+ rooms | ~100 farms | 36L | 360 Cr |
| **Total** | | **1,000 farms** | | **960 Cr** |

### Competitive Landscape

| Feature | Generic IoT | Ag Platforms | Custom Dev | **Our Platform** |
|---------|-------------|--------------|------------|------------------|
| Mushroom-Specific | No | No | Yes | **Yes** |
| Time to Value | 3-6 months | N/A | 12-18 months | **2-4 weeks** |
| Total Cost (Year 1) | 3-5L | 4-12L | 15-25L | **50K-2L** |
| Edge Computing | No | No | Yes | **Yes** |
| Indian Market Fit | No | No | Yes | **Yes** |
| Scalability | Yes | Yes | Limited | **Yes** |

---

## 2. Business Model & Revenue

### SaaS Subscription Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Basic** | 2,000/room/month | Monitoring only |
| **Pro** | 4,000/room/month | Monitoring + automation + inventory |
| **Enterprise** | 3,000/room/month (at scale) | Full ERP + AI |

### Revenue Projections

| Year | Farms | ARR |
|------|-------|-----|
| Year 1 | 27 | 1.16 Cr |
| Year 2 | 152 | 9.12 Cr |
| Year 3 | 412 | 24.7 Cr |

### Unit Economics

| Metric | Value |
|--------|-------|
| Gross margin | 78-95% (depending on tier) |
| Break-even | 16 farms (Month 9) |
| Payback period | 18 months (including dev costs) |

### Total Investment

| Category | Amount |
|----------|--------|
| Development (4 devs x 22 months) | 1.44-1.79 Cr |
| Infrastructure (22 months) | 1.5-2.5L |
| Contingency (20%) | 30-36L |
| **Total** | **1.76-2.18 Cr** |
| **Recommended Funding** | **2.50 Cr** (safety margin) |

---

## 3. System Architecture

### High-Level Architecture Diagram

```
+-------------------------------------------------------------------+
| EDGE LAYER (On-Farm)                                               |
|                                                                    |
| ESP32 (KC868-A6) per room                                         |
| - Sensors: SCD41 (CO2), SHT40 (Temp/Hum), DS18B20 x4 (bags)     |
| - 7 Relays: CO2, Humidity, Temperature, AHU, Humidifier,         |
|   Duct/Fan, Extra                                                  |
| - LCD 20x4 + Joystick menu                                        |
| - MQTT TLS (HiveMQ Cloud:8883) every 30s                          |
| - HTTPS fallback (Railway backend) for bootstrap mode              |
+-------------------------------------------------------------------+
                          |
                  WiFi / Ethernet
                  MQTT TLS + HTTPS
                          |
                          v
+-------------------------------------------------------------------+
| CLOUD LAYER                                                        |
|                                                                    |
| Backend: FastAPI on Railway                                        |
|   protective-enjoyment-production-2320.up.railway.app              |
|                                                                    |
| Database: Neon PostgreSQL (US East 1)                              |
| Cache: Upstash Redis (TLS, closing-bee-67960.upstash.io:6379)     |
| MQTT Broker: HiveMQ Cloud (f926...hivemq.cloud:8883, TLS)         |
+-------------------------------------------------------------------+
                          |
                  WebSocket + REST API
                          |
                          v
+-------------------------------------------------------------------+
| CLIENT LAYER                                                       |
|                                                                    |
| Dashboard: React 18 + TypeScript + TailwindCSS (Vercel)           |
|   dashboard.mushroomkimandi.com                                    |
|                                                                    |
| Marketing Site: mushroomkimandi.com (Vercel)                       |
|                                                                    |
| - Real-time dashboard via WebSocket                                |
| - 40+ shadcn/ui components                                        |
| - Progressive Web App (installable)                                |
+-------------------------------------------------------------------+
```

### Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| **Backend** | FastAPI (Python) | Async, auto OpenAPI/Swagger, Pydantic validation |
| **Database** | PostgreSQL (Neon) | Row-Level Security for multi-tenancy |
| **Cache** | Redis (Upstash) | Live sensor data cache, relay command queue, TLS |
| **ORM** | SQLAlchemy + Alembic | Async sessions, migrations |
| **Frontend** | React 18 + TypeScript + TailwindCSS | shadcn/ui components (40+), Vite bundler |
| **Real-time** | WebSocket | Backend pushes sensor_update, relay_state_change, alert_created |
| **MQTT** | HiveMQ Cloud | TLS on port 8883, shared auth (admin/Admin123) |
| **Edge Device** | ESP32-WROOM-32 (Arduino C++) | KC868-A6 controller board |
| **Frontend Hosting** | Vercel | dashboard.mushroomkimandi.com |
| **Backend Hosting** | Railway | protective-enjoyment-production-2320.up.railway.app |
| **DNS** | Hostinger | A record -> 76.76.21.21, TTL 14400 |

### Data Hierarchy

```
OWNER (Company)
  +-- USERS (SUPER_ADMIN / ADMIN / MANAGER / OPERATOR / VIEWER)
  +-- PLANTS (Farm locations)
       +-- ROOMS (Growing rooms)
            +-- THRESHOLDS (1 set per room per parameter)
            +-- GROWTH CYCLES (room lifecycle stages)
            +-- HARVESTS (harvest logs with grades)
            +-- DEVICES (ESP32 controllers)
                 +-- ROOM_READINGS (sensor data, time-series)
                 +-- RELAY_STATUS (relay state change history)
                 +-- RELAY_CONFIG (per-device per-relay mode config)
                 +-- RELAY_SCHEDULE (time-based schedules)
                 +-- ALERTS (threshold violation alerts)
```

### Data Flow: ESP32 to Dashboard

```
ESP32 every 30s        MQTT TLS (8883)        Backend (Railway)        Dashboard (Vercel)
+-----------+     publishes telemetry     +----------------+   WebSocket    +----------+
| Read      |  ----------------------->  | 1. Process     |  ----------->  | React    |
| sensors   |  device/{key}/telemetry    |    MQTT msg    |  sensor_update | Live     |
| CO2,Temp  |                            | 2. Write Redis |                | readings |
| Humidity  |                            |    (live cache)|                |          |
| BagTemps  |                            | 3. Write PgSQL |                |          |
+-----------+                            |    (history)   |                |          |
                                         | 4. Check       |   WebSocket    | Alert    |
ESP32         MQTT subscribe             |    thresholds  |  ----------->  | toast    |
+-----------+  device/{key}/commands     | 5. Evaluate    |  alert_created |          |
| Execute   | <------------------------  |    AUTO relays |                |          |
| relay     |  relay commands via MQTT   | 6. Push via WS |                |          |
| commands  |                            +----------------+                +----------+
+-----------+
```

---

## 4. Database Schema

All models use SQLAlchemy with PostgreSQL (Neon). Migrations managed by Alembic.

### Enums

```
UserRole:           SUPER_ADMIN, ADMIN, MANAGER, OPERATOR, VIEWER
RoomType:           SPAWN_RUN, FRUITING, INCUBATION, STORAGE
PlantType:          OYSTER, BUTTON, SHIITAKE, MIXED
DeviceType:         ESP32, ESP8266, ARDUINO, PLC
RelayType:          CO2, HUMIDITY, TEMPERATURE, AHU, HUMIDIFIER, DUCT_FAN, EXTRA
TriggerType:        MANUAL, AUTO, SCHEDULE
ThresholdParameter: CO2, HUMIDITY, TEMPERATURE
AlertType:          CO2_HIGH, CO2_LOW, TEMP_HIGH, TEMP_LOW, HUMIDITY_HIGH, HUMIDITY_LOW, DEVICE_OFFLINE, SENSOR_ERROR
Severity:           INFO, WARNING, CRITICAL
ReportType:         DAILY, WEEKLY, MONTHLY, CUSTOM
ReportFormat:       PDF, EXCEL, CSV
SubscriptionStatus: PENDING, PENDING_APPROVAL, ACTIVE, SUSPENDED, EXPIRED
CommunicationMode:  HTTP, MQTT
AuditAction:        CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT, CONFIG_CHANGE
HarvestGrade:       A, B, C
GrowthStage:        INOCULATION, SPAWN_RUN, INCUBATION, FRUITING, HARVEST, IDLE
```

### Table 1: owners

| Column | Type | Notes |
|--------|------|-------|
| owner_id | Integer PK | Auto-increment |
| company_name | String(100) | NOT NULL |
| owner_name | String(100) | NOT NULL |
| email | String(100) | UNIQUE, NOT NULL |
| mobile | String(15) | UNIQUE |
| address | Text | |
| city | String(50) | |
| state | String(50) | |
| country | String(50) | Default "India" |
| pincode | String(10) | |
| gst_number | String(20) | |
| latitude | Numeric(10,8) | |
| longitude | Numeric(11,8) | |
| is_active | Boolean | Default true |
| created_at | DateTime | server_default now() |
| updated_at | DateTime | on update now() |

**Relationships:** has many Users, has many Plants

### Table 2: users

| Column | Type | Notes |
|--------|------|-------|
| user_id | Integer PK | Auto-increment |
| owner_id | Integer FK | -> owners.owner_id |
| username | String(50) | UNIQUE, NOT NULL |
| email | String(100) | UNIQUE, NOT NULL |
| password_hash | String(255) | NOT NULL, bcrypt |
| first_name | String(50) | |
| last_name | String(50) | |
| mobile | String(15) | |
| role | Enum(UserRole) | Default VIEWER |
| assigned_plants | JSON | Array of plant_ids |
| is_active | Boolean | Default true |
| last_login | DateTime | |
| login_attempts | Integer | Default 0 |
| locked_until | DateTime | |
| created_at | DateTime | |
| updated_at | DateTime | |

**Indexes:** idx_users_owner, idx_users_role

### Table 3: plants

| Column | Type | Notes |
|--------|------|-------|
| plant_id | Integer PK | Auto-increment |
| owner_id | Integer FK | -> owners.owner_id |
| plant_name | String(100) | NOT NULL |
| plant_code | String(20) | UNIQUE, NOT NULL |
| plant_type | Enum(PlantType) | Default OYSTER |
| location | String(100) | |
| address | Text | |
| city | String(50) | |
| state | String(50) | |
| latitude | Numeric(10,8) | |
| longitude | Numeric(11,8) | |
| plant_size_sqft | Integer | |
| no_of_rooms | Integer | Default 0 |
| established_date | Date | |
| is_active | Boolean | Default true |
| created_at | DateTime | |
| updated_at | DateTime | |

**Relationships:** has many Rooms

### Table 4: rooms

| Column | Type | Notes |
|--------|------|-------|
| room_id | Integer PK | Auto-increment |
| plant_id | Integer FK | -> plants.plant_id |
| room_name | String(100) | NOT NULL |
| room_code | String(20) | UNIQUE |
| room_type | Enum(RoomType) | Default FRUITING |
| room_size_sqft | Integer | |
| no_of_racks | Integer | Default 0 |
| no_of_bags | Integer | Default 0 |
| bags_per_rack | Integer | |
| floor_number | Integer | Default 1 |
| is_active | Boolean | Default true |
| created_at | DateTime | |
| updated_at | DateTime | |

**Relationships:** has many Devices, Thresholds, GrowthCycles, Harvests

### Table 5: devices

| Column | Type | Notes |
|--------|------|-------|
| device_id | Integer PK | Auto-increment |
| room_id | Integer FK | -> rooms.room_id, nullable |
| mac_address | String(17) | UNIQUE, NOT NULL |
| secret_key | String(12) | UNIQUE, NOT NULL |
| device_name | String(50) | |
| device_type | Enum(DeviceType) | Default ESP32 |
| firmware_version | String(20) | Default "1.0.0" |
| hardware_version | String(20) | Optional |
| device_ip | String(45) | |
| wifi_rssi | Integer | |
| free_heap | Integer | |
| is_online | Boolean | Default false |
| last_seen | DateTime | |
| is_active | Boolean | Default true |
| registered_at | DateTime | |
| updated_at | DateTime | |

**Indexes:** idx_devices_room, idx_devices_secret_key, idx_devices_mac
**Relationships:** has many RoomReadings, RelayStatuses, Alerts, RelayConfigs, RelaySchedules

### Table 6: thresholds

| Column | Type | Notes |
|--------|------|-------|
| threshold_id | Integer PK | |
| room_id | Integer FK | -> rooms.room_id |
| parameter | Enum(ThresholdParameter) | CO2/HUMIDITY/TEMPERATURE |
| min_value | Numeric(10,2) | |
| max_value | Numeric(10,2) | |
| hysteresis | Numeric(10,2) | |
| is_active | Boolean | Default true |
| updated_by | Integer FK | -> users.user_id |
| created_at | DateTime | |
| updated_at | DateTime | |

**Unique constraint:** (room_id, parameter)

**Default Threshold Values:**

| Parameter | Min | Max | Hysteresis |
|-----------|-----|-----|------------|
| CO2 | 1200 ppm | 1300 ppm | 100 ppm |
| HUMIDITY | 87.5% | 90% | 2.5% |
| TEMPERATURE | 16 C | 17 C | 1 C |

### Table 7: room_readings

| Column | Type | Notes |
|--------|------|-------|
| reading_id | BigInteger PK | |
| device_id | Integer FK | |
| room_id | Integer FK | |
| co2_ppm | Integer | |
| room_temp | Numeric(5,2) | |
| room_humidity | Numeric(5,2) | |
| bag_temp_1 ... bag_temp_10 | Numeric(5,2) | 10 individual columns |
| outdoor_temp | Numeric(5,2) | |
| outdoor_humidity | Numeric(5,2) | |
| recorded_at | DateTime | NOT NULL |
| created_at | DateTime | |

**Indexes:** idx_readings_device_time, idx_readings_room_time

### Table 8: relay_status

| Column | Type | Notes |
|--------|------|-------|
| status_id | BigInteger PK | |
| device_id | Integer FK | |
| relay_type | Enum(RelayType) | |
| state | Boolean | NOT NULL |
| trigger_type | Enum(TriggerType) | MANUAL/AUTO/SCHEDULE |
| trigger_value | Numeric(10,2) | |
| triggered_by | Integer FK | nullable, -> users.user_id |
| changed_at | DateTime | |

**Indexes:** idx_relay_device, idx_relay_changed

### Table 9: relay_config

| Column | Type | Notes |
|--------|------|-------|
| config_id | Integer PK | |
| device_id | Integer FK | -> devices.device_id |
| relay_type | Enum(RelayType) | CO2/HUMIDITY/TEMPERATURE/AHU/HUMIDIFIER/DUCT_FAN/EXTRA |
| mode | Enum(TriggerType) | MANUAL/AUTO/SCHEDULE |
| threshold_param | Enum(ThresholdParameter) | Which sensor drives relay in AUTO mode |
| action_on_high | String(3) | Default "ON" — what to do when value > max |
| action_on_low | String(3) | Default "OFF" — what to do when value < min |
| updated_by | Integer FK | |
| updated_at | DateTime | |

**Unique constraint:** (device_id, relay_type)

### Table 10: relay_schedule

| Column | Type | Notes |
|--------|------|-------|
| schedule_id | Integer PK | |
| device_id | Integer FK | |
| relay_type | Enum(RelayType) | |
| days_of_week | Integer | Bitmask: Mon=1..Sun=64, 127=every day |
| time_on | String(5) | "HH:MM" |
| time_off | String(5) | "HH:MM" |
| is_active | Boolean | Default true |
| created_by | Integer FK | |
| created_at | DateTime | |

### Table 11: alerts

| Column | Type | Notes |
|--------|------|-------|
| alert_id | BigInteger PK | |
| device_id | Integer FK | |
| room_id | Integer FK | |
| alert_type | Enum(AlertType) | |
| severity | Enum(Severity) | CRITICAL/WARNING/INFO |
| parameter | String(50) | |
| current_value | Numeric(10,2) | |
| threshold_value | Numeric(10,2) | |
| message | Text | |
| is_read | Boolean | Default false |
| acknowledged_by | Integer FK | nullable |
| acknowledged_at | DateTime | |
| is_resolved | Boolean | Default false |
| resolved_at | DateTime | |
| created_at | DateTime | |

**Indexes:** idx_alerts_room, idx_alerts_severity, idx_alerts_unread

### Table 12: reports

| Column | Type | Notes |
|--------|------|-------|
| report_id | Integer PK | |
| plant_id | Integer FK | |
| report_type | Enum(ReportType) | |
| report_name | String(100) | |
| file_path | String(255) | |
| file_size | Integer | |
| format | Enum(ReportFormat) | PDF/EXCEL/CSV |
| date_from | Date | |
| date_to | Date | |
| generated_by | Integer FK | |
| generated_at | DateTime | |

### Table 13: growth_cycles

| Column | Type | Notes |
|--------|------|-------|
| cycle_id | Integer PK | |
| room_id | Integer FK | |
| started_at | DateTime | NOT NULL |
| current_stage | Enum(GrowthStage) | INOCULATION/SPAWN_RUN/INCUBATION/FRUITING/HARVEST/IDLE |
| stage_changed_at | DateTime | |
| expected_harvest_date | DateTime | |
| target_yield_kg | Numeric(10,2) | |
| notes | Text | |
| auto_adjust_thresholds | Boolean | Default true |
| created_by | Integer FK | |
| is_active | Boolean | Default true |
| created_at | DateTime | |
| updated_at | DateTime | |

### Table 14: harvests

| Column | Type | Notes |
|--------|------|-------|
| harvest_id | Integer PK | |
| room_id | Integer FK | |
| harvested_at | DateTime | NOT NULL |
| weight_kg | Numeric(10,2) | NOT NULL |
| grade | Enum(HarvestGrade) | A/B/C |
| notes | Text | |
| recorded_by | Integer FK | |
| created_at | DateTime | |

### Table 15: firmware

| Column | Type | Notes |
|--------|------|-------|
| firmware_id | Integer PK | |
| version | String(20) | UNIQUE, NOT NULL |
| checksum_sha256 | String(64) | NOT NULL |
| file_path | String(255) | NOT NULL |
| file_size | Integer | NOT NULL |
| release_notes | Text | |
| created_by | Integer FK | |
| created_at | DateTime | |
| is_active | Boolean | Default true |

### Table 16: audit_log

| Column | Type | Notes |
|--------|------|-------|
| log_id | BigInteger PK | |
| user_id | Integer FK | nullable |
| action | Enum(AuditAction) | |
| table_name | String(50) | |
| record_id | Integer | |
| old_value | JSON | |
| new_value | JSON | |
| ip_address | String(45) | |
| user_agent | String(255) | |
| created_at | DateTime | |

---

## 5. API Reference

All endpoints prefixed with `/api/v1/`. Auth required unless noted.

### Authentication APIs (JWT)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | None | User login -> `{username, password}` -> access_token + refresh_token in httpOnly cookies |
| `/auth/logout` | POST | JWT | User logout |
| `/auth/refresh` | POST | None | Refresh token |
| `/auth/me` | GET | JWT | Current user info |
| `/auth/change-password` | POST | JWT | Change password -> `{old_password, new_password}` |

**Default credentials:** admin / admin123 (admin), ignited / ignited123 (manager)

### Owner APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/owners` | GET | JWT (SUPER_ADMIN) | List all owners |
| `/owners/{id}` | GET | JWT | Get owner |
| `/owners` | POST | JWT (SUPER_ADMIN) | Create owner |
| `/owners/{id}` | PUT | JWT (ADMIN+) | Update owner |

### User APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users` | GET | JWT | List users (RLS filtered) |
| `/users/{id}` | GET | JWT | Get user |
| `/users` | POST | JWT (ADMIN+) | Create user |
| `/users/{id}` | PUT | JWT (ADMIN+) | Update user |
| `/users/{id}` | DELETE | JWT (ADMIN+) | Soft delete |

### Plant APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/plants` | GET | JWT | List plants |
| `/plants/{id}` | GET | JWT | Get plant |
| `/plants` | POST | JWT (ADMIN+) | Create plant |
| `/plants/{id}` | PUT | JWT (ADMIN+) | Update plant |
| `/plants/{id}` | DELETE | JWT (ADMIN+) | Soft delete |
| `/plants/{id}/rooms` | GET | JWT | Get rooms of plant |

### Room APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/rooms` | GET | JWT | List rooms |
| `/rooms/{id}` | GET | JWT | Get room |
| `/rooms` | POST | JWT (ADMIN/MANAGER) | Create room |
| `/rooms/{id}` | PUT | JWT (ADMIN/MANAGER) | Update room |
| `/rooms/{id}` | DELETE | JWT (ADMIN+) | Soft delete |

### Device APIs (Web User)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/devices` | GET | JWT | List devices |
| `/devices/{id}` | GET | JWT | Get device |
| `/devices/{id}` | PUT | JWT (ADMIN/MANAGER) | Update device (assign room) |
| `/devices/{id}` | DELETE | JWT (ADMIN+) | Delete device |
| `/devices/provision` | POST | JWT (ADMIN) | Provision new device -> returns license_key |
| `/devices/link` | POST | JWT | Link device to room via license_key |
| `/devices/{id}/approve` | POST | JWT (ADMIN) | Approve device -> generates MQTT creds |

### Device APIs (ESP32)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/device/register` | POST | Key | Register device -> `{mac_address, firmware_version, hardware_version, secret_key}` |
| `/device/readings` | POST | Key | Submit sensor reading -> `{co2_ppm, room_temp, room_humidity, bag_temps[], outdoor_temp, outdoor_humidity, relay_states{}}` |
| `/device/heartbeat` | POST | Key | Health check -> `{device_ip, wifi_rssi, free_heap, uptime_seconds}` |
| `/device/{id}/commands` | GET | Key | Poll relay commands |
| `/device/provision/{license_key}` | GET | Key | Poll for MQTT credentials after approval |

**Device Auth Headers:** `X-Device-ID: 5` and `X-Device-Key: A3F7K9M2P5X8`

### Relay APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/live/relay/{device_id}` | GET | JWT | Get relay states |
| `/live/relay/{device_id}` | POST | JWT (OPERATOR+) | Set relay command -> `{relay_type, state}` |
| `/relay-config/{device_id}` | GET | JWT | Get relay mode configs |
| `/relay-config/{device_id}/{relay_type}` | PUT | JWT | Update relay mode (MANUAL/AUTO/SCHEDULE) |
| `/relay-schedule/{device_id}` | GET | JWT | Get relay schedules |
| `/relay-schedule/{device_id}/{relay_type}` | POST | JWT | Create/update schedule |

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
| `/alerts` | GET | JWT | List alerts |
| `/alerts/active` | GET | JWT | Unresolved alerts |
| `/alerts/{id}` | GET | JWT | Get alert |
| `/alerts/{id}/acknowledge` | POST | JWT (OPERATOR+) | Acknowledge |
| `/alerts/{id}/resolve` | POST | JWT (MANAGER+) | Resolve |

### Firmware APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/firmware/upload` | POST | JWT (ADMIN) | Upload .bin file |
| `/firmware/latest` | GET | JWT | Get latest firmware metadata + download URL |
| `/firmware/latest/bin` | GET | JWT | Download latest .bin binary |
| `/firmware/versions` | GET | JWT | List all firmware versions |
| `/firmware/{version}/bin` | GET | JWT | Download specific .bin |
| `/firmware/{version}` | DELETE | JWT (ADMIN) | Delete firmware version |

### Report APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/reports` | GET | JWT | List reports |
| `/reports/{id}` | GET | JWT | Download report |
| `/reports/generate` | POST | JWT (MANAGER+) | Generate report (CSV) |
| `/reports/{id}` | DELETE | JWT (ADMIN+) | Delete report |

### Growth Cycle APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/growth-cycles/room/{room_id}` | GET | JWT | Get cycles for room |
| `/growth-cycles` | POST | JWT | Create cycle |
| `/growth-cycles/{id}` | PUT | JWT | Update cycle (change stage) |

### Harvest APIs

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/harvests/room/{room_id}` | GET | JWT | Get harvests for room |
| `/harvests` | POST | JWT | Record harvest |

### WebSocket Events

**Connection:** `ws://{host}/api/v1/ws?token={jwt_token}`

| Event | Trigger | Payload |
|-------|---------|---------|
| `sensor_update` | New reading from ESP32 | `{device_id, room_id, co2_ppm, room_temp, room_humidity, bag_temps[], timestamp}` |
| `relay_state_change` | Relay toggled | `{device_id, relay_type, state, trigger_type, triggered_by}` |
| `alert_created` | Threshold violation | `{alert_id, device_id, room_id, alert_type, severity, message, value, threshold}` |
| `alert_acknowledged` | User acks alert | `{alert_id, acknowledged_by, acknowledged_at}` |
| `device_status_change` | Device online/offline | `{device_id, is_online, last_seen}` |

**Tenant isolation:** Backend only pushes events for the connected user's owner_id.

### Redis Key Patterns

| Key Pattern | Data | TTL | Updated When |
|-------------|------|-----|--------------|
| `live:device:{device_id}` | Latest sensor reading (JSON) | 60s | Every device telemetry |
| `live:room:{room_id}` | Aggregated room reading | 60s | Every device telemetry |
| `live:relay:{device_id}` | Current relay states | 60s | Relay state change |
| `command:relay:{device_id}` | Pending relay commands | 30s | User toggles relay |

---

## 6. Hardware Specification

### Per-Room Hardware BOM

| # | Component | Specification | Qty | Unit Price (INR) | Total (INR) |
|---|-----------|---------------|-----|----------------|-----------|
| **A. CONTROL BOARD** |
| 1 | KC868-A6 | ESP32-WROOM-32, 6 relays (10A@250V), Ethernet W5500, RS485, I2C, Screw terminals | 1 | 3,500 | 3,500 |
| 2 | DIN Rail Case | Official KC868-A6 enclosure with clips | 1 | 400 | 400 |
| 3 | 12V 2A Power Supply | SMPS adapter, Indian plug | 1 | 250 | 250 |
| **B. SENSORS** |
| 4 | 7Semi SHT40 Probe | Temp +/-0.2C, Humidity +/-1.8% RH, I2C (0x44), stainless steel, built-in heater | 1 | 649 | 649 |
| 5 | SCD41 | CO2 0-40,000ppm +/-40ppm, I2C (0x62), photoacoustic NDIR | 1 | 0 | 0 (owned) |
| 6 | DS18B20 Waterproof | Substrate temp, -55 to +125C +/-0.5C, 1-Wire, stainless probe 1m cable | 4 | 120 | 480 |
| 7 | 4.7k ohm Resistor | Pull-up for DS18B20 bus (shared) | 1 | 1 | 1 |
| **C. ENCLOSURE** |
| 8 | IP65 Junction Box | 200x150x100mm, clear polycarbonate lid, ABS body | 1 | 400-900 | 400-900 |
| 9 | DIN Rail (35mm) | Aluminum, 150mm, TS35 standard | 1 | 80 | 80 |
| 10 | PG9 Cable Glands | Nylon, 4-8mm cable, IP68 | 10 | 20 | 200 |
| 11 | MeanWell HDR-30-12 PSU | Optional: DIN rail 12V 2.1A industrial (replaces #3) | 1 | 1,200 | 1,200 |
| **D. NETWORKING** |
| 12 | Cat6 Ethernet Cable | Shielded, 20m per room | 1 | 300 | 300 |
| **E. WIRING** |
| 13 | Wire, ties, heat shrink, screws, sealant | Misc installation materials | 1 | 280 | 280 |

**Per Room Cost:**

| Configuration | Total (INR) | Notes |
|---------------|-------------|-------|
| Budget | 6,410 | Generic box + external PSU + rain shield |
| Standard | 6,960 | Premium box + external PSU + rain shield |
| Premium | 7,930 | Premium box + MeanWell PSU + SCD41 enclosure |

**Recommended:** Standard (INR 6,960)

### Complete 8-Room System BOM

| Category | Per Room (INR) | x 8 Rooms | Total (INR) |
|----------|--------------|-----------|-----------|
| Control Boards (KC868-A6 + Case + PSU) | 4,150 | 8 | 33,200 |
| Sensors (SHT40 + SCD41 + 4xDS18B20) | 1,130 | 8 | 9,040 |
| Professional Enclosures (IP65 Premium) | 2,380 | 8 | 19,040 |
| Sensor Protection (Rain Shield) | 50 | 8 | 400 |
| Networking (Cat6 Cables) | 300 | 8 | 2,400 |
| Wiring & Installation | 280 | 8 | 2,240 |
| **SUBTOTAL (Per-Room)** | | | **66,320** |
| Shared Network Infrastructure | - | - | 8,500 |
| Spare Parts (10%) | - | - | 6,632 |
| **GRAND TOTAL** | | | **81,452** |

Budget Alternative: INR 51,280 | Premium Alternative: INR 96,648

### Sensor Specifications Matrix

| Sensor | Parameter | Range | Accuracy | Resolution | Protocol | I2C Addr | Price (INR) |
|--------|-----------|-------|----------|------------|----------|----------|-----------|
| **SHT40 Probe** | Temp | -40 to +125C | +/-0.2C | 0.01C | I2C | 0x44 | 649 |
| | Humidity | 0-100% RH | +/-1.8% RH | 0.01% | | | |
| | Heater | Built-in | Prevents saturation | N/A | I2C cmd | | |
| **SCD41** | CO2 | 0-40,000 ppm | +/-40ppm + 5% | 1 ppm | I2C | 0x62 | 5,500 (owned) |
| | Temp (backup) | -10 to +60C | +/-0.8C | 0.01C | | | |
| | Humidity (backup) | 0-100% RH | +/-6% RH | 0.01% | | | |
| **DS18B20** | Temp (substrate) | -55 to +125C | +/-0.5C | 0.0625C | 1-Wire | N/A | 120 |

### KC868-A6 Controller Specifications

| Feature | Specification |
|---------|---------------|
| Microcontroller | ESP32-WROOM-32 (Dual-core 240MHz, 520KB RAM, 4MB Flash) |
| Relays | 6x SPDT 10A@250V AC, Opto-isolated |
| Ethernet | W5500 chip, 10/100 Mbps, RJ45 |
| WiFi | 2.4GHz 802.11 b/g/n (backup only, Ethernet preferred) |
| Bluetooth | BLE 4.2 (available, not used) |
| GPIO | 30+ pins available |
| I2C | Hardware I2C, 400kHz |
| RS485 | Modbus support (available, not used) |
| Terminals | All screw terminals (5.08mm pitch) |
| Power Input | 9-36V DC (12V recommended) |
| Operating Temp | -20C to +70C |
| Dimensions | 106x87x26mm |
| DIN Rail | 35mm TS35 clips |
| OTA | Dual partition with rollback |

### 7 Relay Assignments (GPIO Pins)

| Relay | Equipment | GPIO Pin | Load (Typical) | Control Mode |
|-------|-----------|----------|----------------|--------------|
| **R1** | CO2 | GPIO16 | Variable | AUTO (threshold) |
| **R2** | Humidity | GPIO23 | Variable | AUTO (threshold) |
| **R3** | Temperature | GPIO4 | 1500W (6.5A@230V) | AUTO (PID) |
| **R4** | AHU (Air Handling) | GPIO13 | Variable | AUTO/SCHEDULE |
| **R5** | Humidifier | GPIO14 | 400W (1.7A@230V) | AUTO (threshold) |
| **R6** | Duct/Fan | GPIO27 | 150W (0.7A@230V) | AUTO (CO2/humidity) |
| **R7** | Extra | GPIO25 | 100W (0.4A@230V) | MANUAL/SCHEDULE |

**Relay modes:** MANUAL (user toggle), AUTO (threshold-driven with hysteresis), SCHEDULE (time-based via day/time rules)

### Power Requirements

| Component | Power |
|-----------|-------|
| KC868-A6 (ESP32 + Relays) | 3.6W |
| Sensors (SHT40 + SCD41 + 4x DS18B20) | <1W |
| MeanWell PSU self-consumption | 1W |
| **Control System Total** | **~5W** |
| HVAC Equipment (AC + Heat + Hum + Exhaust + Fan + Lights) | ~3,430W |
| **Per Room Total** | **~3,435W** |
| **8-Room Farm Peak** | **~27.5 kW** |

**Electrical:** Requires 63A@230V service or 3-phase 32A (22 kW). Typical draw: 12-15 kW.

**UPS:** Switch + 8x KC868 = ~60W total. 1000VA UPS (INR 5,000) provides 30 min backup.

### Network Infrastructure

| Component | Specification | Qty | Price (INR) |
|-----------|---------------|-----|-----------|
| Gigabit Switch | 8-port PoE+ managed (Netgear/TP-Link) | 1 | 6,500 |
| Cat6 Patch Cables | 1m, shielded, 10-pack | 1 | 500 |
| Network Cabinet | Wall-mount 6U rack, lockable (optional) | 1 | 2,500 |
| UPS | 1000VA, 4 outlets, 30min backup (recommended) | 1 | 5,000 |
| **Basic Total** | | | **8,500** |
| **Professional Total** | | | **14,500** |

### Wiring Guide

```
KC868-A6 GPIO Terminals:
+-- 3.3V ---+--- SHT40 VCC (Red)
|            +--- SCD41 VCC (Red)
|            +--- 4x DS18B20 VCC (Red, twisted together)
|            +--- 4.7k ohm resistor (one leg)
|
+-- GND ----+--- SHT40 GND (Black)
|            +--- SCD41 GND (Black)
|            +--- 4x DS18B20 GND (Black, twisted together)
|
+-- SDA ----+--- SHT40 SDA (Yellow)
|            +--- SCD41 SDA (Green)
|
+-- SCL ----+--- SHT40 SCL (Blue)
|            +--- SCD41 SCL (White)
|
+-- IO4 ----+--- 4x DS18B20 DATA (Yellow, twisted together)
             +--- 4.7k ohm resistor (other leg)
```

**Wire color code:**
- DC Power: Red (+12V), Black (GND)
- Sensors: Red (VCC 3.3V), Black (GND), Yellow (DATA/1-Wire), Green (SDA), Blue (SCL)
- AC Relay: Brown (Live), Blue (Neutral), Green/Yellow (Earth)

### Installation Checklist

**Pre-Installation:**
- [ ] Electrical survey: Verify 63A service or 3-phase
- [ ] Network survey: Plan switch location, cable runs
- [ ] Room survey: Measure distances, plan sensor placement
- [ ] Order KC868-A6 boards (3-4 week lead time from AliExpress)
- [ ] Order sensors and enclosures (Amazon India, 2-day delivery)

**Per Room (2-3 hours):**
1. Enclosure Assembly (30 min) -- DIN rail, KC868, PSU, cable glands
2. Sensor Installation (45 min) -- SHT40 wall mount 1.5m, SCD41 near exhaust, DS18B20 in bags
3. Wiring (60 min) -- Power, I2C, 1-Wire, Ethernet, HVAC relays
4. Testing (30 min) -- Boot, WiFi/captive portal, sensor readings, relay toggle, flash firmware, register device
5. Final Assembly (15 min) -- Close enclosure, mount, cable management, label

**System Integration:**
- [ ] Configure switch, assign static IPs
- [ ] Configure MQTT topics
- [ ] Set up backend (rooms, devices)
- [ ] Set HVAC thresholds per growth stage
- [ ] Enable alerting
- [ ] Train staff

### Maintenance Schedule

| Task | Frequency | Duration |
|------|-----------|----------|
| Visual inspection (LCD, equipment) | Daily | 5 min |
| Sensor calibration check | Weekly | 15 min |
| Clean sensor housings | Monthly | 30 min |
| Network connectivity test | Monthly | 10 min |
| Firmware OTA update | Quarterly | 2 hrs |
| Replace DS18B20 probes | Annually | 1 hr |
| UPS battery test | Annually | 30 min |
| Full system audit | Annually | 4 hrs |

---

## 7. Firmware Architecture

### v4.0.0 Overview

| Aspect | Value |
|--------|-------|
| Platform | ESP32-WROOM-32 (KC868-A6) |
| Framework | Arduino (C/C++) |
| Version | v4.0.0 |
| Architecture | Polling-based, dual-mode (HTTP Bootstrap / MQTT Runtime) |
| Data Sync | Every 30 seconds via MQTT TLS (HiveMQ Cloud:8883) |
| Fallback | HTTPS POST to Railway backend (bootstrap mode) |
| Device Auth | 18-character license key (LIC-XXXX-YYYY-ZZZZ) |
| MQTT Auth | Shared admin/Admin123 (HiveMQ Cloud) |
| OTA | Dual partition with automatic rollback |

### Key v4.0.0 Features

1. **TLS MQTT** -- WiFiClientSecure for HiveMQ Cloud on port 8883, setInsecure() (skip cert pinning to save 10KB RAM)
2. **HTTPS** -- WiFiClientSecure for all HTTP calls to Railway backend (Let's Encrypt)
3. **Setup Mode** -- On first boot (no license key in EEPROM), waits for Serial input from Web Serial API
4. **EEPROM Dirty Flag** -- Only commits to flash when values change (prevents flash wear, was writing every loop)
5. **NTP Time Sync** -- configTime() after WiFi connect, IST UTC+5:30
6. **ArduinoJson Telemetry** -- StaticJsonDocument<768> for memory-safe JSON serialization (no heap fragmentation)
7. **QoS 1 Publish** -- At-least-once delivery for telemetry
8. **Relay Chatter Fix** -- checkForRelay() disabled in MQTT mode; backend controls relays exclusively via MQTT commands
9. **OTA Memory Management** -- Disconnects MQTT TLS before OTA download to free ~45KB RAM
10. **Captive Portal** -- AP name: MUSH_XXXX (last 4 chars of license key), password: 123456

### Firmware File Structure

```
Firmware/src/main/
+-- main.ino                    # Entry, setup(), loop(), Setup Mode
+-- configuration.h             # Globals: URLs, pins, MQTT creds, NTP, thresholds
+-- mqttClient.ino              # TLS MQTT: setup, connect, publish telemetry, OTA handler, relay/config handlers
+-- sendingJsonRequest.ino      # HTTPS: POST readings, heartbeat, poll commands, poll provision
+-- CO2Sensor.ino               # SCD41 I2C driver
+-- dhtSensor.ino               # DHT11 outdoor sensor
+-- bagSensor.ino               # DS18B20 array (2 buses)
+-- relayControl.ino            # Local threshold automation (HTTP mode only)
+-- captivePortal.ino           # WiFi AP captive portal (MUSH_XXXX / 123456)
+-- initWifi.ino                # WiFi connect + reconnect
+-- initializeDevices.ino       # Hardware init (I2C, LCD, sensors, relays, joystick)
+-- eepromConfig.ino            # 512-byte EEPROM read/write
+-- getKey.ino                  # Device key auth via HTTPS
+-- menuControl.ino             # LCD menu system
+-- joyStick.ino                # Joystick input handling
+-- welcomeScreen.ino           # Boot splash screen
```

### Dual Partition OTA Layout

```
Flash Memory (4MB):
+------------------------+ 0x000000
|   Bootloader            | (factory, never changes)
+------------------------+ 0x009000
|   NVS                   | 20KB (WiFi calibration, misc)
+------------------------+ 0x00E000
|   OTA Data              | 8KB (which partition to boot)
+------------------------+ 0x010000
|                         |
|   app0 (OTA_0)          | 1.875 MB  <-- Currently running firmware
|                         |
+------------------------+ 0x1F0000
|                         |
|   app1 (OTA_1)          | 1.875 MB  <-- Receives OTA update
|                         |
+------------------------+ 0x3D0000
|   SPIFFS                | 192KB (file storage)
+------------------------+ 0x400000
```

**Partition table (`partitions.csv`):**

```csv
# Name,   Type, SubType, Offset,  Size,    Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x140000,
app1,     app,  ota_1,   0x150000,0x140000,
spiffs,   data, spiffs,  0x290000,0x70000,
```

**OTA Update Sequence:**

1. MQTT `/ota` message arrives with URL + version + checksum
2. Version check (skip if already on target version)
3. Disconnect MQTT to free RAM for second TLS session
4. Download .bin via HTTPS and write to inactive partition
5. `Update.end(true)` finalizes, marks new partition as `PENDING_VERIFY`
6. `ESP.restart()` -- bootloader boots new partition
7. New firmware has 60 seconds to call `esp_ota_mark_app_valid_cancel_rollback()`
8. If it crashes or hangs, bootloader auto-reverts to old partition

**Rollback triggers:**

| Scenario | Result |
|----------|--------|
| New FW crashes in setup() | Bootloader reverts to old partition |
| New FW hangs (no mark_valid in 60s) | Bootloader reverts on next reboot |
| Power loss during OTA write | Old partition untouched, boots normally |
| OTA download interrupted | Update.abort() called, no partition change |

### Boot Sequence

```
POWER ON
    |
    v
1. Serial.begin(115200), LCD init, show "FW: v4.0.0"
    |
    v
2. NVS init (non-volatile storage)
    |
    v
3. EEPROM init (load thresholds, license key, WiFi creds, relay states)
    |
    v
4. License key check:
   - No key (EEPROM addr 13 == 255) -> SETUP MODE (wait for Serial "KEY:LIC-...")
   - Has key -> continue
    |
    v
5. WiFi connect (or captive portal if no saved credentials)
    |
    v
6. NTP time sync (pool.ntp.org, IST UTC+5:30)
    |
    v
7. Initialize sensors (SCD41, DS18B20, DHT11), relays, auth
    |
    v
8. Mode selection:
   - mqttProvisioned == true  -> MQTT Runtime Mode (TLS, HiveMQ:8883)
   - mqttProvisioned == false -> HTTP Bootstrap Mode (HTTPS, Railway)
    |
    v
9. OTA boot validation (mark firmware valid if PENDING_VERIFY)
    |
    v
10. MAIN LOOP (forever, 30s cycle):
    - Read sensors (SCD41, DS18B20, DHT11)
    - MQTT mode: publishTelemetry(), process MQTT messages (relay/config/ota/control)
    - HTTP mode: sendHTTPRequest(), pollRelayCommands(), checkForRelay() (local automation)
    - EEPROM commit only if dirty flag set
```

### Sensor Reading Flow (30s interval)

1. SCD41 via I2C -> CO2 (ppm), Room Temp (C), Room Humidity (%)
2. DHT11 via GPIO -> Outdoor Temp (C), Outdoor Humidity (%), Heat Index
3. DS18B20 via OneWire (2 buses) -> Bag Temp 1-10 (C)
4. Apply calibration offsets
5. Update LCD display
6. Serialize to JSON (ArduinoJson StaticJsonDocument<768>)
7. Publish to `device/{licenseKey}/telemetry` via MQTT QoS 1

### Relay Automation Flow

**HTTP Mode (local automation):**
- `checkForRelay()` runs every loop iteration
- Compares sensor values against EEPROM thresholds with hysteresis
- Toggles GPIO pins directly
- Only writes EEPROM when state changes (dirty flag)

**MQTT Mode (backend-controlled):**
- `checkForRelay()` is DISABLED to prevent relay chatter
- Backend `relay_automation.py` evaluates thresholds on every telemetry message
- Backend sends relay commands via MQTT `device/{key}/commands`
- Firmware `handleRelayCommand()` receives and applies commands
- Backend `relay_scheduler.py` checks schedules every 60 seconds

### Heartbeat & Auth Cycle

- **HTTP mode:** Authenticates device key every `keyAuthenticationTimer` interval, sends heartbeat with IP/RSSI/heap/uptime
- **MQTT mode:** MQTT LWT (Last Will and Testament) handles online/offline detection; telemetry includes wifi_rssi, free_heap, device_ip, uptime_s
- **MQTT keepalive:** 60 seconds
- **Consecutive failure handling:** After 20 consecutive MQTT failures, clears provisioning and reboots into HTTP bootstrap mode

### ESP32 Memory Budget

| Component | RAM (approx) |
|-----------|-------------|
| FreeRTOS + Arduino core | 50 KB |
| WiFi stack | 40 KB |
| WiFiClientSecure (1 TLS session) | 45 KB |
| PubSubClient buffer (1024 bytes) | 1 KB |
| AsyncWebServer | 15 KB |
| EEPROM buffer (512 bytes) | 0.5 KB |
| LCD + I2C drivers | 5 KB |
| Sensor libraries | 10 KB |
| ArduinoJson documents | 3 KB |
| String objects + stack | 20 KB |
| **TOTAL USED** | **~190 KB** |
| **ESP32 SRAM** | **320 KB** |
| **FREE** | **~130 KB** |
| **During OTA (2nd TLS)** | **~85 KB free** |

---

## 8. Device Registration Flow (V2)

### 5-Step Device Lifecycle

```
STEP 1          STEP 2           STEP 3        STEP 4         STEP 5
Admin Flash  -> User WiFi    -> Device Pings -> User Links  -> Admin
(Dashboard)     Setup           Backend        to Room       Approves
(USB+Chrome)    (Captive        (Auto)         (QR Scan)     (Notification)
                 Portal)

Creates:        Connects:       Registers:     Links:         Activates:
- MAC addr      - User WiFi     - "I'm ready"  - Room <> Dev  - MQTT creds
- License key   - Internet      - Status:       - Status:      - Status:
- QR + Barcode                    PENDING         PENDING_      ACTIVE
- Sticker                                         APPROVAL
- Flash FW
```

### Step 1: Admin Flashes Device (Dashboard, Chrome Web Serial)

1. **Connect** -- Browser prompts to select USB serial port, connects at 115200 baud
2. **Flash Firmware** -- Dashboard fetches latest .bin from `GET /api/v1/firmware/latest`, uses esptool-js to flash via Web Serial (30-60s for 1.5MB)
3. **Read MAC** -- ESP32 reboots into Setup Mode, prints `MAC:XX:XX:XX:XX:XX:XX` on Serial
4. **Register in Backend** -- Dashboard calls `POST /api/v1/devices/provision` with MAC -> backend returns `{device_id, license_key: "LIC-877V-4REX-K60T"}`
5. **Write License Key** -- Dashboard sends `KEY:LIC-877V-4REX-K60T\n` via Web Serial -> firmware writes to EEPROM -> responds `KEY_OK:LIC-877V-4REX-K60T`
6. **Generate Sticker** -- QR code (license key), barcode (Code128), WiFi AP name (MUSH_K60T), password (123456), MAC, firmware version
7. **Print Sticker** -- Thermal printer layout (62mm label), `window.print()` with print CSS
8. **Device Reboots** -- Enters captive portal mode (has key, no WiFi credentials)

**Setup Mode firmware behavior:** If EEPROM key flag == 255 (no key), firmware enters infinite loop listening on Serial for `KEY:LIC-XXXX-YYYY-ZZZZ\n` command. Also responds to `PING`, `MAC`, `VERSION` queries.

### Step 2: User Connects Device to WiFi (Captive Portal)

1. User reads sticker: WiFi `MUSH_K60T`, Pass `123456`
2. Phone connects to device AP -> captive portal opens at 192.168.4.1
3. Portal shows available WiFi networks with signal strength
4. User selects network, enters password, submits
5. Device saves WiFi credentials to EEPROM, reboots
6. Device connects to farm WiFi, gets IP

### Step 3: Device Pings Backend (Automatic)

1. Device sends `POST /api/v1/device/register` with license_key, MAC, firmware_version
2. Backend creates/updates device record: is_online=true, status=PENDING
3. Device enters HTTP Bootstrap Mode: sends readings every 30s, polls `/device/provision/{key}` every 30s
4. Dashboard shows device as "ONLINE - PENDING"

### Step 4: User Links Device to Room (QR Scan)

1. User opens Dashboard -> Rooms -> "Room 3" -> "Add Device"
2. Camera opens with QR scan overlay (html5-qrcode library)
3. Scans QR code on device sticker -> decodes license key
4. Dashboard confirms device info, user clicks "Confirm Link"
5. `POST /api/v1/devices/link` with license_key + room_id
6. Status changes to PENDING_APPROVAL
7. Admin notification via WebSocket

**Fallback:** Manual text entry of license key if camera unavailable.

### Step 5: Admin Approves Device

1. Admin reviews request (device info, requestor, room, subscription status)
2. Admin clicks "Approve" -> `POST /api/v1/devices/{id}/approve`
3. Backend generates MQTT password (32-char random, Fernet encrypted in DB)
4. Status: PENDING_APPROVAL -> ACTIVE, communication_mode: HTTP -> MQTT
5. Device polls provision endpoint, receives mqtt_host, mqtt_port, status "ready"
6. Device saves MQTT credentials to EEPROM, reboots
7. Device boots into MQTT Runtime Mode, connects to HiveMQ Cloud TLS:8883
8. Subscribes to: `device/{key}/commands`, `/control`, `/ota`, `/config`
9. Publishes telemetry every 30s
10. Dashboard shows ACTIVE + ONLINE with real-time data

### Sticker Layout (62mm Thermal Label)

```
+------------------------------------------+
|                                          |
|   [QR CODE]    [||||BARCODE|||||]        |
|                LIC-877V-4REX-K60T        |
|                                          |
|   MUSHROOM FARM IoT SENSOR               |
|   --------------------------------       |
|   WiFi: MUSH_K60T                        |
|   Pass: 123456                           |
|   S/N:  ESP32-WROOM-003                  |
|   MAC:  AA:BB:CC:DD:EE:FF               |
|   FW:   v4.0.0                           |
|                                          |
|   mushroomkimandi.com                    |
+------------------------------------------+
```

### Required NPM Dependencies

```
esptool-js      -- Web Serial flashing (Espressif official)
html5-qrcode    -- QR code / barcode scanner via camera
qrcode.react    -- QR code generation for sticker
jsbarcode       -- Code128 barcode generation for sticker
```

**Browser requirements:** Chrome 89+ or Edge 89+ (Web Serial API), camera access, HTTPS context.

---

## 9. Frontend Architecture

### Technology

- **Framework:** React 18 + TypeScript
- **Bundler:** Vite (dev server on port 3801)
- **Styling:** TailwindCSS + shadcn/ui (40+ components)
- **HTTP Client:** Axios with cookie auth (`withCredentials: true`)
- **State:** React Context (AppContext.tsx)
- **Real-time:** Native WebSocket with auto-reconnect
- **Data Mapping:** snake_case (backend) <-> camelCase (frontend) via `utils/mappers.ts` (14+ mapper functions)
- **IDs:** Backend integer IDs, frontend string IDs (mappers handle conversion)

### Pages

| Page | Route | Data Source | Key Actions |
|------|-------|------------|-------------|
| Login | /login | Auth API | Login form (admin/admin123, ignited/ignited123) |
| Dashboard | /dashboard | WebSocket + REST | Live sensor data, charts, room overview |
| Plants | /plants | REST | CRUD plant management |
| Rooms | /rooms, /rooms/:id | REST | CRUD rooms, Add Device (QR scan) |
| Devices | /devices | REST | Device list, assign to room, status |
| Alerts | /alerts | WebSocket + REST | View, acknowledge, resolve alerts |
| Reports | /reports | REST | Generate CSV reports, download, streaming export |
| Users | /users | REST | CRUD users (Admin only) |
| Settings | /settings | REST | Thresholds, relay configs, schedules |
| FlashDevice | /devices/flash | Web Serial + REST | 5-step device flash wizard |
| Profile | /profile | REST | Update own profile |

### Key Components

| Component | Location | Purpose |
|-----------|----------|---------|
| RelayToggle | `ui-custom/RelayToggle.tsx` | 3-mode relay control (MANUAL/AUTO/SCHEDULE) |
| ScheduleEditor | `ui-custom/ScheduleEditor.tsx` | Day/time schedule dialog for SCHEDULE mode |
| DeviceSticker | `ui-custom/DeviceSticker.tsx` | QR + barcode sticker for print |
| QRScanner | `ui-custom/QRScanner.tsx` | Camera QR scanner for room linking |

### Key Service Files

| File | Purpose |
|------|---------|
| `services/api.ts` | Axios instance with cookie auth, base URL, interceptors |
| `services/liveService.ts` | Relay config/schedule + live data API |
| `services/harvestService.ts` | Harvest & growth cycle API |
| `services/reportService.ts` | Report generation & CSV download |
| `services/firmwareService.ts` | Firmware upload/download API (planned) |

### State Management

React Context (`store/AppContext.tsx`) holds:
- Current user and auth state
- Live sensor data (updated via WebSocket)
- Active alerts
- Relay states

### WebSocket Integration

`hooks/useWebSocket.ts` manages:
- Connection to `ws://{host}/api/v1/ws?token={jwt}`
- Auto-reconnect on disconnect (3s delay)
- Event dispatch: `sensor_update`, `relay_state_change`, `alert_created`, `alert_acknowledged`, `device_status_change`

### Data Mapping

All backend responses use snake_case; frontend uses camelCase. `utils/mappers.ts` provides 14+ functions:
- `mapDevice()`, `mapRoom()`, `mapPlant()`, `mapReading()`, `mapAlert()`, etc.
- Integer ID (backend) <-> String ID (frontend) conversion

---

## 10. Implementation Phases & Status

### Completed Phases

| Phase | Name | What Was Built | Status |
|-------|------|---------------|--------|
| **Phase 1** | Doc Fix + Scaffolding | Project structure, initial docs | COMPLETE |
| **Phase 2** | Backend Core | FastAPI + PostgreSQL + Redis + Auth + CRUD + Device API + WebSocket | COMPLETE |
| **Phase 3** | Firmware Updates | Bug fixes, unified JSON POST, 30s interval, relay polling, heartbeat | COMPLETE |
| **Phase 4** | Frontend Integration | API layer, WebSocket, all pages wired to real backend | COMPLETE |
| **Phase 5** | Layers 1-7 | QR onboarding, captive portal, WiFi resilience, 7-relay expansion, dual OTA, firmware mgmt | COMPLETE |
| **Phase 6** | E2E Testing | 28 Playwright tests (19 admin + 9 user), all passing | COMPLETE |
| **Phase A** | Machinery Control Center | Relay AUTO/SCHEDULE modes, threshold sync to firmware via MQTT /config | COMPLETE |
| **Phase B** | Harvest & Yield Tracking | Harvest model, growth cycles, real data replaces mock YieldSummary | COMPLETE |
| **Phase C** | Reports & Export | CSV generation, download, streaming data export | COMPLETE |
| **Phase D** | Quality of Life | Users page fetch bug fix, Equipment Matrix real relay data | COMPLETE |
| **Cloud** | Cloud Deployment | Railway, Vercel, Neon, Upstash, HiveMQ Cloud, DNS | COMPLETE |
| **FW v4** | Firmware v4.0.0 + Device Reg v2 | TLS MQTT, HTTPS, Setup Mode, EEPROM dirty flag, NTP, ArduinoJson, flash wizard, sticker gen | COMPLETE |

### Remaining Work Items (Priority Order)

1. **Flash ESP32-Sensor-02 via USB** with v4.0.0 (`cd Firmware && pio run --target upload`). Write key via Serial: `KEY:LIC-XXXX-YYYY-ZZZZ`
2. **Monitor 24 hours** -- check free_heap stability, MQTT TLS connection, telemetry flow
3. **Flash ESP32-Sensor-01** after Sensor-02 is stable
4. **Wire esptool-js** into FlashDevice page (Web Serial -- currently placeholder Steps 1-2)
5. **Create firmwareService.ts** -- API service file for frontend firmware calls (not yet created)
6. **MQTT Auth Migration** -- Switch from shared admin/Admin123 to EMQX Cloud when 10+ devices
7. **Upstash Redis Upgrade** -- Free tier exceeded (10K commands/day, using ~23K/day with 2 devices)
8. **Cookie secure=True** -- Set in auth.py for production (currently False)
9. **Rate limiting** -- Re-implement without Redis dependency (in-memory or edge)
10. **PWA Mobile** -- Progressive Web App optimization (Phase 2 roadmap)

### Future Phases (Roadmap)

| Phase | Timeline | Deliverable |
|-------|----------|-------------|
| Phase 2 | Months 8-15 | Raspberry Pi Gateway, offline buffering, MQTT protocol, advanced automation, PWA mobile, push notifications, SMS alerts, TimescaleDB |
| Phase 3 | Months 16-22 | ERP: inventory, production tracking, batch management, contamination analytics, AI/ML yield predictions, billing |

---

## 11. Cloud Deployment

### Service Map

| Service | Platform | URL / Host | Notes |
|---------|----------|-----------|-------|
| **Marketing Site** | Vercel | mushroomkimandi.com / .in / .online | Static site |
| **Dashboard** | Vercel | dashboard.mushroomkimandi.com | React SPA |
| **Backend API** | Railway | protective-enjoyment-production-2320.up.railway.app | FastAPI, Dockerfile |
| **Database** | Neon PostgreSQL | ep-wispy-bread-ahepiky3-pooler.c-3.us-east-1.aws.neon.tech:5432 | db: neondb, US East 1 |
| **Redis** | Upstash | closing-bee-67960.upstash.io:6379 | TLS enabled |
| **MQTT Broker** | HiveMQ Cloud | f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud:8883 | TLS, shared auth |

### Account References

| Service | Account | Project ID |
|---------|---------|-----------|
| Vercel | ai-meharbnsingh | -- |
| Railway | -- | f7aa68d6-708c-4f91-a7d5-31256539983f |
| Neon | -- | mushroom-farm project |

### DNS Configuration

All domains use Hostinger DNS:
- A record -> 76.76.21.21 (Vercel)
- TTL 14400

| Domain | Points To |
|--------|-----------|
| mushroomkimandi.com | Vercel (marketing site) |
| mushroomkimandi.in | Vercel (marketing site) |
| mushroomkimandi.online | Vercel (marketing site) |
| dashboard.mushroomkimandi.com | Vercel (dashboard app) |

### CORS Configuration

```
CORS_ORIGINS=https://mushroomkimandi.com,https://dashboard.mushroomkimandi.com,http://localhost:3801
```

(Plus Vercel frontend auto-generated URL)

### Deployment Configuration

- `railway.toml` at repo root points to `backend/Dockerfile`
- Dockerfile uses `backend/` prefix paths for Railway GitHub deploy
- Backend credentials in `backend/.env.production` (gitignored)
- Redis and MQTT are optional in `main.py` lifespan (graceful fallback if unavailable)
- Alembic migrations ran on Neon (all tables created)

---

## 12. Security

### Authentication

| Actor | Method | Details |
|-------|--------|---------|
| **Web Users** | JWT (httpOnly cookies) | Access token: 15 min, Refresh token: 7 days. Cookie-based (withCredentials). |
| **ESP32 Devices** | License Key + Device ID | `X-Device-Key` + `X-Device-ID` headers. Key is 18-char (LIC-XXXX-YYYY-ZZZZ), stored in EEPROM. |
| **WebSocket** | JWT in query param | `ws://host/api/v1/ws?token={jwt}`. Validated on connection. |
| **MQTT** | Shared credentials | admin / Admin123 on HiveMQ Cloud. License key used as client ID for uniqueness. |

### Authorization (Role-Based)

| Role | Plants | Rooms | Devices | Thresholds | Alerts | Users | Reports |
|------|--------|-------|---------|------------|--------|-------|---------|
| SUPER_ADMIN | All | All | All | All | All | All | All |
| ADMIN | Own | Own | Own | CRUD | CRUD | CRUD | CRUD |
| MANAGER | Assigned | Assigned | Assigned | Read/Update | Read/Ack | Read | Generate |
| OPERATOR | Assigned | Assigned | Read | Read | Read/Ack | - | Read |
| VIEWER | Assigned | Assigned | Read | Read | Read | - | Read |

### Tenant Isolation

- PostgreSQL Row-Level Security on all tenant-scoped tables
- Every API request sets `app.current_owner_id` from JWT before querying
- WebSocket connections filtered by owner_id
- Device readings validated: device must belong to owner's plant/room hierarchy

### Device Authentication

- License key format: `LIC-XXXX-YYYY-ZZZZ` (18 characters)
- Pre-generated by backend during provisioning
- Written to ESP32 EEPROM via Web Serial during initial flash
- Sent as `X-Device-Key` header on every HTTP request
- Used as MQTT client ID

### MQTT Auth

**Current (2-3 devices):** Shared credentials `admin`/`Admin123` on HiveMQ Cloud Serverless. Topic structure `device/{licenseKey}/...` provides logical separation.

**Future (10+ devices):** Migrate to EMQX Cloud with HTTP Auth Plugin. Backend's existing `/api/v1/emqx/auth` and `/acl` endpoints will work without changes. Cost: ~$15/month for 1000 connections.

### TLS

- **MQTT:** TLS on port 8883 (HiveMQ Cloud enforces TLS)
- **Backend API:** HTTPS (Railway provides Let's Encrypt)
- **Dashboard:** HTTPS (Vercel)
- **ESP32 to Backend:** WiFiClientSecure with `setInsecure()` (skip cert pinning to save RAM)

### Security Roadmap

| Feature | Status |
|---------|--------|
| JWT authentication (web) | DONE |
| Secret key auth (device) | DONE |
| HTTPS / TLS | DONE |
| CORS policy | DONE |
| Input validation (Pydantic) | DONE |
| Password hashing (bcrypt) | DONE |
| Account lockout (5 failed attempts) | DONE |
| Rate limiting on login | REMOVED (was Redis-dependent, needs re-implementation) |
| Cookie secure=True | TODO (currently False) |
| Per-device MQTT auth | DEFERRED (switch to EMQX Cloud at 10+ devices) |
| HMAC request signing (device) | Phase 2 |
| Audit logging | DONE (audit_log table) |

---

## 13. Risk Register

### Tier 1: WILL Definitely Cause Problems (Fix Now)

| # | Issue | Impact | Status | Fix |
|---|-------|--------|--------|-----|
| 5.1 | **EEPROM Flash Wear** -- `EEPROM.commit()` every loop, 2,880 writes/day, dead in 35-350 days | Device brick | **FIXED** (v4.0.0) | Dirty flag, commit only on change |
| 5.2 | **Dual TLS RAM Exhaustion** -- Two WiFiClientSecure sessions = ~90KB = crash during OTA | OTA crash | **FIXED** (v4.0.0) | Disconnect MQTT before OTA download |
| 5.3 | **MQTT Auth Not Enforced** -- HiveMQ Cloud doesn't support webhook auth, shared creds only | Security gap | **FIXED** (shared admin/Admin123 for now) | Migrate to EMQX Cloud at 10+ devices |
| 5.4 | **Backend + Firmware Relay Conflict** -- Both evaluate thresholds, causing relay chatter | Relay damage | **FIXED** (v4.0.0) | checkForRelay() disabled in MQTT mode |

### Tier 2: WILL Cause Problems Under Load (Fix Before Scaling)

| # | Issue | Impact | Status | Fix |
|---|-------|--------|--------|-----|
| 5.5 | **String Heap Fragmentation** -- String += concatenation fragments heap over 24-72 hours | Crash after days | **FIXED** (v4.0.0) | ArduinoJson serialization |
| 5.6 | **WiFi Reconnect Blocks** -- reconnectWiFi() blocks 30s, no sensor reads during | Missed CO2 spikes | **OPEN** | Non-blocking reconnect state machine |
| 5.7 | **No NTP Time Sync** -- Firmware uses millis() only, no real clock | TLS cert issues | **FIXED** (v4.0.0) | configTime() after WiFi |
| 5.8 | **No Watchdog Timer** -- Infinite loops (invalid key, button press) = permanent hang | Unrecoverable device | **OPEN** | Enable ESP32 TWDT |
| 5.9 | **QoS 0 Telemetry** -- Lost MQTT messages = gaps in sensor data | Missing data | **FIXED** (v4.0.0) | QoS 1 for telemetry |
| 5.10 | **Neon Cold Start** -- Free tier auto-suspends after 5min, first query takes 500ms-2s | Lost readings | **OPEN** | Add retry in _handle_telemetry() or upgrade Neon |
| 5.11 | **Upstash Redis Limits** -- Free tier: 10K cmds/day, using ~23K/day with 2 devices | Redis throttled | **OPEN** | Upgrade to Pay-as-you-go ($0.2/100K cmds) |
| 5.16 | **Cookie secure=False** -- Auth cookies sent over HTTP and HTTPS | Security weakness | **OPEN** | Set secure=True in production |
| 5.19 | **No Login Rate Limiting** -- Rate limiter removed (was Redis-dependent) | Brute force risk | **OPEN** | In-memory limiter or edge rate limiting |

### Tier 3: Good to Know (Fix Eventually)

| # | Issue | Impact | Status | Fix |
|---|-------|--------|--------|-----|
| 5.12 | **OTA No Resume** -- Interrupted download restarts from 0% | Slow OTA on weak WiFi | **DEFERRED** | Accept limitation (not practical on ESP32) |
| 5.13 | **EEPROM Password Plaintext** -- MQTT password in plaintext EEPROM | Physical access risk | **DEFERRED** | ESP32 flash encryption (4 hours effort) |
| 5.14 | **No Rollback Notification** -- Backend doesn't know if OTA rollback happened | Version mismatch | **DEFERRED** | Version check in telemetry |
| 5.15 | **HiveMQ Free Tier Limits** -- 100 simultaneous connections, 10GB/month | Max ~98 devices | **DEFERRED** | Monitor, upgrade when needed |
| 5.17 | **Encryption Key Placeholder** -- DEVICE_ENCRYPTION_KEY was placeholder | Insecure DB | **FIXED** | Generated proper Fernet key (30hj2kkE48...) |
| 5.18 | **CORS Missing Dashboard** -- dashboard.mushroomkimandi.com was missing | API blocked | **FIXED** | Added to CORS_ORIGINS |
| 5.20 | **Hardcoded WiFi Creds** -- eepromConfig.ino had Jas_Mehar/airtel2730 | Personal WiFi leaked | **FIXED** (v4.0.0) | Removed, force captive portal |

### Summary

| Tier | Total | Fixed | Open | Deferred |
|------|-------|-------|------|----------|
| Tier 1 (Critical) | 4 | 4 | 0 | 0 |
| Tier 2 (Scaling) | 9 | 3 | 6 | 0 |
| Tier 3 (Eventually) | 7 | 3 | 0 | 4 |
| **Total** | **20** | **10** | **6** | **4** |

---

## 14. Success Metrics & Timeline

### 22-Month Development Roadmap

| Phase | Duration | Deliverable | Milestone |
|-------|----------|-------------|-----------|
| Phase 1: Core IoT Monitoring | Months 1-7.5 | Full monitoring + alerting + relay control + ESP32 firmware + React dashboard | 1 pilot farm live by Month 4 |
| Phase 2: HVAC Automation + Mobile | Months 8-15 | RPi gateway, offline buffering, MQTT protocol, PWA mobile, push notifications, SMS alerts | 5 beta farms live by Month 11 |
| Phase 3: ERP Modules | Months 16-22 | Inventory, production tracking, batch management, AI/ML yield predictions, billing | 20 paying farms by Month 22 |

### Platform KPIs (Year 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Farms Onboarded | 50 | Subscription database |
| Platform Uptime | 99.5% | Monitoring |
| API Latency (p95) | <500ms | Monitoring |
| WebSocket Latency | <1s | Monitoring |
| Monthly Recurring Revenue | 7.5L | Revenue dashboard |
| Customer Acquisition Cost | <15K per farm | Marketing spend / farms |
| Daily Active User Rate | 60% | Analytics |
| Churn Rate | <12% annually | Subscription cancellations |
| Customer NPS | >40 | Quarterly surveys |

### Farm-Level ROI Validation

| Metric | Before | After | Timeline |
|--------|--------|-------|----------|
| Contamination Loss | 12-18% | <7% | Within 6 months |
| Deviation Detection Time | 4 hours | <15 minutes | Immediate |
| Manual Data Entry | 2-3 hours/day | <30 min/day | Within 1 month |
| Inventory Accuracy | 80-85% | >95% | Phase 3 |
| Net Annual Savings | - | 2-3L per farm | Year 1 |

### Infrastructure Cost Estimates

**Current (0-10 devices):**

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway (Backend) | Starter | $5-25 (INR 400-2,100) |
| Neon PostgreSQL | Free tier | $0 |
| Upstash Redis | Free -> Pay-as-you-go | $0-5 (INR 0-400) |
| HiveMQ Cloud | Free (Serverless) | $0 |
| Vercel (Frontend) | Free | $0 |
| **Total** | | **$5-30/month (INR 400-2,500)** |

**Phase 2 (10-100 farms):**

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway (Backend) | Standard | $25-85 (INR 2,100-7,200) |
| Neon PostgreSQL | Launch | $20-50 (INR 1,700-4,200) |
| Upstash Redis | Pay-as-you-go | $5-20 (INR 400-1,700) |
| EMQX Cloud (MQTT) | Serverless | $15-40 (INR 1,250-3,400) |
| Vercel (Frontend) | Pro | $20 (INR 1,700) |
| **Total** | | **$85-215/month (INR 7,150-18,200)** |

**Phase 3+ (100-500 farms):** Evaluate dedicated infrastructure (AWS/GCP/Hetzner) if Render latency > 500ms p95 or >= 500 concurrent WebSocket connections.

### Long-Term Vision (Year 3-5)

- 500+ farms across India (5% market penetration)
- 2Cr+ MRR from platform + marketplace ecosystem
- Industry impact: Reduce national contamination losses by 30% (150Cr+ saved annually)
- Data network effect: 10,000+ cultivation cycles documented, AI insights improving yields by 25%

### Hardware Cost Per Farm

| Configuration | Per Room (INR) | 8-Room System (INR) | ROI Payback |
|---------------|--------------|-------------------|-------------|
| Budget | 6,410 | 64,880 | 12-18 months |
| Standard | 6,960 | 69,280 | 12-18 months |
| Premium | 7,930 | 93,720 | 18-24 months |

One prevented crop loss (INR 50,000-1,00,000) pays for the entire system.

---

*This document consolidates: MUSHROOM_FARM_BLUEPRINT.md, System_Integration_Document.md, MUSHROOM_FARM_HARDWARE_MATRIX_FINAL.md, COMPLETE_IMPLEMENTATION_PLAN.md, DEVICE_REGISTRATION_FLOW_V2.md, and FIRMWARE_UPDATE_MASTER_PLAN.md. All prior documents are superseded by this version for authoritative reference.*
