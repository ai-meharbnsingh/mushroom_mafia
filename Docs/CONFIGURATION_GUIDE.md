# Mushroom Farm IoT — Configuration Guide

**Last Updated:** 2026-03-11

This document provides everything needed to set up, configure, and deploy the Mushroom Farm IoT Monitoring system from scratch. It covers local development, cloud deployment, firmware flashing, testing, and operational troubleshooting.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Variables Reference](#3-environment-variables-reference)
4. [Port Configuration](#4-port-configuration)
5. [Cloud Deployment](#5-cloud-deployment)
6. [CORS Configuration](#6-cors-configuration)
7. [TLS/SSL Configuration](#7-tlsssl-configuration)
8. [Database](#8-database)
9. [MQTT Configuration](#9-mqtt-configuration)
10. [Firmware Flashing](#10-firmware-flashing)
11. [E2E Testing](#11-e2e-testing)
12. [Monitoring & Troubleshooting](#12-monitoring--troubleshooting)
13. [Security Checklist](#13-security-checklist)

---

## 1. Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 20.x | Frontend build and dev server |
| **Python** | 3.11+ | Backend API (FastAPI) |
| **PlatformIO** | Latest (CLI or VS Code extension) | Firmware compilation and flashing |
| **Docker & Docker Compose** | Latest | Local PostgreSQL, Redis, and EMQX services |
| **Git** | Latest | Version control |

### Optional (for cloud deployment)

| Tool | Purpose |
|------|---------|
| **Vercel CLI** | Frontend deployment |
| **Railway CLI** | Backend deployment |
| **GitHub account** | CI/CD integration with Railway and Vercel |

---

## 2. Local Development Setup

### 2.1 Backend

```bash
# 1. Clone the repository
git clone <repo-url>
cd Mushroom_IOT_Monitoring

# 2. Start Docker services (PostgreSQL + Redis + EMQX)
docker compose up -d

# 3. Create Python virtual environment
cd backend
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows

# 4. Install Python dependencies
pip install -r requirements.txt

# 5. Create .env file (copy from example)
cp .env.example .env
# Edit .env as needed — defaults work with docker-compose

# 6. Run database migrations
alembic upgrade head

# 7. Start the backend server
uvicorn app.main:app --host 0.0.0.0 --port 3800 --reload
```

The backend will be available at `http://localhost:3800`. API docs are at `http://localhost:3800/docs`.

**Python dependencies** (from `requirements.txt`):

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.115.0 | Web framework |
| uvicorn[standard] | 0.30.0 | ASGI server |
| sqlalchemy[asyncio] | 2.0.35 | Async ORM |
| asyncpg | 0.30.0 | PostgreSQL async driver |
| alembic | 1.13.0 | Database migrations |
| redis[hiredis] | 5.1.0 | Redis client (live data cache) |
| pydantic | 2.9.0 | Data validation |
| pydantic-settings | 2.5.0 | Environment-based config |
| python-jose[cryptography] | 3.3.0 | JWT token handling |
| passlib[bcrypt] | 1.7.4 | Password hashing |
| python-multipart | 0.0.9 | Form/file upload parsing |
| httpx | 0.27.0 | Async HTTP client |
| aiomqtt | >=2.0.0 | Async MQTT client |
| cryptography | >=42.0.0 | Fernet device password encryption |
| pytest | 8.3.0 | Test framework |
| pytest-asyncio | 0.24.0 | Async test support |
| fastapi-limiter | 0.1.6 | Rate limiting (Redis-backed) |

### 2.2 Frontend

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Create .env (defaults are fine for local dev)
# The file frontend/.env already contains:
#   VITE_API_BASE_URL=http://localhost:3800/api/v1
#   VITE_WS_BASE_URL=ws://localhost:3800/api/v1

# 4. Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:3801`.

**Tech stack:**

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | ~5.9.3 | Type safety |
| Vite | 7.2.4 | Dev server and bundler |
| Tailwind CSS | 3.4.19 | Utility-first CSS |
| shadcn/ui | 40+ components | Component library (Radix-based) |
| Axios | 1.13.6 | HTTP client |
| Recharts | 2.15.4 | Sensor data charts |
| React Router DOM | 7.13.1 | Client-side routing |
| Zod | 4.3.5 | Schema validation |
| React Hook Form | 7.70.0 | Form management |
| Playwright | 1.58.2 | E2E testing |

**Frontend pages:** Dashboard, Plants, Rooms, Room Detail, Devices, Alerts, Reports, Users, Settings, Profile, Flash Device.

**Build for production:**

```bash
npm run build    # outputs to dist/
```

### 2.3 Firmware

**Hardware:** ESP32 WROOM (DevKit V1)

**Sensors:**
- SCD41 (CO2, temperature, humidity) via I2C
- DS18B20 (bag temperatures) on two OneWire buses (GPIO 0, GPIO 17)
- DHT11 (outdoor temperature/humidity) on GPIO 5

**Relays (7 total):**

| Relay | GPIO | Function |
|-------|------|----------|
| CO2 | 16 | CO2 extraction fan |
| Humidity | 23 | Humidity control |
| Temperature | 4 | AC/cooling |
| AHU | 13 | Air handling unit |
| Humidifier | 14 | Humidifier |
| Duct/Fan | 27 | Duct fan |
| Extra | 25 | Spare relay |

**Setup and flash:**

```bash
# 1. Open PlatformIO project
cd Firmware

# 2. Edit configuration.h if needed (see Section 3.3 for all parameters)
# For local development, set:
#   apiBaseURL = "http://<your-local-ip>:3800/api/v1"
#   mqttBrokerHost = "localhost"
#   mqttBrokerPort = 1883

# 3. Build and flash via USB
pio run --target upload

# 4. Open serial monitor (115200 baud)
pio device monitor --baud 115200
```

**PlatformIO configuration** (`platformio.ini`):
- Platform: `espressif32`
- Board: `esp32dev`
- Framework: `arduino`
- Upload/monitor speed: 115200
- Partition table: `partitions_ota.csv` (dual-partition OTA layout, two 1.875MB app slots)
- Build flags: `CORE_DEBUG_LEVEL=1`, `CONFIG_BOOTLOADER_APP_ROLLBACK_ENABLE=1`

**Library dependencies:**
- PubSubClient (MQTT), ArduinoJson, OneWire, Keypad, ESPAsyncWebServer
- Local libraries in `Firmware/libraries/`: Sensirion SCD4x, AsyncTCP, AsyncElegantOTA, DHT, DallasTemperature, LiquidCrystal_I2C

---

## 3. Environment Variables Reference

### 3.1 Backend `.env`

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://mushroom:mushroom_dev@localhost:5432/mushroom_farm` | PostgreSQL connection string (must use `asyncpg` driver) | Yes |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection string | No (graceful fallback) |
| `JWT_SECRET` | `change-me-in-production` | Secret key for JWT token signing | Yes |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm | No |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Access token TTL in minutes | No |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token TTL in days | No |
| `CORS_ORIGINS` | `http://localhost:3801` | Comma-separated allowed origins | Yes |
| `MQTT_BROKER_HOST` | `localhost` | MQTT broker hostname | No (graceful fallback) |
| `MQTT_BROKER_PORT` | `1883` | MQTT broker port (8883 for TLS) | No |
| `MQTT_USERNAME` | `backend_service` | MQTT authentication username | No |
| `MQTT_PASSWORD` | `backend_mqtt_secret` | MQTT authentication password | No |
| `MQTT_USE_TLS` | `False` | Enable TLS for MQTT connection | No |
| `MQTT_CA_CERTS` | `../certs/ca.crt` | Path to CA certificate for MQTT TLS | No |
| `EMQX_API_URL` | `http://localhost:18083` | EMQX management API (local dev only) | No |
| `DEVICE_ENCRYPTION_KEY` | `change-me-32-byte-base64-key-pad=` | Fernet key for encrypting device passwords in DB | Yes |

**Generate a proper Fernet key:**

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

**Example `.env` for local development** (copy from `backend/.env.example`):

```env
DATABASE_URL=postgresql+asyncpg://mushroom:mushroom_dev@localhost:5432/mushroom_farm
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:3801
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_USERNAME=backend_service
MQTT_PASSWORD=backend_mqtt_secret
EMQX_API_URL=http://localhost:18083
DEVICE_ENCRYPTION_KEY=change-me-generate-with-fernet
```

### 3.2 Frontend `.env`

| Variable | Default | Description | Required |
|----------|---------|-------------|----------|
| `VITE_API_BASE_URL` | `http://localhost:3800/api/v1` | Backend API base URL | Yes |
| `VITE_WS_BASE_URL` | `ws://localhost:3800/api/v1` | WebSocket base URL | Yes |

**Local development** (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:3800/api/v1
VITE_WS_BASE_URL=ws://localhost:3800/api/v1
```

**Production** (`frontend/.env.production`):

```env
VITE_API_BASE_URL=https://protective-enjoyment-production-2320.up.railway.app/api/v1
VITE_WS_BASE_URL=wss://protective-enjoyment-production-2320.up.railway.app/api/v1
```

### 3.3 Firmware `configuration.h`

All firmware configuration is in `Firmware/src/main/configuration.h`. There is no `.env` file for firmware — values are compiled into the binary.

| Parameter | Production Value | Description |
|-----------|-----------------|-------------|
| `apiBaseURL` | `https://protective-enjoyment-production-2320.up.railway.app/api/v1` | Backend API base URL |
| `mqttBrokerHost` | `f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud` | MQTT broker hostname |
| `mqttBrokerPort` | `8883` | MQTT broker port (TLS) |
| `mqttUsername` | `admin` | MQTT username (shared credential) |
| `mqttDefaultPassword` | `Admin123` | MQTT password (shared credential) |
| `FIRMWARE_VERSION` | `4.0.0` | Firmware version string |
| `timerDelay` | `30000` (30s) | Sensor reading and POST interval (ms) |
| `keyAuthenticationTimer` | `1800000` (30min) | Device key re-auth interval (ms) |
| `CO2MinValue` | `1200` | CO2 threshold (ppm) for relay activation |
| `tempMinValue` | `16` | Temperature threshold (Celsius) |
| `humidityMin` | `90` | Humidity threshold (%) |
| `EEPROM_MEMORY_SIZE` | `512` | EEPROM allocation (bytes) |
| `OTA_VALIDATION_TIMEOUT` | `60000` (60s) | Time to validate new firmware before rollback |
| `OTA_MAX_DOWNLOAD_SIZE` | `1900000` (~1.9MB) | Maximum OTA firmware size |
| `HEAP_WARNING_THRESHOLD` | `20000` (20KB) | Free heap warning level |
| `ntpServer` | `pool.ntp.org` | NTP time sync server |
| `gmtOffset_sec` | `19800` (IST, UTC+5:30) | GMT offset in seconds |

**GPIO assignments:**

| Define | GPIO | Purpose |
|--------|------|---------|
| `CO2_RELAY_3` | 16 | CO2 relay |
| `HUMIDITY_RELAY_1` | 23 | Humidity relay |
| `TEMP_RELAY_2` | 4 | Temperature (AC) relay |
| `AHU_RELAY_4` | 13 | AHU relay |
| `HUMIDIFIER_RELAY_5` | 14 | Humidifier relay |
| `DUCT_FAN_RELAY_6` | 27 | Duct fan relay |
| `EXTRA_RELAY_7` | 25 | Extra relay |
| `DHTPIN` | 5 | DHT11 sensor |
| `joyX` | 32 | Joystick X-axis |
| `joyY` | 33 | Joystick Y-axis |
| `BUTTON` | 26 | Joystick button |
| OneWire Bus 1 | 0 | DS18B20 bag temp sensors |
| OneWire Bus 2 | 17 | DS18B20 bag temp sensors |

---

## 4. Port Configuration

| Port | Service | Protocol | Notes |
|------|---------|----------|-------|
| **3800** | Backend API (FastAPI/uvicorn) | HTTP | Local dev only |
| **3801** | Frontend dev server (Vite) | HTTP | Local dev only |
| **5432** | PostgreSQL | TCP | Docker container locally, Neon in production |
| **6379** | Redis | TCP | Docker container locally, Upstash in production |
| **1883** | MQTT (EMQX, local) | TCP | Unencrypted, local dev only |
| **8883** | MQTT (HiveMQ Cloud) | TLS | Production, encrypted |
| **8083** | EMQX WebSocket | HTTP | Local dev only |
| **18083** | EMQX Dashboard | HTTP | Local dev only (admin/admin123) |

---

## 5. Cloud Deployment

### 5.1 Railway (Backend)

**Project ID:** `f7aa68d6-708c-4f91-a7d5-31256539983f`
**URL:** `https://protective-enjoyment-production-2320.up.railway.app`

**How it works:**
- Railway reads `railway.toml` at the repo root, which points to `backend/Dockerfile`.
- The Dockerfile builds from `python:3.12-slim`, installs deps, copies the `backend/` directory, and runs uvicorn.
- Railway auto-assigns a `PORT` env var; uvicorn binds to `0.0.0.0:${PORT:-3800}`.
- HTTPS is handled automatically by Railway (Let's Encrypt).

**`railway.toml`:**

```toml
[build]
dockerfilePath = "backend/Dockerfile"
```

**`backend/Dockerfile`:**

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-3800}
```

**Environment variables to set in Railway dashboard:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://<neon-connection-string>` |
| `REDIS_URL` | `rediss://default:<password>@closing-bee-67960.upstash.io:6379` |
| `JWT_SECRET` | (generate a secure random string) |
| `CORS_ORIGINS` | `https://mushroomkimandi.com,https://dashboard.mushroomkimandi.com,http://localhost:3801` |
| `MQTT_BROKER_HOST` | `f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud` |
| `MQTT_BROKER_PORT` | `8883` |
| `MQTT_USERNAME` | `admin` |
| `MQTT_PASSWORD` | `Admin123` |
| `MQTT_USE_TLS` | `True` |
| `DEVICE_ENCRYPTION_KEY` | (generate with Fernet — see Section 3.1) |

**Deploy:**
- Push to `main` branch on GitHub. Railway auto-deploys.
- Or use Railway CLI: `railway up`

### 5.2 Vercel (Frontend + Marketing)

**Account:** `ai-meharbnsingh`

**Dashboard app** (`frontend/` directory):
- Domain: `dashboard.mushroomkimandi.com`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

**`frontend/vercel.json`:**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The SPA rewrite rule ensures all routes are handled by React Router.

**Environment variables to set in Vercel dashboard:**

| Variable | Value |
|----------|-------|
| `VITE_API_BASE_URL` | `https://protective-enjoyment-production-2320.up.railway.app/api/v1` |
| `VITE_WS_BASE_URL` | `wss://protective-enjoyment-production-2320.up.railway.app/api/v1` |

**Marketing site:**
- Domain: `mushroomkimandi.com` (also `.in`, `.online`)
- Source: `marketing_site/` directory
- Deployed separately on Vercel

### 5.3 Neon (PostgreSQL)

**Project:** `mushroom-farm`, Region: US East 1, Database: `neondb`

**Connection string format:**

```
postgresql+asyncpg://<user>:<password>@<host>/<dbname>?sslmode=require
```

The pooler endpoint (ending in `-pooler`) is recommended for production to handle connection limits.

**Running Alembic migrations on Neon:**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://<neon-connection-string>" alembic upgrade head
```

**Important notes:**
- Neon free tier auto-suspends after 5 minutes of inactivity. First query after suspension has 500ms-2s latency.
- For always-on, upgrade to Neon Pro.

### 5.4 Upstash (Redis)

**Host:** `closing-bee-67960.upstash.io:6379`
**Connection:** TLS required (use `rediss://` prefix, note the double-s)

```
REDIS_URL=rediss://default:<password>@closing-bee-67960.upstash.io:6379
```

**Free tier limits:**
- 10,000 commands/day
- With 2 devices at 30s intervals and ~4 Redis commands per reading: ~23,040 commands/day (already over limit)
- Upgrade to Pay-as-you-go ($0.2/100K commands) when running 2+ devices continuously

**Redis is optional.** If unavailable, the backend starts without rate limiting and without live data caching. MQTT telemetry still flows to the database.

### 5.5 HiveMQ Cloud (MQTT)

**Broker URL:** `f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud`
**Port:** `8883` (TLS only, no plaintext)
**Username:** `admin`
**Password:** `Admin123`

**Current setup:** Shared credentials for all devices and the backend. HiveMQ Cloud Serverless does not support webhook-based or per-device authentication.

**Free tier limits:**
- 100 simultaneous connections
- 10 GB traffic/month
- Sufficient for ~98 devices (backend uses 1 connection + 1 per ESP32)

**Migration plan for 10+ devices:** Switch to EMQX Cloud with HTTP Auth Plugin. The existing backend endpoints (`/api/v1/emqx/auth` and `/api/v1/emqx/acl`) are already built and will work without changes.

### 5.6 DNS (Hostinger)

All domains are managed at Hostinger with A records pointing to Vercel.

| Domain | Type | Value | TTL |
|--------|------|-------|-----|
| `mushroomkimandi.com` | A | `76.76.21.21` | 14400 |
| `dashboard.mushroomkimandi.com` | A | `76.76.21.21` | 14400 |
| `mushroomkimandi.in` | A | `76.76.21.21` | 14400 |
| `mushroomkimandi.online` | A | `76.76.21.21` | 14400 |

`76.76.21.21` is Vercel's anycast IP for custom domains.

---

## 6. CORS Configuration

CORS is configured in `backend/app/main.py` via FastAPI's `CORSMiddleware`. The allowed origins are read from the `CORS_ORIGINS` environment variable as a comma-separated string.

**Local development:**

```
CORS_ORIGINS=http://localhost:3801
```

**Production:**

```
CORS_ORIGINS=https://mushroomkimandi.com,https://dashboard.mushroomkimandi.com,http://localhost:3801
```

The middleware allows:
- `allow_credentials=True` (for cookie-based JWT auth)
- `allow_methods=["*"]`
- `allow_headers=["*"]`

---

## 7. TLS/SSL Configuration

### MQTT TLS (HiveMQ Cloud)

- HiveMQ Cloud enforces TLS on port 8883. No plaintext connections accepted.
- Backend uses `ssl.create_default_context()` (system CA store) when `MQTT_USE_TLS=True`. No custom CA cert needed for HiveMQ.
- ESP32 firmware uses `WiFiClientSecure` with `setInsecure()` (skips certificate pinning). This is acceptable because HiveMQ uses a trusted CA (Let's Encrypt/DigiCert).

### HTTPS (Railway)

- Railway provides automatic SSL via Let's Encrypt for all deployed services.
- No manual certificate configuration needed.
- The backend is only accessible over HTTPS in production.

### Local Development TLS (EMQX)

For local MQTT TLS testing, self-signed certificates are stored in the `certs/` directory:
- `certs/ca.crt` — CA certificate
- `certs/server.crt` — Server certificate
- `certs/server.key` — Server private key

The `docker-compose.yml` mounts these into the EMQX container for the TLS listener on port 8883.

---

## 8. Database

### Schema Overview

The database uses SQLAlchemy async models with PostgreSQL. For the full schema, refer to `Docs/MUSHROOM_FARM_BLUEPRINT.md`.

Key tables include: `users`, `plants`, `rooms`, `devices`, `readings`, `alerts`, `relay_configs`, `growth_cycles`, `harvests`, `firmware_files`.

### Alembic Migration Commands

```bash
cd backend

# Apply all pending migrations
alembic upgrade head

# Create a new migration (after model changes)
alembic revision --autogenerate -m "description of change"

# Downgrade one step
alembic downgrade -1

# View migration history
alembic history

# View current revision
alembic current
```

**How migrations work:**
- `alembic/env.py` reads `DATABASE_URL` from the environment (or `.env` file via `python-dotenv`).
- Migrations use the async engine (`async_engine_from_config`).
- All models must be imported in `app/models/__init__.py` so Alembic sees them for autogenerate.

**Running migrations against Neon (production):**

```bash
cd backend
DATABASE_URL="postgresql+asyncpg://<neon-user>:<neon-password>@<neon-host>/<neon-db>?sslmode=require" \
  alembic upgrade head
```

### Backup Strategy

- Neon provides point-in-time restore on paid plans.
- For free tier: use `pg_dump` with the Neon connection string for manual backups.

---

## 9. MQTT Configuration

### Topic Structure

All MQTT topics follow the pattern `device/{license_key}/{message_type}`:

| Topic | Direction | QoS | Description |
|-------|-----------|-----|-------------|
| `device/{licenseKey}/telemetry` | Device -> Backend | 1 | Sensor data (CO2, temp, humidity, bag temps, relay states) |
| `device/{licenseKey}/status` | Device -> Backend | 1 | Online/offline status (LWT) |
| `device/{licenseKey}/commands` | Backend -> Device | 0 | Relay toggle commands |
| `device/{licenseKey}/control` | Backend -> Device | 0 | Kill-switch (enable/disable device) |
| `device/{licenseKey}/config` | Backend -> Device | 0 | Threshold config updates (CO2 min, temp min, humidity min) |
| `device/{licenseKey}/ota` | Backend -> Device | 0 | OTA firmware update trigger |
| `farm/broadcast/control` | Backend -> All Devices | 0 | Broadcast control to all devices |

### QoS Levels

- **QoS 0** (fire and forget): Used for commands and config updates — device will get the next one even if one is missed.
- **QoS 1** (at least once): Used for telemetry and status — ensures sensor data is not lost.

### Authentication

**Current (2-3 devices):** Shared credentials `admin`/`Admin123` on HiveMQ Cloud. All devices and the backend connect with the same username/password. Topic structure provides logical separation (each device publishes to its own `device/{licenseKey}/` namespace).

**Future (10+ devices):** Migrate to EMQX Cloud with HTTP Auth Plugin. The backend already has webhook auth endpoints built:
- `POST /api/v1/emqx/auth` — validates device credentials
- `POST /api/v1/emqx/acl` — enforces topic-level access control

### Optional / Graceful Fallback

MQTT is optional. If the broker is unreachable at startup, the backend logs a warning and continues running. Devices in HTTP mode still POST sensor data directly to the REST API. MQTT enables real-time push (WebSocket to dashboard) and relay commands.

---

## 10. Firmware Flashing

### USB Flash via PlatformIO

**IMPORTANT: For fresh devices, ALWAYS erase flash first.** This clears EEPROM (WiFi creds, MQTT config, license key, thresholds) so the device boots clean into Setup Mode.

```bash
# Connect ESP32 via USB
cd Firmware

# FRESH DEVICE: Erase all flash + upload (clears EEPROM completely)
pio run --target erase && pio run --target upload

# EXISTING DEVICE: Upload only (preserves EEPROM — WiFi, key, config)
pio run --target upload

# Monitor serial output
pio device monitor --baud 115200
```

> **When to erase vs preserve:**
> - `erase + upload` = New device, factory reset, switching environments (local↔production)
> - `upload only` = Firmware update on a working device (keeps WiFi + license key)

If you have multiple USB devices, specify the port:

```bash
pio run --target upload --upload-port /dev/cu.usbserial-0001
```

### Setup Mode (First Boot)

When an ESP32 boots without a saved WiFi network or license key:

1. **Captive Portal** starts automatically.
2. Device creates a WiFi hotspot: `MUSH_XXXX` (XXXX = last 4 of MAC).
3. Password: `123456`.
4. Connect to the hotspot; a captive portal page opens.
5. Enter your WiFi SSID and password.
6. The ESP32 connects to WiFi and saves credentials to EEPROM.

### Writing License Key via Serial

After WiFi is connected, if no license key is stored:

1. Open PlatformIO serial monitor (`pio device monitor --baud 115200`).
2. Send the key command: `KEY:LIC-XXXX-YYYY-ZZZZ`
3. The device stores the key in EEPROM (address 13, up to 20 chars) and begins registration with the backend.

### Device Registration Flow

1. Device sends `POST /device/register` with MAC address, firmware version, and license key.
2. Backend validates the license key and creates/updates the device record.
3. Device receives its `device_id` and stores it in EEPROM (address 34).
4. Device begins polling `GET /device/provision/{license_key}` for MQTT credentials.
5. Once an admin approves the device, provisioning returns MQTT host/port and status "ready".
6. Device switches from HTTP polling mode to MQTT mode (`mqttProvisioned = true`).

### OTA Update Process (Dual Partition)

The ESP32 uses a dual-partition OTA layout (`partitions_ota.csv`):

1. Backend publishes an OTA command to `device/{licenseKey}/ota` with the firmware download URL.
2. Device disconnects MQTT (frees ~45KB RAM for the second TLS session).
3. Device downloads the firmware binary over HTTPS.
4. Binary is written to the inactive OTA partition.
5. Device reboots into the new partition.
6. New firmware has 60 seconds (`OTA_VALIDATION_TIMEOUT`) to call `esp_ota_mark_app_valid_cancel_rollback()`.
7. If validation fails (crash/hang), the bootloader automatically rolls back to the previous partition.

**Rollback methods:**
- **Automatic:** Bootloader rolls back if new firmware does not validate within 60s.
- **USB:** Flash previous firmware via PlatformIO USB upload.
- **ElegantOTA:** Navigate to `http://{device_ip}/update` and upload a `.bin` file via browser.

### ESP32 Memory Budget

| Component | RAM Usage |
|-----------|-----------|
| FreeRTOS + Arduino core | ~50 KB |
| WiFi stack | ~40 KB |
| WiFiClientSecure (1 TLS session) | ~45 KB |
| PubSubClient buffer | ~1 KB |
| AsyncWebServer | ~15 KB |
| EEPROM buffer | ~0.5 KB |
| LCD + I2C drivers | ~5 KB |
| Sensor libraries | ~10 KB |
| ArduinoJson + String + stack | ~23 KB |
| **Total used** | **~190 KB** |
| **ESP32 SRAM** | **320 KB** |
| **Free** | **~130 KB** |
| **During OTA (2nd TLS)** | **~85 KB free** |

MQTT must be disconnected before OTA download to avoid running out of RAM.

---

## 11. E2E Testing

### Playwright Configuration

File: `frontend/playwright.config.ts`

```typescript
{
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://localhost:3801',
    headless: false,
    slowMo: 500,
    screenshot: 'on',
    video: 'on-first-retry',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },
  outputDir: '../screenshots/e2e',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
}
```

### Test Files

| File | Tests | Description |
|------|-------|-------------|
| `frontend/e2e/full-walkthrough.spec.ts` | 19 | Admin user full walkthrough (all pages, CRUD, relay controls) |
| `frontend/e2e/user-walkthrough.spec.ts` | 9 | Regular user walkthrough (limited permissions) |

### Running Tests

```bash
# Ensure backend (port 3800) and frontend (port 3801) are running

cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests (headed, with slow motion)
npx playwright test

# Run specific test file
npx playwright test e2e/full-walkthrough.spec.ts

# View the HTML report
npx playwright show-report
```

### Screenshot Directories

| Directory | Contents |
|-----------|----------|
| `screenshots/admin-view/` | Admin walkthrough screenshots |
| `screenshots/user-view/` | User walkthrough screenshots |
| `screenshots/e2e/` | Playwright test output |
| `screenshots/e2e/failures/` | Failed test screenshots |
| `frontend/playwright-report/` | HTML test report |

### Test Credentials

| User | Username | Password | Role |
|------|----------|----------|------|
| Admin | `admin` | `admin123` | Admin (full access) |
| Manager | `ignited` | `ignited123` | Manager (limited) |

---

## 12. Monitoring & Troubleshooting

### Health Checks

**Backend:**

```bash
curl https://protective-enjoyment-production-2320.up.railway.app/health
# Response: {"status": "healthy"}
```

**Frontend:** Load `https://dashboard.mushroomkimandi.com` in a browser.

**ESP32:** Check serial monitor for:
- WiFi connection status and IP address
- MQTT connection status
- Free heap memory (`free_heap` in telemetry)
- NTP time sync

### Common Issues

#### WiFi AUTH_EXPIRE on ESP32

Some routers (particularly with PMF/Protected Management Frames enabled) cause `AUTH_EXPIRE` errors on ESP32. The ESP32 connects but quickly disconnects.

**Workaround:** Disable PMF on the router, or use a different WiFi network. The firmware includes `WiFi.persistent(false)` to avoid stale credential issues.

#### MQTT Disconnects

- Check HiveMQ Cloud status at the HiveMQ console.
- Verify credentials (`admin`/`Admin123`).
- Ensure port 8883 is not blocked by firewall.
- Backend auto-reconnects every 5 seconds on disconnect.
- ESP32 auto-reconnects in the main loop.

#### Redis Unavailable

If Redis is down or unreachable:
- Rate limiting is disabled (all requests pass through).
- Live data caching is unavailable (dashboard may show stale data).
- The backend continues running — telemetry is still stored in PostgreSQL.
- Log message: `"Redis unavailable, rate limiting disabled"`

#### Neon Database Cold Start

After 5 minutes of inactivity, Neon free tier suspends the database. The first query takes 500ms-2s.
- If a device's first telemetry after a quiet period fails, it retries on the next 30s cycle.
- For always-on, upgrade to Neon Pro.

#### Admin Account Locked Out

After 5 consecutive failed login attempts, the admin account may get locked. To unlock:

```sql
-- Connect to the database
UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = 'admin';
```

#### Stale Frontend Build

If `frontend/dist/` contains a stale build pointing to the wrong backend URL:

```bash
cd frontend
rm -rf dist
npm run build
```

### Log Locations

| Service | Location |
|---------|----------|
| Backend (local) | Terminal stdout (uvicorn) |
| Backend (Railway) | Railway dashboard -> Logs |
| Frontend (local) | Browser console |
| Frontend (Vercel) | Vercel dashboard -> Functions (if any) |
| ESP32 | Serial monitor (115200 baud) |
| EMQX (local) | `docker compose logs emqx` |

### Login Rate Limit

The login endpoint allows 30 requests per 60 seconds. The rate limiter was removed from production (was Redis-dependent), so in production there is currently no rate limiting on login. See Security Checklist below.

---

## 13. Security Checklist

### Critical (fix before production traffic)

- [ ] **Cookie `secure=True`** in production — currently `secure=False` in `backend/app/` auth logic. Must be set to `True` so cookies are only sent over HTTPS.
- [ ] **Fernet encryption key** — ensure `DEVICE_ENCRYPTION_KEY` in production is a properly generated Fernet key, not the placeholder.
- [ ] **JWT secret** — ensure `JWT_SECRET` in production is a long, random string, not `change-me-in-production`.
- [ ] **No secrets in git** — `.env.production` files are gitignored. Never commit credentials to the repository.

### Before scaling (10+ devices)

- [ ] **MQTT per-device auth** — migrate from shared `admin`/`Admin123` to EMQX Cloud with per-device credentials via HTTP Auth Plugin.
- [ ] **Upstash Redis upgrade** — free tier (10K commands/day) is already exceeded with 2 devices. Upgrade to pay-as-you-go.
- [ ] **Login rate limiting** — re-implement using in-memory counter or Railway edge layer (current rate limiter was removed because it depended on Redis).
- [ ] **Neon always-on** — upgrade from free tier to avoid cold start latency.

### Ongoing

- [ ] **Fernet key rotation** — rotate the device encryption key periodically. Re-encrypt all device passwords in the database after rotation.
- [ ] **Dependency audit** — run `pip audit` and `npm audit` regularly.
- [ ] **EEPROM plaintext** — device MQTT passwords are stored in plaintext in ESP32 EEPROM. Acceptable for a farm environment; consider ESP32 flash encryption for higher-security deployments.
- [ ] **Remove hardcoded WiFi** — `eepromConfig.ino` contains legacy hardcoded WiFi credentials. Remove before distributing firmware to third parties.
- [ ] **Monitor HiveMQ limits** — 100 simultaneous connections, 10 GB/month on free tier.

---

## Quick Reference: Local Dev Startup

```bash
# Terminal 1: Docker services
cd Mushroom_IOT_Monitoring
docker compose up -d

# Terminal 2: Backend
cd backend
source .venv/bin/activate
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 3800 --reload

# Terminal 3: Frontend
cd frontend
npm run dev

# Terminal 4: Firmware (optional, for ESP32 development)
cd Firmware
pio device monitor --baud 115200
```

**Default login:** `admin` / `admin123` at `http://localhost:3801`
