# Mushroom Farm IoT Platform — Universal Setup Guide

Zero code changes between local and production. Everything is driven by environment variables.

---

## Architecture Overview

```
ESP32 Device ──→ MQTT Broker ──→ Backend (FastAPI) ──→ Redis (hot) + PostgreSQL (cold)
                                       ↓
                                  WebSocket push
                                       ↓
                                Frontend (React/Vite) ←── REST polling (fallback)
```

| Component | Local | Production |
|-----------|-------|------------|
| Backend | `localhost:3800` | Railway (auto-deploy from main) |
| Frontend | `localhost:3801` | Vercel (CI deploys after tests pass) |
| PostgreSQL | Docker `localhost:5432` | Neon (cloud PostgreSQL) |
| Redis | Docker `localhost:6379` | Upstash (cloud Redis) |
| MQTT | Docker EMQX `localhost:1883` | HiveMQ Cloud (TLS 8883) |

---

## Quick Start (New Developer)

```bash
# 1. Clone
git clone <repo-url> && cd mushroom-farm-iot

# 2. Start infrastructure (PostgreSQL + Redis + MQTT)
docker-compose up -d

# 3. Backend setup
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Uses local defaults, no changes needed
alembic upgrade head           # Create all tables
python -m app.seed             # Seed admin user + climate guidelines
uvicorn app.main:app --reload --port 3800

# 4. Frontend setup (new terminal)
cd frontend
npm ci
cp .env.example .env           # Uses localhost:3800, no changes needed
npm run dev                    # Starts on port 3801

# 5. Open http://localhost:3801
#    Login: admin / admin123
```

---

## Environment Files

### Principle: Same Code, Different .env

The codebase never contains hardcoded URLs or secrets. Every external dependency
is configured via environment variables loaded from `.env` files (gitignored).

```
repo/
├── backend/
│   ├── .env                  # LOCAL — auto-loaded by Pydantic Settings
│   ├── .env.production       # PROD — reference only (secrets in Railway dashboard)
│   └── .env.example          # TEMPLATE — committed to git, no real secrets
├── frontend/
│   ├── .env                  # LOCAL — auto-loaded by Vite
│   ├── .env.production       # PROD — built into Vercel bundle
│   └── .env.example          # TEMPLATE — committed to git
└── docker-compose.yml        # LOCAL infrastructure (PostgreSQL, Redis, MQTT)
```

### backend/.env.example

```bash
# =============================================================
# BACKEND — LOCAL DEVELOPMENT (copy to .env)
# =============================================================
# No changes needed if using docker-compose.yml defaults.

# Database (Docker PostgreSQL)
DATABASE_URL=postgresql+asyncpg://mushroom:mushroom_dev@localhost:5432/mushroom_farm

# Cache (Docker Redis)
REDIS_URL=redis://localhost:6379/0

# Auth
JWT_SECRET=dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS (frontend dev server)
CORS_ORIGINS=http://localhost:3801,http://localhost:3802

# MQTT (Docker EMQX — or use HiveMQ Cloud for real device data)
MQTT_BROKER_HOST=localhost
MQTT_BROKER_PORT=1883
MQTT_USERNAME=backend_service
MQTT_PASSWORD=backend_mqtt_secret
MQTT_USE_TLS=false

# Device encryption (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
DEVICE_ENCRYPTION_KEY=J35Osb-LxvfGtWkOYiAJw2WFjFkbqa0pW60hr2ZtCik=

# Environment flag (controls cookie flags, logging format)
ENVIRONMENT=development
```

### frontend/.env.example

```bash
# =============================================================
# FRONTEND — LOCAL DEVELOPMENT (copy to .env)
# =============================================================
VITE_API_BASE_URL=http://localhost:3800/api/v1
VITE_WS_BASE_URL=ws://localhost:3800/api/v1
```

### Production Environment Variables

Set these in your hosting platform (Railway dashboard, Vercel dashboard), NOT in files:

**Railway (Backend):**
```
DATABASE_URL=postgresql+asyncpg://<user>:<pass>@<host>/<db>?ssl=require
REDIS_URL=rediss://default:<pass>@<host>:6379
JWT_SECRET=<random-256-bit-hex>
ENVIRONMENT=production
CORS_ORIGINS=https://yourdomain.com,https://dashboard.yourdomain.com
MQTT_BROKER_HOST=<cluster>.s1.eu.hivemq.cloud
MQTT_BROKER_PORT=8883
MQTT_USERNAME=admin
MQTT_PASSWORD=<mqtt-password>
MQTT_USE_TLS=true
DEVICE_ENCRYPTION_KEY=<fernet-key>
PORT=3800
```

**Vercel (Frontend):**
```
VITE_API_BASE_URL=https://<railway-url>/api/v1
VITE_WS_BASE_URL=wss://<railway-url>/api/v1
```

---

## CI/CD Pipeline

### Trigger
Every push/PR to `main` triggers `.github/workflows/ci.yml`.

### Job Graph

```
push to main
    │
    ├──→ backend-checks (ruff lint + format + syntax)
    │         ↓
    │    backend-tests (pytest with SQLite + FakeRedis — zero infrastructure)
    │
    ├──→ frontend-checks (tsc --noEmit + vite build)
    │         ↓
    │    frontend-tests (vitest unit tests)
    │
    └──→ firmware-checks (PlatformIO compile — no upload)
              │
              ↓
    deploy-frontend (Vercel --prod) ← only on push to main, after ALL jobs pass
    deploy-backend ← Railway auto-deploys via GitHub integration (no CI step)
```

### Key Design Decisions

| Decision | Why |
|----------|-----|
| **SQLite + FakeRedis in CI** | Tests run in 30s without Docker/services |
| **Concurrency: cancel-in-progress** | Saves CI minutes on rapid pushes |
| **Dependency caching** (pip, npm, PlatformIO) | 50-70% faster builds |
| **Tests gate deploy** | Never deploy broken code |
| **Railway auto-deploy** | No token management needed for backend |
| **Vercel CLI deploy** | Preserves rootDirectory config |

### GitHub Secrets Required

| Secret | Where to get it |
|--------|-----------------|
| `VERCEL_TOKEN` | vercel.com → Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | Same file |

### Local Test Runner

```bash
# Mirror CI locally before pushing
./scripts/test-local.sh          # all checks
./scripts/test-local.sh backend  # backend only
./scripts/test-local.sh frontend # frontend only
./scripts/test-local.sh lint     # fastest — lint only
```

---

## Database

### Schema Management: Alembic

```bash
cd backend

# Apply all migrations (local or production)
alembic upgrade head

# Create new migration after changing models
alembic revision --autogenerate -m "add_new_table"

# Rollback one migration
alembic downgrade -1

# See current version
alembic current
```

### Seed Data

```bash
python -m app.seed
```

Creates: admin user, sample plant, rooms, devices, thresholds, 24 climate guidelines
(4 mushroom types × 6 growth stages). Idempotent — safe to run multiple times.

### Hot/Cold Data Architecture

```
SENSOR DATA FLOW:
ESP32 (every 2s) → MQTT → Backend
                             ├──→ Redis (HOT)  — live:device:{id}, live:room:{id}  TTL 120s
                             ├──→ WebSocket     — real-time push to dashboard
                             └──→ PostgreSQL (COLD) — room_readings table (history)

DASHBOARD READS FROM:
├── Redis (live gauges, current values)       — GET /live/readings
├── PostgreSQL (charts, history, reports)      — GET /readings/room/{id}
└── WebSocket (real-time push updates)        — ws://.../ws
```

---

## MQTT

### Topics

| Topic | Direction | QoS | Payload |
|-------|-----------|-----|---------|
| `device/{key}/telemetry` | Device → Backend | 0 | `{co2_ppm, room_temp, room_humidity, bag_temps[], relay_states{}}` |
| `device/{key}/commands` | Backend → Device | 1 | `{relay_type, state}` |
| `device/{key}/relay_ack` | Device → Backend | 0 | `{relay_type, state, status}` |
| `device/{key}/config` | Backend → Device | 0 | `{co2_min, temp_min, humidity_min, ...}` |
| `device/{key}/status` | Device → Backend | 0 | `{status, wifi_rssi, free_heap, uptime}` |

### Local vs Production MQTT

| | Local (Docker EMQX) | Production (HiveMQ Cloud) |
|---|---|---|
| Host | `localhost` | `<cluster>.s1.eu.hivemq.cloud` |
| Port | `1883` (no TLS) | `8883` (TLS required) |
| Auth | `backend_service` / `backend_mqtt_secret` | `admin` / `Admin123` |
| Dashboard | `http://localhost:18083` | `https://console.hivemq.cloud` |

To use **real device data locally**, point your `.env` MQTT settings to HiveMQ Cloud
(same as production). The device publishes to HiveMQ regardless of where the backend runs.

---

## Firmware (ESP32)

### Build & Flash

```bash
cd Firmware

# Compile
pio run

# Flash via USB
pio run --target upload

# Flash via OTA (device must be on same network)
curl -X POST \
  -H "Content-Type: application/octet-stream" \
  -H "X-Update-MD5: $(md5 -q .pio/build/esp32dev/firmware.bin)" \
  --data-binary @.pio/build/esp32dev/firmware.bin \
  http://<device-ip>/update
```

### OTA Web Interface

Each device runs AsyncElegantOTA on port 80: `http://<device-ip>/update`

### Key Configuration

File: `Firmware/src/main/configuration.h`

| Setting | Default | Change for |
|---------|---------|------------|
| `timerDelay` | `2000` (2s) | Sensor publish interval |
| `BOOTSTRAP_URL` | Railway prod URL | Change to `localhost:3800` for local dev |
| `FIRMWARE_VERSION` | `4.0.0` | Bump on each release |
| Relay GPIO pins | `16,23,4,13,14,27,25` | Hardware-specific, don't change |

---

## Relay Control System

### Three Control Modes

| Mode | How it works | Who controls |
|------|-------------|--------------|
| **MANUAL** | User clicks toggle on dashboard | Human |
| **AUTO** | Threshold-based: relay turns ON/OFF based on sensor readings vs thresholds | System |
| **SCHEDULE** | Time-based: relay follows on/off schedule with day-of-week | System |

### Auto Mode + Growth Stages

```
Growth Cycle (INOCULATION → SPAWN_RUN → INCUBATION → FRUITING → HARVEST → IDLE)
     ↓ (auto_adjust_thresholds = ON)
Climate Guidelines (per plant type + stage → recommended temp/humidity/CO2 ranges)
     ↓ (on stage advance)
Room Thresholds (auto-updated to match new stage)
     ↓
Relay Automation (evaluates sensor vs threshold → toggles relays)
```

**Auto-Adjust ON**: Advancing stage auto-applies recommended thresholds + syncs to device via MQTT
**Auto-Adjust OFF**: Shows recommendations in Climate Advisory card, human clicks "Apply" manually

### Standard Growth Ranges (Oyster)

| Stage | Temp °C | Humidity % | CO2 ppm | Duration |
|-------|---------|------------|---------|----------|
| INOCULATION | 20-24 | 60-70 | N/A | 2-3 days |
| SPAWN_RUN | 24-28 | 80-85 | ≤5000 | 14-21 days |
| INCUBATION | 20-24 | 85-90 | ≤2000 | 7-14 days |
| FRUITING | 13-18 | 85-95 | 400-1000 | 5-10 days |
| HARVEST | 15-20 | 70-80 | N/A | 1-3 days |

Also configured for: Button, Shiitake, Mixed mushroom types.

---

## Ports

| Service | Port | Protocol |
|---------|------|----------|
| Backend API | 3800 | HTTP |
| Frontend dev | 3801 | HTTP |
| PostgreSQL | 5432 | TCP |
| Redis | 6379 | TCP |
| MQTT (local) | 1883 | TCP |
| MQTT (prod TLS) | 8883 | TLS |
| EMQX Dashboard | 18083 | HTTP |

---

## Switching Environments

### Local → Production

No code changes. Just different `.env` values:

```diff
- DATABASE_URL=postgresql+asyncpg://mushroom:mushroom_dev@localhost:5432/mushroom_farm
+ DATABASE_URL=postgresql+asyncpg://user:pass@neon-host/db?ssl=require

- REDIS_URL=redis://localhost:6379/0
+ REDIS_URL=rediss://default:pass@upstash-host:6379

- MQTT_BROKER_HOST=localhost
- MQTT_BROKER_PORT=1883
- MQTT_USE_TLS=false
+ MQTT_BROKER_HOST=cluster.s1.eu.hivemq.cloud
+ MQTT_BROKER_PORT=8883
+ MQTT_USE_TLS=true

- CORS_ORIGINS=http://localhost:3801
+ CORS_ORIGINS=https://yourdomain.com

- ENVIRONMENT=development
+ ENVIRONMENT=production
```

### Production → Local

Just use `backend/.env` (already has local defaults). Run `docker-compose up -d` for infrastructure.

### Use Real Device Data Locally

Point ONLY the MQTT settings to HiveMQ Cloud in your local `.env`:

```bash
MQTT_BROKER_HOST=<cluster>.s1.eu.hivemq.cloud
MQTT_BROKER_PORT=8883
MQTT_USERNAME=admin
MQTT_PASSWORD=Admin123
MQTT_USE_TLS=true
```

Everything else stays local. Your local backend receives real sensor data from the physical ESP32.
