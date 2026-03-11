# Device Provisioning & Lifecycle

This document describes the full lifecycle of an ESP32 device in the Mushroom Farm IoT Monitoring platform -- from initial provisioning through active MQTT operation, suspension, and expiry.

---

## 1. Provisioning Sequence Diagram

```mermaid
sequenceDiagram
    participant SA as Super Admin (Dashboard)
    participant BE as Backend API
    participant DB as PostgreSQL
    participant T as Technician
    participant ESP as ESP32 Device
    participant CP as Captive Portal
    participant O as Owner / Admin
    participant MQTT as HiveMQ Cloud Broker

    Note over SA,DB: Phase 1 -- Device Creation
    SA->>BE: POST /api/v1/devices/provision<br/>{mac_address, device_name, device_type}
    BE->>DB: INSERT Device (license_key=auto-generated,<br/>status=PENDING)
    BE-->>SA: {device_id, license_key: "LIC-XXXX-YYYY-ZZZZ",<br/>subscription_status: "PENDING"}
    SA->>SA: Print QR code with license_key

    Note over T,ESP: Phase 2 -- Firmware Flashing
    T->>ESP: Flash firmware via Web Serial / PlatformIO / Arduino IDE
    T->>ESP: Write license key via USB Serial:<br/>KEY:LIC-XXXX-YYYY-ZZZZ

    Note over ESP,CP: Phase 3 -- WiFi Setup (First Boot)
    ESP->>ESP: Boot -> EEPROM init -> check config version (v3)
    ESP->>ESP: No WiFi credentials in EEPROM
    ESP->>CP: Start AP: MUSH_ZZZZ (password: 12345678)
    CP->>CP: DNS redirect all domains to 192.168.4.1
    T->>CP: Connect phone/laptop to AP
    CP-->>T: Captive portal auto-opens (WiFi config page)
    T->>CP: GET /scan (async WiFi scan)
    CP-->>T: [{ssid: "FarmWiFi", rssi: -45, secure: true}, ...]
    T->>CP: POST /connect {ssid: "FarmWiFi", password: "..."}
    CP->>ESP: Save WiFi credentials to EEPROM (addr 175-273)
    ESP->>ESP: Reboot

    Note over ESP,BE: Phase 4 -- Device Registration
    ESP->>ESP: Boot -> read WiFi from EEPROM -> connect to WiFi
    ESP->>BE: POST /api/v1/device/register<br/>{license_key, mac_address, firmware_version}
    BE->>DB: Verify license_key + mac_address match<br/>Update firmware_version, is_online=true
    BE-->>ESP: {status: "registered", device_id: 1,<br/>subscription_status: "PENDING"}
    ESP->>ESP: Save device_id to EEPROM (addr 34-37)

    Note over ESP,BE: Phase 5 -- Provision Polling (HTTP Bootstrap)
    loop Every 30 seconds
        ESP->>BE: GET /api/v1/device/provision/{license_key}<br/>Header: X-Mac-Address
        BE-->>ESP: {status: "pending", api_base_url: "https://..."}
    end

    Note over O,BE: Phase 6 -- Device Linking
    O->>BE: POST /api/v1/devices/link<br/>{license_key: "LIC-XXXX-YYYY-ZZZZ", room_id: 5}
    BE->>DB: Validate PENDING status, validate room ownership<br/>Set status=PENDING_APPROVAL, room_id=5
    BE-->>O: {device_id, status: "PENDING_APPROVAL", room_id: 5}

    Note over SA,BE: Phase 7 -- Admin Approval
    SA->>BE: POST /api/v1/devices/{id}/approve<br/>{action: "APPROVE"}
    BE->>DB: Generate MQTT password (encrypted)<br/>Set status=ACTIVE
    BE-->>SA: {status: "ACTIVE", device_id}

    Note over ESP,MQTT: Phase 8 -- MQTT Activation
    ESP->>BE: GET /api/v1/device/provision/{license_key}
    BE-->>ESP: {status: "ready",<br/>mqtt_password: "decrypted-pwd",<br/>mqtt_host: "f926...hivemq.cloud",<br/>mqtt_port: 8883,<br/>device_id: 1, api_base_url: "https://..."}
    ESP->>ESP: Save MQTT credentials to EEPROM (addr 38-170)<br/>Save API base URL to EEPROM (addr 275-374)
    ESP->>ESP: Reboot into MQTT mode

    Note over ESP,MQTT: Phase 9 -- MQTT Runtime
    ESP->>MQTT: TLS Connect (port 8883, LWT: offline)
    ESP->>MQTT: Subscribe: device/{key}/commands (QoS 1)
    ESP->>MQTT: Subscribe: device/{key}/control (QoS 1)
    ESP->>MQTT: Subscribe: device/{key}/ota (QoS 1)
    ESP->>MQTT: Subscribe: device/{key}/config (QoS 1)
    ESP->>MQTT: Publish: device/{key}/status<br/>{"status":"online"} (retained)
    loop Every 30 seconds
        ESP->>MQTT: Publish: device/{key}/telemetry<br/>{co2_ppm, room_temp, room_humidity, ...}
    end
    MQTT->>BE: Backend subscribed to device/+/telemetry,<br/>device/+/status, device/+/relay_ack
```

---

## 2. Subscription Status State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: POST /devices/provision<br/>(Admin creates device)

    PENDING --> PENDING_APPROVAL: POST /devices/link<br/>(Owner scans QR / enters key)

    PENDING_APPROVAL --> ACTIVE: POST /devices/{id}/approve<br/>action=APPROVE<br/>(Generates MQTT password)

    PENDING_APPROVAL --> PENDING: POST /devices/{id}/approve<br/>action=REJECT<br/>(Clears room + link info)

    ACTIVE --> SUSPENDED: POST /devices/{id}/kill-switch<br/>action=DISABLE<br/>(MQTT control: DISABLE)

    SUSPENDED --> ACTIVE: POST /devices/{id}/kill-switch<br/>action=ENABLE<br/>(MQTT control: ENABLE)

    ACTIVE --> EXPIRED: POST /devices/{id}/revoke<br/>(Permanent deactivation)

    SUSPENDED --> EXPIRED: POST /devices/{id}/revoke

    EXPIRED --> [*]
```

### Status Definitions

| Status | Description | Device Behavior |
|--------|-------------|-----------------|
| `PENDING` | Device created by admin, awaiting owner link | ESP32 polls `/device/provision/{key}` -- receives `status: "pending"` |
| `PENDING_APPROVAL` | Owner linked device to a room, awaiting admin approval | ESP32 polls -- receives `status: "pending_approval"` |
| `ACTIVE` | Approved with MQTT credentials generated | ESP32 polls -- receives `status: "ready"` + MQTT creds, reboots to MQTT mode |
| `SUSPENDED` | Temporarily disabled via kill-switch | ESP32 receives MQTT `DISABLE` command, turns off all relays |
| `EXPIRED` | Permanently revoked | Device deactivated (`is_active=false`), cannot be re-enabled |

---

## 3. Communication Mode Transition

```mermaid
flowchart LR
    A["HTTP Bootstrap Mode<br/>(mqttProvisioned=false)"] -->|"Provision poll returns<br/>status='ready' +<br/>MQTT credentials"| B["Save to EEPROM<br/>(addr 38-170)"]
    B -->|"ESP.restart()"| C["MQTT Runtime Mode<br/>(mqttProvisioned=true)"]
    C -->|"20 consecutive MQTT failures<br/>with WiFi connected"| D["Clear MQTT provisioning<br/>(EEPROM addr 38 = 255)"]
    D -->|"ESP.restart()"| A
```

### HTTP Bootstrap Mode

In this mode, the ESP32 uses HTTP endpoints for all communication:

- **POST** `/device/register` -- authenticate with license_key + mac_address
- **POST** `/device/readings` -- send sensor data (X-Device-Id + X-Device-Key headers)
- **POST** `/device/heartbeat` -- health check with IP, RSSI, heap, uptime
- **GET** `/device/{id}/commands` -- poll for pending relay commands (Redis queue)
- **GET** `/device/provision/{license_key}` -- poll for MQTT credentials (every 30s)

### MQTT Runtime Mode

After MQTT provisioning, all real-time communication switches to MQTT:

- Telemetry published every 30 seconds to `device/{key}/telemetry`
- Relay commands received via `device/{key}/commands` subscription
- Kill-switch via `device/{key}/control` subscription
- OTA updates via `device/{key}/ota` subscription
- Threshold config sync via `device/{key}/config` subscription

---

## 4. API Endpoints Reference

### Device API (ESP32 calls these) -- prefix: `/api/v1/device`

| Method | Endpoint | Auth | Description | Request | Response |
|--------|----------|------|-------------|---------|----------|
| POST | `/register` | None (rate-limited: 5/min) | Register device with license_key + MAC | `{"license_key": "LIC-SIJT-EJZQ-Q4YV", "mac_address": "C8:F0:9E:A6:2A:84", "firmware_version": "4.0.0"}` | `{"status": "registered", "device_id": 1, "device_name": "Device-1", "subscription_status": "PENDING"}` |
| GET | `/provision/{license_key}` | Rate-limited: 10/min | Poll provisioning status | Header: `X-Mac-Address` (optional) | See provisioning response table below |
| POST | `/readings` | X-Device-Id + X-Device-Key | Submit sensor reading | `{"co2_ppm": 1150, "room_temp": 22.5, "room_humidity": 88.3, "bag_temps": [21.2, 21.8], "outdoor_temp": 28.1, "outdoor_humidity": 65.0, "relay_states": {"co2": true, "humidity": false, ...}}` | `{"status": "success", "reading_id": 42, "timestamp": "2026-03-11T14:30:00Z"}` |
| POST | `/heartbeat` | X-Device-Id + X-Device-Key | Device health check | `{"device_ip": "192.168.29.52", "wifi_rssi": -45, "free_heap": 180000, "uptime_seconds": 86400}` | `{"status": "success", "server_time": "2026-03-11T14:30:00Z"}` |
| GET | `/{device_id}/commands` | X-Device-Id + X-Device-Key | Poll pending relay commands | -- | `{"commands": [{"relay_type": "CO2", "state": "ON"}]}` |

### Provisioning Response by Status

| Device Status | Response `status` field | Additional Fields |
|---------------|------------------------|-------------------|
| PENDING | `"pending"` | `api_base_url` |
| PENDING_APPROVAL | `"pending_approval"` | `message`, `api_base_url` |
| ACTIVE (with password) | `"ready"` | `mqtt_password`, `mqtt_host`, `mqtt_port`, `device_id`, `api_base_url` |
| SUSPENDED | `"suspended"` | `api_base_url` |
| EXPIRED | `"expired"` | `api_base_url` |

### Devices Management API (Dashboard calls these) -- prefix: `/api/v1/devices`

| Method | Endpoint | Role Required | Description | Request Body |
|--------|----------|---------------|-------------|-------------|
| POST | `/provision` | SUPER_ADMIN, ADMIN | Create new device | `{"mac_address": "C8:F0:9E:A6:2A:84", "device_name": "Fruiting Room 1", "device_type": "ESP32"}` |
| POST | `/link` | SUPER_ADMIN, ADMIN | Link device to room via QR/key | `{"license_key": "LIC-SIJT-EJZQ-Q4YV", "room_id": 5}` |
| GET | `/pending-approval` | SUPER_ADMIN, ADMIN | List devices awaiting approval | -- |
| POST | `/{id}/approve` | SUPER_ADMIN, ADMIN | Approve or reject device | `{"action": "APPROVE"}` or `{"action": "REJECT"}` |
| POST | `/{id}/assign` | SUPER_ADMIN, ADMIN | Assign device directly to plant | `{"plant_id": 1}` |
| POST | `/{id}/kill-switch` | SUPER_ADMIN, ADMIN | Enable/disable device remotely | `{"action": "DISABLE"}` or `{"action": "ENABLE"}` |
| POST | `/{id}/revoke` | SUPER_ADMIN, ADMIN | Permanently revoke device | -- |
| GET | `/` | Authenticated | List devices (filtered by ownership) | -- |
| GET | `/{id}` | Authenticated | Get single device | -- |
| PUT | `/{id}` | ADMIN, MANAGER | Update device (rename, assign room) | `{"device_name": "New Name", "room_id": 3}` |
| DELETE | `/{id}` | ADMIN, SUPER_ADMIN | Soft-delete device | -- |
| POST | `/{id}/qr-image` | SUPER_ADMIN, ADMIN | Upload QR code image (base64) | `{"image": "data:image/png;base64,..."}` |
| GET | `/{id}/qr-image` | Authenticated | Get stored QR code image | -- |

---

## 5. Device Model Fields

| Field | Type | Description |
|-------|------|-------------|
| `device_id` | Integer (PK) | Auto-increment primary key |
| `room_id` | Integer (FK) | Room assignment (nullable until linked) |
| `assigned_to_plant_id` | Integer (FK) | Plant assignment (nullable) |
| `mac_address` | String(17) | Unique MAC address, e.g. `C8:F0:9E:A6:2A:84` |
| `license_key` | String(19) | Unique key: `LIC-XXXX-YYYY-ZZZZ` |
| `device_password` | String(255) | Encrypted MQTT password (Fernet) |
| `device_name` | String(50) | Human-readable name |
| `device_type` | Enum | `ESP32`, `ESP8266`, `ARDUINO`, `PLC` |
| `firmware_version` | String(20) | e.g. `4.0.0` |
| `hardware_version` | String(20) | Hardware revision |
| `device_ip` | String(45) | LAN IP address |
| `wifi_rssi` | Integer | WiFi signal strength (dBm) |
| `free_heap` | Integer | Free heap memory (bytes) |
| `is_online` | Boolean | Updated by telemetry/LWT |
| `last_seen` | DateTime | Last telemetry/heartbeat timestamp |
| `is_active` | Boolean | Soft-delete flag |
| `subscription_status` | Enum | `PENDING`, `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `EXPIRED` |
| `communication_mode` | Enum | `HTTP` or `MQTT` |
| `linked_by_user_id` | Integer (FK) | User who linked the device |
| `linked_at` | DateTime | When device was linked |
| `qr_code_image` | Text | Base64-encoded QR code image |
| `ota_status` | String(20) | `idle`, `updating`, `success`, `failed` |
| `last_ota_at` | DateTime | Last OTA update timestamp |
| `registered_at` | DateTime | Device creation timestamp |
| `updated_at` | DateTime | Last modification timestamp |
