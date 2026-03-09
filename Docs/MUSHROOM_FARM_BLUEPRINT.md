# MUSHROOM FARM IoT & ERP PLATFORM — MASTER BLUEPRINT

> **Project Type:** Multi-Tenant SaaS | Agricultural IoT | ERP System
> **Business Model:** Platform-as-a-Service with Flexible Pricing
> **Target Market:** Commercial Mushroom Farms (India & Global)
> **Blueprint Version:** 2.0 (Consolidated — Single Source of Truth)
> **Date:** March 2026
> **Status:** Pre-development (Docs finalized, rewriting from scratch)

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Market Analysis](#2-problem-statement--market-analysis)
3. [System Architecture](#3-system-architecture)
4. [ESP32 Firmware Specification](#4-esp32-firmware-specification)
5. [Database Architecture](#5-database-architecture)
6. [Technology Justification](#6-technology-justification)
7. [Development Phases](#7-development-phases)
8. [Infrastructure & Costs](#8-infrastructure--costs)
9. [Security Architecture](#9-security-architecture)
10. [Success Metrics](#10-success-metrics)

---

## 1. EXECUTIVE SUMMARY

### Vision Statement

Build India's first comprehensive IoT + ERP platform for commercial mushroom farming that:
- **Reduces contamination losses** from 12-18% to <7% through real-time monitoring
- **Saves 4-6 lakhs annually** per 100-room farm through automated efficiency
- **Scales from 2 rooms to 500+ rooms** with consistent architecture
- **Operates reliably offline** for weeks via edge computing (Phase 2)
- **Enables data-driven decisions** through analytics and industry benchmarking

### Market Opportunity

- **Indian mushroom market:** Growing 12% CAGR, 2,500+ Cr industry
- **Target customers:** 1,000+ commercial farms (10+ rooms each)
- **Pain points:** Manual monitoring, 15-20% crop losses, no standardization
- **Competition:** Zero India-focused mushroom IoT platforms exist
- **Addressable market:** 200-300 Cr opportunity (farms spending 20-30L annually on inefficiencies)

### Business Model

**SaaS Subscription Tiers:**
- **Basic:** 2,000/room/month (monitoring only)
- **Pro:** 4,000/room/month (monitoring + automation + inventory)
- **Enterprise:** 3,000/room/month at scale (full ERP + AI)

**Revenue Projections:**
- Year 1: 27 farms, 1.16 Cr ARR
- Year 2: 152 farms, 9.12 Cr ARR
- Year 3: 412 farms, 24.7 Cr ARR

**Unit Economics:**
- Gross margin: 78-95% (depending on tier)
- Break-even: 16 farms (Month 9)
- Payback period: 18 months (including dev costs)

### Technology Stack (Final — No Ambiguity)

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend** | FastAPI (Python) | Auto-generates OpenAPI/Swagger, Pydantic validation |
| **Database** | PostgreSQL | Row-Level Security for multi-tenancy |
| **Cache** | Redis | Live sensor data cache, relay command queue |
| **Frontend** | React 18 + TypeScript + TailwindCSS | shadcn/ui components, Progressive Web App |
| **Real-time** | WebSocket | Dashboard receives push updates from backend |
| **Edge Device** | ESP32 (Arduino C++) | HTTP POST every 30 sec (target), currently 5 min |
| **ORM** | SQLAlchemy + Alembic | Models and migrations |
| **Infra (Phase 1-2)** | Render (Web Service + Managed DB) | PostgreSQL, Redis, Static Site |
| **Infra (Phase 3+)** | Render (Standard/Pro plans) | Auto-scaling, zero-downtime deploys |

### Development Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1: Core IoT Monitoring | Months 1-7.5 | Sensor dashboard, alerts, relay control, ESP32 firmware, simulator |
| Phase 2: HVAC Automation + Mobile | Months 8-15 | Raspberry Pi gateway, advanced automation, PWA mobile |
| Phase 3: ERP Modules | Months 16-22 | Inventory, production tracking, batch management, analytics |

**Total Timeline:** 22 months (includes 25% buffer per phase for field debugging)

### Total Investment

| Category | Amount |
|----------|--------|
| Development (4 devs x 22 months) | 1.44-1.79 Cr |
| Infrastructure (22 months, Render) | 1.5-2.5L |
| Contingency (20%) | 30-36L |
| **Total** | **1.76-2.18 Cr** |
| **Recommended Funding** | **2.50 Cr** (includes safety margin) |

### Success Metrics (Year 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Farms Onboarded | 50 | Subscription database |
| Platform Uptime | 99.5% | Monitoring |
| Contamination Reduction | 12% to <7% | Batch tracking data |
| Customer NPS | >40 | Quarterly surveys |
| Churn Rate | <12% annually | Subscription cancellations |
| MRR | 7.5L | Revenue dashboard |

---

## 2. PROBLEM STATEMENT & MARKET ANALYSIS

### Current State: Inefficiency Crisis in Indian Mushroom Farming

**Quantified Pain Points:**

1. **Environmental Monitoring Gaps (73% of farms affected)**
   - Manual temperature/humidity checks 3-4 times daily
   - 4-hour average delay in detecting parameter deviations
   - Impact: 12-18% crop loss, 8K-12K loss per 100-bag batch

2. **Contamination Crisis (40-60% batch infection rate)**
   - Trichoderma detection happens 7-10 days after infection starts
   - No systematic data collection on contamination patterns
   - Economic Impact: 1.2L-1.8L annual loss (10-room farm)

3. **Operational Chaos (100% of multi-room farms)**
   - Production data in paper logs or Excel
   - 2-3 hours daily wasted on manual data entry
   - 15-20% inventory discrepancy rate
   - Cost: 15K monthly labor + 25K-40K inventory shrinkage

4. **Scalability Bottleneck**
   - Farms cannot effectively manage beyond 20 rooms manually
   - Multi-location management is chaotic
   - Result: Growth-oriented farms hit ceiling at 2-3 Cr revenue

**Total Addressable Problem:** A 100-room commercial farm loses 4-6 lakhs annually due to these inefficiencies.

### Target Customer Profile

**Primary: Commercial Mushroom Farm Owners**

**Persona: Rajesh Kumar**
- Age: 42, Location: Ludhiana, Punjab
- Farm Size: 25 growing rooms, 500 bags/room
- Mushroom Type: Button mushrooms (Agaricus bisporus)
- Monthly Revenue: 4-5 lakhs
- Current Tech: Excel, WhatsApp, manual thermometers
- Pain Points:
  - Spends 4-5 hours daily monitoring personally
  - Lost 80K last month to contamination (3 rooms)
  - Cannot hire trustworthy manager
  - Wants to expand to 50 rooms but fears losing control
- **Willingness to Pay:** 2K-5K per room/month if proven ROI

### Market Segmentation

| Segment | Farm Size | Count (India) | ARPU (Annual) | TAM |
|---------|-----------|---------------|---------------|-----|
| Small | 2-10 rooms | ~500 farms | 2.4L | 120 Cr |
| Medium | 10-30 rooms | ~400 farms | 12L | 480 Cr |
| Large | 30+ rooms | ~100 farms | 36L | 360 Cr |
| **Total** | | **1,000 farms** | | **960 Cr** |

**Addressable Market (Phase 1-3):** 20-30% of TAM = 200-300 Cr

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

## 3. SYSTEM ARCHITECTURE

### High-Level Architecture

```
+-----------------------------------------------------------+
| EDGE LAYER (On-Farm)                                       |
|                                                            |
| Phase 1: ESP32 Direct-to-Cloud                             |
| - Sensors: SCD4x (CO2), DHT11 (outdoor), DS18B20 x10     |
| - 3-Channel Relay (CO2, Humidity, Temperature)             |
| - LCD 20x4 + Joystick menu                                |
| - HTTP POST to cloud every 30 sec (target, currently 5min)|
|                                                            |
| Phase 2: Raspberry Pi Gateway (added for >10 farms)       |
| - Docker: PostgreSQL + Redis + MQTT Broker                 |
| - Offline buffering (weeks of storage)                     |
| - Local analytics                                          |
+-----------------------------------------------------------+
                          |
                  WiFi / Cellular (4G)
                  HTTP REST + JSON
                          |
                          v
+-----------------------------------------------------------+
| CLOUD LAYER                                                |
|                                                            |
| Phase 1-2 (0-100 farms): Render Platform                   |
| - FastAPI Backend (Web Service)                            |
| - PostgreSQL (Render Managed, Single DB + RLS)             |
| - Redis (Render Managed, live sensor cache)                |
| - Static Site (React frontend, free tier)                  |
| - Render Disk (photos, archives) + Cloudflare R2 (backups)|
|                                                            |
| Phase 3+ (100+ farms): Render Standard/Pro Plans           |
| - Same stack, auto-scaled via Render                       |
+-----------------------------------------------------------+
                          |
                  WebSocket + REST API
                          |
                          v
+-----------------------------------------------------------+
| CLIENT LAYER                                               |
|                                                            |
| React 18 + TypeScript + TailwindCSS (Port 3000)           |
| - Dashboard (real-time via WebSocket)                      |
| - Alerts (WebSocket push + optional SMS)                   |
| - CRUD: Plants, Rooms, Devices, Users, Thresholds         |
| - Reports & Historical Charts                              |
| - Progressive Web App (installable, offline-capable)       |
+-----------------------------------------------------------+
```

### Data Flow Overview

```
ESP32 Device                    Cloud Backend                    Dashboard
+-----------+     HTTP POST     +----------------+   WebSocket   +----------+
| Read      |  every 30s/5min  | FastAPI        |   push        | React    |
| sensors   | --------------->  | 1. Validate    | ------------> | Live     |
| CO2,Temp  |   X-Device-ID    |    device key  |  sensor_update| readings |
| Humidity  |   X-Device-Key   | 2. Write Redis |               |          |
| BagTemps  |                  |    (live cache)|               |          |
+-----------+                  | 3. Write PgSQL |               |          |
                               |    (history)   |               |          |
ESP32 Device     HTTP GET      | 4. Check       |   WebSocket   | React    |
+-----------+   every 30s     |    thresholds  |   push        | Alert    |
| Poll for  | <-------------- | 5. Create alert| ------------> | toast    |
| relay     |  relay commands |    if exceeded |  alert_created|          |
| commands  |                  | 6. Push via WS |               |          |
+-----------+                  +----------------+               +----------+
```

### WebSocket Architecture

The dashboard connects to the backend via WebSocket for real-time updates. The ESP32 does NOT use WebSocket — it uses HTTP polling.

**WebSocket Events (Backend -> Frontend):**

| Event | Trigger | Payload |
|-------|---------|---------|
| `sensor_update` | New reading from ESP32 | `{device_id, room_id, co2_ppm, room_temp, room_humidity, bag_temps[], timestamp}` |
| `relay_state_change` | Relay toggled (manual or auto) | `{device_id, relay_type, state, trigger_type, triggered_by}` |
| `alert_created` | Threshold violation detected | `{alert_id, device_id, room_id, alert_type, severity, message, value, threshold}` |
| `alert_acknowledged` | User acknowledges alert | `{alert_id, acknowledged_by, acknowledged_at}` |
| `device_status_change` | Device online/offline | `{device_id, is_online, last_seen}` |

**WebSocket Connection:**
```
ws://api.domain.com/ws?token={jwt_token}
```
The backend authenticates the WebSocket connection using the JWT token and only sends events for the user's owner_id (tenant isolation).

---

## 4. ESP32 FIRMWARE SPECIFICATION

### Overview

| Aspect | Value |
|--------|-------|
| **Platform** | ESP32 (ESP32DA) |
| **Framework** | Arduino (C/C++) |
| **Firmware Size** | 965 KB |
| **Architecture** | Polling-based |
| **Data Sync** | Currently every 5 minutes via HTTP POST (target: 30 seconds) |
| **Protocol** | HTTP REST + JSON |
| **Device Auth** | 12-character secret key (`X-Device-Key` header) |
| **Status** | Production — running in real farm (Uttarakhand) |

> **Migration Note:** The current production firmware syncs every 5 minutes. The target architecture calls for 30-second sync intervals to enable near-real-time dashboard updates via WebSocket. A firmware update will reduce the sync interval from 5 minutes to 30 seconds. Until the firmware is updated, the dashboard will show data that is up to 5 minutes old.

### Hardware Components (Bill of Materials)

| Component | Model | Interface | Purpose | Qty |
|-----------|-------|-----------|---------|-----|
| Microcontroller | ESP32 (ESP32DA) | - | Main processing unit | 1 |
| CO2 Sensor | SCD4x (Sensirion) | I2C | CO2 + Room Temp + Room Humidity | 1 |
| Outdoor Sensor | DHT11 | Digital GPIO | Outdoor temperature & humidity | 1 |
| Temperature Array | DS18B20 | OneWire | Individual bag temperature monitoring | 10 |
| Display | LCD 20x4 | I2C (0x27) | Local display and menu | 1 |
| Relay Module | 3-Channel | GPIO | CO2, Humidity, Temperature control | 1 |
| Input Device | Analog Joystick | ADC + GPIO | Menu navigation | 1 |
| Enclosure | Custom | - | 3D Printed housing | 1 |

### Pin Configuration

| GPIO | Function | Component |
|------|----------|-----------|
| 21, 22 | I2C (SDA, SCL) | SCD4x, LCD |
| 4 | Digital Output | Temperature/AC Relay |
| 16 | Digital Output | CO2 Relay |
| 23 | Digital Output | Humidity Relay |
| 26 | Interrupt | Joystick Button |
| 32, 33 | ADC | Joystick X, Y |
| 0, 17 | OneWire | DS18B20 Bus 1, Bus 2 |
| 5 | Digital Input | DHT11 Outdoor Sensor |

### Software Architecture

**Modular File Structure:**
```
pcb_code/
+-- src/main/
|   +-- main.ino                    # Main program entry and loop
|   +-- configuration.h             # Global config, pins, constants
|   +-- CO2Sensor.ino              # SCD4x sensor driver
|   +-- dhtSensor.ino              # DHT11 sensor driver
|   +-- bagSensor.ino              # DS18B20 array management
|   +-- relayControl.ino           # Automated control logic
|   +-- sendingJsonRequest.ino     # HTTP API communication
|   +-- menuControl.ino            # UI menu system
|   +-- joyStick.ino               # Input handling
|   +-- initWifi.ino               # Network setup + captive portal
|   +-- initializeDevices.ino      # Hardware initialization
|   +-- eepromConfig.ino           # Persistent storage
|   +-- getKey.ino                 # Device key input
|   +-- welcomeScreen.ino          # Boot display
+-- libraries/                      # Custom libraries
+-- bin/                           # Compiled binaries
+-- main.ino.esp32da.bin          # Production firmware (965KB)
```

### Boot Sequence

```
POWER ON
    |
    v
1. welcomeScreen.ino     -> Display logo & version
    |
    v
2. initializeDevices.ino -> Init I2C, LCD, Sensors, Relays, Joystick
    |
    v
3. eepromConfig.ino      -> Load saved thresholds & device key
    |
    v
4. initWifi.ino          -> Connect to WiFi (captive portal if needed)
                            Start OTA server
    |
    v
5. MAIN LOOP (Forever)
   - Read all sensors (SCD4x, DHT11, DS18B20 array)
   - Apply calibration offsets
   - Check thresholds -> control relays (local automation)
   - Update LCD display
   - Handle joystick menu input
   - Every 30s (target) / 5min (current): HTTP POST to cloud
   - Poll for relay commands from cloud
```

### Sensor Data Flow (Device to Cloud)

**Step 1: Sensor Reading**
- SCD4x via I2C -> CO2 (ppm), Room Temp (C), Room Humidity (%)
- DHT11 via GPIO -> Outdoor Temp (C), Outdoor Humidity (%), Heat Index
- DS18B20 via OneWire -> Bag Temp 1-10 (C)

**Step 2: Local Processing**
- Apply calibration offsets
- Calculate heat index
- Check thresholds for automated relay control (on-device, no cloud needed)
- Update LCD display in real-time

**Step 3: JSON Serialization & HTTP POST (every 30s target / 5min current)**
```
POST /api/v1/device/readings
Headers:
  X-Device-ID: 5
  X-Device-Key: A3F7K9M2P5X8
  Content-Type: application/json

Body:
{
  "co2_ppm": 1250,
  "room_temp": 18.5,
  "room_humidity": 85.2,
  "bag_temps": [16.2, 16.5, 16.1, 16.8, 16.3, 16.7, 16.4, 16.6, 16.2, 16.5],
  "outdoor_temp": 22.3,
  "outdoor_humidity": 65.0,
  "relay_states": {
    "co2": true,
    "humidity": false,
    "temperature": true
  }
}

Response (200 OK):
{
  "status": "success",
  "reading_id": 12345,
  "timestamp": "2026-03-08T10:30:00Z"
}
```

**Step 4: Poll for Relay Commands**
```
GET /api/v1/device/5/commands
Headers:
  X-Device-Key: A3F7K9M2P5X8

Response (200 OK — commands pending):
{
  "commands": [
    {"relay_type": "co2", "state": true, "triggered_by": "user:3"}
  ]
}

Response (200 OK — no commands):
{
  "commands": []
}
```

### Local Automation Logic (Relay Control)

The ESP32 runs threshold-based relay control locally — no cloud dependency required.

**Default Thresholds:**

| Parameter | Relay ON Condition | Relay OFF Condition | Hysteresis |
|-----------|-------------------|---------------------|------------|
| CO2 | < 1200 ppm | > 1300 ppm | 100 ppm |
| Humidity | >= 90% | < 87.5% | 2.5% |
| Temperature | <= 16 C | > 17 C | 1 C |

**Hysteresis prevents relay chattering:** The relay does not toggle back until the reading crosses the threshold plus hysteresis band.

Thresholds are configurable via:
1. LCD menu (joystick) — stored in EEPROM
2. Cloud dashboard — pushed to device on next poll

### EEPROM Memory Map (32 Bytes)

| Address | Size | Data |
|---------|------|------|
| 0 | 1 byte | CO2 relay status |
| 1 | 1 byte | Humidity relay status |
| 2 | 1 byte | AC relay status |
| 3-4 | 2 bytes | CO2 threshold |
| 5-8 | 4 bytes | Temperature threshold |
| 9-12 | 4 bytes | Humidity threshold |
| 13 | 1 byte | Device key init flag |
| 14-29 | 16 bytes | Device authentication key |

### Device Registration Flow

1. ESP32 boots for the first time (no key in EEPROM)
2. User enters the 12-character secret key via joystick virtual keyboard on LCD
3. ESP32 stores key in EEPROM
4. ESP32 sends `POST /api/v1/device/register` with MAC address + firmware version
5. Backend validates key, links device to owner, returns device_id
6. All subsequent requests use `X-Device-ID` + `X-Device-Key` headers

**Secret Key Format:** `XXXX-XXXX-XXXX` (12 alphanumeric characters, e.g. `A3F7-K9M2-P5X8`)
Keys are pre-generated by the backend and given to the farm owner during device purchase.

### Features Implemented (Production)

| Category | Feature | Status |
|----------|---------|--------|
| Hardware | ESP32 Dual-core processing | Implemented |
| Hardware | SCD4x CO2 (NDIR, 400-5000 ppm) | Implemented |
| Hardware | DHT11 outdoor temp/humidity | Implemented |
| Hardware | DS18B20 array (up to 10 sensors) | Implemented |
| Hardware | LCD 20x4 real-time display | Implemented |
| Hardware | 3-Channel relay with hysteresis | Implemented |
| Hardware | Joystick menu navigation | Implemented |
| Hardware | 3D printed enclosure | Implemented |
| Software | Modular file architecture | Implemented |
| Software | EEPROM config persistence | Implemented |
| Software | Virtual keyboard (joystick) | Implemented |
| Software | 6-option configuration menu | Implemented |
| Software | OTA firmware updates | Implemented |
| Software | WiFi auto-reconnect | Implemented |
| Software | Captive portal (WiFi setup) | Implemented |
| Communication | WiFi 802.11 b/g/n | Implemented |
| Communication | HTTP REST + JSON | Implemented |
| Communication | Device key authentication | Implemented |
| Communication | 5-minute cloud sync | Implemented |

### Features NOT Yet Implemented (Planned)

| Feature | Priority | Target Phase |
|---------|----------|--------------|
| 30-second sync interval | High | Phase 1 (firmware update) |
| HTTPS (TLS encryption) | Critical | Phase 1 |
| Offline data buffering (queue if WiFi lost) | High | Phase 2 |
| MQTT protocol (via RPi gateway) | Medium | Phase 2 |
| Remote relay control from dashboard | High | Phase 1 (cloud-side ready, firmware poll needed) |
| Push notifications | High | Phase 1 |
| Watchdog timer | Medium | Phase 2 |
| FreeRTOS migration | Low | Phase 2 |

### Performance Metrics (Measured in Production)

| Metric | Value |
|--------|-------|
| System Uptime | 99%+ |
| Sensor Read Latency | < 100 ms |
| JSON Serialization | < 50 ms |
| HTTP POST Latency | 500-2000 ms |
| Menu Response Time | 200 ms |
| LCD Update Rate | Real-time |
| Max Bag Sensors Tested | 10+ |
| WiFi Reconnect Timeout | 60 seconds |

### Known Limitations

1. **Not real-time from device to cloud** — Data syncs every 5 min (target 30s). Dashboard gets data only when ESP32 posts.
2. **No bidirectional control yet** — Relay control is local-only (LCD + joystick). Cloud relay commands require polling (being added).
3. **No offline buffering** — If WiFi is lost, sensor data for that interval is lost. No local queue.
4. **HTTP only (no HTTPS)** — Data is transmitted unencrypted. HTTPS to be added in Phase 1.
5. **Single device per room** — No multi-device aggregation per room yet.
6. **No IP filtering** — Any device with a valid key can post data from any IP.

---

## 5. DATABASE ARCHITECTURE

### Multi-Tenancy Strategy: PostgreSQL Row-Level Security

All tenants share a single PostgreSQL database. Tenant isolation is enforced via PostgreSQL Row-Level Security (RLS) using `owner_id`.

```
-- Enable RLS on tables
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their owner's data
CREATE POLICY tenant_isolation ON plants
    FOR ALL
    USING (owner_id = current_setting('app.current_owner_id')::INT);

-- Application sets owner_id per request (from JWT token)
SET app.current_owner_id = 42;
```

**Advantages:**
- Simple to implement (2-3 days vs 2-3 weeks for schema-per-tenant)
- Easy backups (single database dump)
- Works well for 100-500 farms
- Migration path to schema-per-tenant exists if needed

**Migration Decision Point (Month 10):**
Migrate to schema-per-tenant ONLY IF:
- Enterprise customers demand physical data isolation (compliance)
- Performance degrades (query latency >500ms p95)
- Backup/restore becomes too slow (>30 min)
Otherwise: Continue with RLS (proven to work for 1000+ tenants).

### Core Tables (11)

| # | Table | Purpose | Est. Records |
|---|-------|---------|--------------|
| 1 | owners | Company/owner data | 10-100 |
| 2 | users | System users with roles | 50-1000 |
| 3 | plants | Farm locations | 10-500 |
| 4 | rooms | Growing rooms | 100-5000 |
| 5 | devices | IoT devices (ESP32) | 100-10000 |
| 6 | thresholds | Control thresholds per room | 1000-50000 |
| 7 | room_readings | Sensor data (time-series) | Millions |
| 8 | relay_status | Relay state change history | Millions |
| 9 | alerts | Threshold violation alerts | 10K-500K |
| 10 | reports | Generated report metadata | 1K-50K |
| 11 | audit_log | User action audit trail | Millions |

**Data Hierarchy:**
```
OWNER (Company)
  +-- USERS (Admin, Manager, Operator, Viewer)
  +-- PLANTS (Farm locations)
       +-- ROOMS (Growing rooms)
            +-- THRESHOLDS (1 set per room)
            +-- DEVICES (ESP32 controllers)
                 +-- ROOM_READINGS (sensor data)
                 +-- RELAY_STATUS (relay history)
                 +-- ALERTS (threshold violations)
```

**Key Columns Added from ESP32 Spec (beyond basic System Integration schema):**
- `owners`: pincode, gst_number
- `plants`: plant_type (OYSTER/BUTTON/SHIITAKE/MIXED)
- `users`: login_attempts, locked_until, assigned_plants (JSON)
- `rooms`: room_code, no_of_racks, no_of_bags, bags_per_rack, floor_number
- `devices`: hardware_version, device_type, registered_at
- `room_readings`: outdoor_temp, outdoor_humidity columns (not a separate table)

**User Roles:**

| Role | Permissions |
|------|-------------|
| SUPER_ADMIN | Full system access, manage all owners |
| ADMIN | Full access to owner's plants |
| MANAGER | Manage assigned plants, view reports |
| OPERATOR | View data, acknowledge alerts |
| VIEWER | View-only access |

The full SQLAlchemy model definitions are in the System Integration Document.

---

## 6. TECHNOLOGY JUSTIFICATION

### Backend: FastAPI (Python)

**Why FastAPI:**
- Auto-generates OpenAPI/Swagger documentation for 50+ endpoints — saves weeks
- Pydantic validation — every request/response is type-checked automatically, critical for IoT data integrity
- Native async support — handles concurrent WebSocket connections and device polling efficiently
- Python is natural for IoT — sensor data processing, alerting logic, analytics
- Large developer pool in India

**Alternatives Considered:**
- Node.js + Express: Stronger WebSocket ecosystem, but weaker data processing libraries. No auto-generated API docs.
- Django: Too heavy for an API-first platform. DRF is slower than FastAPI.
- Flask: No async support, no auto-generated docs.

### Database: PostgreSQL

**Why PostgreSQL:**
- Row-Level Security for multi-tenancy — no application-level filtering bugs
- TimescaleDB extension available for time-series optimization (Phase 2)
- JSONB support for flexible metadata
- Mature partitioning for sensor data tables
- Battle-tested at scale (Instagram, Discord run on PostgreSQL)

**Performance Estimates:**
- 1.2M sensor readings/day per farm (at 30-sec intervals) -> 60MB/month compressed
- 500 farms = 30GB/month (manageable on Render Standard PostgreSQL)
- Breaking point: 500+ farms -> add read replicas or shard by region

### Cache: Redis

**Why Redis:**
- Sub-millisecond reads for live sensor data (dashboard needs instant access)
- TTL-based expiry — stale data auto-cleans (60s TTL for sensor data)
- Pub/Sub capability for WebSocket fan-out (future optimization)
- Command queue for relay controls (30s TTL)

**Redis is NOT used for:**
- Session storage (JWTs are stateless)
- Persistent data (all data lives in PostgreSQL)

### Frontend: React 18 + TypeScript + TailwindCSS

**Why:**
- Component reusability across dashboard, management, and reporting pages
- TypeScript safety — catches bugs at compile time
- TailwindCSS speed — rapid UI development
- shadcn/ui — pre-built, customizable components
- PWA support — installable on mobile, works offline (cache-first)
- WebSocket integration — native browser API, no extra libraries needed

**Performance Targets:**
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Lighthouse Score: >90

---

## 7. DEVELOPMENT PHASES

Three flat phases. No sub-phases. No phases inside phases.

### Phase 1: Core IoT Monitoring (Months 1-7.5)

**Goal:** One pilot farm live by Month 4. Full monitoring + alerting + relay control.

**Deliverables:**
- FastAPI backend with all CRUD endpoints (users, owners, plants, rooms, devices, thresholds)
- PostgreSQL database with 11 core tables + RLS multi-tenancy
- Redis integration for live sensor cache
- WebSocket server for real-time dashboard updates
- React dashboard: live readings, historical charts, alert management
- React management pages: CRUD for plants, rooms, devices, users, thresholds
- Device API endpoints (readings, heartbeat, commands, register)
- ESP32 firmware update: 30-second sync interval + relay command polling
- HTTPS (TLS) for all API communication
- Demo simulator (Python script that mimics ESP32 for development without hardware)
- Relay toggle from dashboard (user clicks -> Redis command -> ESP32 polls -> relay changes)
- Alert system: threshold violation -> alert created -> WebSocket push -> user acknowledges
- Report generation (daily/weekly/monthly PDF/CSV)
- JWT authentication for web users
- Device authentication via secret_key + device_id headers

**Milestone:** 1 pilot farm live with real ESP32 devices by Month 4

**Timeline Buffer:** +1.5 months (25% for sensor calibration, field debugging)

### Phase 2: HVAC Automation + Mobile (Months 8-15)

**Goal:** 5 beta farms live by Month 11. Advanced automation and mobile experience.

**Deliverables:**
- Raspberry Pi Gateway: Docker Compose (PostgreSQL + Redis + MQTT Broker)
- Offline data buffering on RPi (weeks of storage, sync when online)
- MQTT protocol between ESP32 and RPi gateway (replaces direct HTTP to cloud)
- Advanced automation rules (schedules, time-based control, multi-sensor logic)
- PWA mobile optimization (native-like experience on Android/iOS)
- Push notifications (FCM for alerts)
- SMS alerts for critical events (Twilio/MSG91)
- TimescaleDB for time-series optimization
- User activity audit log (who changed what, when)
- Data export (CSV, Excel)
- Multi-device aggregation per room

**Milestone:** 5 beta farms live by Month 11

**Timeline Buffer:** +1 month (hardware integration always surprises)

### Phase 3: ERP Modules (Months 16-22)

**Goal:** 20 paying farms by Month 22. Full ERP platform.

**Deliverables:**
- Batch/production tracking (spawn run -> fruiting -> harvest lifecycle)
- Inventory management (substrate, spawn, packaging, chemicals)
- Harvest recording and yield analytics
- Contamination incident tracking and pattern analysis
- Cost analysis and profitability per room/batch
- Industry benchmarking (anonymous cross-farm comparisons)
- AI/ML yield predictions (based on historical environmental data)
- Billing and subscription management
- Render Standard/Pro plan upgrade (auto-scaling, zero-downtime deploys)
- Evaluate dedicated infrastructure (only if >= 500 concurrent users or compliance requires it)

**Milestone:** 20 paying farms by Month 22

**Timeline Buffer:** +1 month (user acceptance, feedback loops)

---

## 8. INFRASTRUCTURE & COSTS

### Phase 1-2 (Months 1-12, 0-100 farms)

| Service | Render Plan | Monthly Cost |
|---------|-------------|-------------|
| Web Service (FastAPI) | Starter ($7) → Standard ($25) | $7-25 (₹600-2,100) |
| PostgreSQL | Starter (1GB) → Standard (10GB) | $7-20 (₹600-1,700) |
| Redis | Starter (25MB) → Standard (100MB) | $10-20 (₹850-1,700) |
| Static Site (React) | Free | $0 |
| Render Disk (photos) | 1GB included → 10GB ($1/GB) | $0-10 (₹0-850) |
| **Total** | | **$24-75/month (₹2,000-6,300)** |

> **Note:** Render Free tier available for development: Free Web Service (spins down after 15 min inactivity), Free PostgreSQL (256MB, 90 days). Good for dev/staging, not production.

### Phase 3 (Months 13-18, 100-200 farms)

| Service | Render Plan | Monthly Cost |
|---------|-------------|-------------|
| Web Service (FastAPI) | Standard ($25) → Pro ($85) | $25-85 (₹2,100-7,200) |
| PostgreSQL | Standard (10GB) → Pro (50GB) | $20-50 (₹1,700-4,200) |
| Redis | Standard (100MB) → Pro (500MB) | $20-40 (₹1,700-3,400) |
| Static Site (React) | Free | $0 |
| Cloudflare R2 (backups) | 10GB free + $0.015/GB | $0-5 (₹0-400) |
| **Total** | | **$65-180/month (₹5,500-15,200)** |

### Phase 4 (Month 19+, 200+ farms — Decision Point)

Move to dedicated infrastructure (AWS/GCP/Hetzner) ONLY if:
- Render latency becomes a bottleneck (>500ms p95)
- >= 500 concurrent WebSocket connections
- Compliance requires VPC/private networking
- Cost exceeds equivalent self-managed infrastructure

Estimated cost if migrated: ₹15-25K/month (self-managed) or ₹35-60K/month (AWS managed)

### Hardware Cost Per Farm (ESP32 Kit)

| Component | Cost |
|-----------|------|
| ESP32 module | 600 |
| SCD4x CO2 sensor | 2,500 |
| DHT11 | 250 |
| DS18B20 x10 | 1,500 |
| LCD 20x4 | 400 |
| 3-Channel relay | 300 |
| Joystick | 150 |
| 3D printed enclosure | 500 |
| PCB + wiring | 500 |
| **Total per device** | **~6,700** |
| **Per room (1 device/room)** | **~6,700** |

---

## 9. SECURITY ARCHITECTURE

### Authentication

| Actor | Method | Details |
|-------|--------|---------|
| Web Users | JWT (access + refresh tokens) | Access token: 15 min, Refresh token: 7 days. Stored in httpOnly cookies. |
| ESP32 Devices | Secret Key + Device ID | `X-Device-Key` + `X-Device-ID` headers on every request. Key is 12-char alphanumeric, stored in EEPROM. |
| WebSocket | JWT in query param | `ws://api/ws?token={jwt}`. Validated on connection, rejected if expired. |

### Authorization

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
- WebSocket connections filtered by owner_id — users only receive events for their tenant
- Device readings validated: device must belong to the owner's plant/room hierarchy

### Security Roadmap

| Feature | Phase | Status |
|---------|-------|--------|
| JWT authentication (web) | 1 | To build |
| Secret key auth (device) | 1 | Firmware has it, backend needs validation |
| HTTPS / TLS | 1 | To add (currently HTTP) |
| CORS policy | 1 | To configure |
| Rate limiting (API) | 1 | To add |
| Input validation (Pydantic) | 1 | Built into FastAPI |
| RLS (multi-tenancy) | 1 | To configure |
| Password hashing (bcrypt) | 1 | To build |
| Account lockout (failed logins) | 1 | To build (login_attempts, locked_until) |
| HMAC request signing (device) | 2 | Planned |
| IP allowlisting (device) | 2 | Planned |
| Audit logging | 2 | To build (audit_log table ready) |

---

## 10. SUCCESS METRICS

### Platform-Level (Year 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Farms Onboarded | 50 | Subscription database |
| Platform Uptime | 99.5% | Render Metrics + UptimeRobot |
| API Latency (p95) | <500ms | Monitoring |
| WebSocket Latency | <1s | Monitoring |
| Monthly Recurring Revenue | 7.5L | Revenue dashboard |
| Customer Acquisition Cost | <15K per farm | Marketing spend / farms |
| Daily Active User Rate | 60% | Analytics |
| Churn Rate | <12% annually | Subscription cancellations |

### Farm-Level (ROI Validation)

| Metric | Before | After | Timeline |
|--------|--------|-------|----------|
| Contamination Loss | 12-18% | <7% | Within 6 months |
| Deviation Detection Time | 4 hours | <15 minutes | Immediate |
| Manual Data Entry | 2-3 hours/day | <30 min/day | Within 1 month |
| Inventory Accuracy | 80-85% | >95% | Phase 3 |
| Net Annual Savings | - | 2-3L per farm | Year 1 |

### Long-Term Vision (Year 3-5)

- 500+ farms across India (5% market penetration)
- 2Cr+ MRR from platform + marketplace ecosystem
- Industry impact: Reduce national contamination losses by 30% (150Cr+ saved annually)
- Data network effect: 10,000+ cultivation cycles documented, AI insights improving yields by 25%

---

## DOCUMENT CROSS-REFERENCE

This Blueprint is the master document. For implementation-specific details, refer to:

**System Integration Document** (`SYSTEM_INTEGRATION_DOCUMENT.md`):
- SQLAlchemy model definitions for all 11 tables
- Complete API endpoint list with request/response formats
- Redis key patterns and TTL values
- Data flow diagrams with code examples
- Frontend and backend implementation patterns
- Verification checklist

---

*Document Version: 2.0 | Consolidated from Blueprint v1.2 + ESP32 Firmware Spec v1.2 + System Integration Doc*
*All prior documents are superseded by this version.*
