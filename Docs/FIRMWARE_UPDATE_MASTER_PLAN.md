# ESP32 Firmware v4.0.0 — Master Plan & Future Risk Assessment

**Date:** 2026-03-11
**Current FW:** 1.0.0 (local broker, no TLS)
**Target FW:** 4.0.0 (HiveMQ Cloud TLS, production URLs, hardened)

---

## TABLE OF CONTENTS

1. [What We're Changing](#1-what-were-changing)
2. [Critical Issue: MQTT Authentication](#2-critical-issue-mqtt-authentication)
3. [Complete Change List](#3-complete-change-list)
4. [EEPROM Layout Changes](#4-eeprom-layout-changes)
5. [Future Issues & Risks](#5-future-issues--risks)
6. [Mitigation Plan for Each Risk](#6-mitigation-plan-for-each-risk)
7. [Testing Checklist](#7-testing-checklist)
8. [Rollback Plan](#8-rollback-plan)

---

## 1. WHAT WE'RE CHANGING

### Files Modified

| File | Changes |
|------|---------|
| `configuration.h` | TLS includes, production URLs, MQTT port 8883, version bump |
| `mqttClient.ino` | WiFiClientSecure for TLS, SHA256 OTA checksum, memory-safe OTA |
| `sendingJsonRequest.ino` | WiFiClientSecure for HTTPS API calls to Railway |
| `relayControl.ino` | No changes needed (hysteresis already works) |
| `eepromConfig.ino` | No layout changes needed |
| `main.ino` | Remove EEPROM.commit() from loop, add NTP sync |
| `initWifi.ino` | No changes needed |

### What's NOT Changing (Confirmed Safe)

- GPIO pin assignments (all 7 relays, sensors, I2C, joystick, LCD)
- EEPROM layout (512 bytes, all addresses stay the same)
- Captive portal flow
- Sensor reading logic (SCD41, DS18B20, DHT11)
- LCD menu system
- Device key/license key format

---

## 2. CRITICAL ISSUE: MQTT AUTHENTICATION

### The Problem

The backend has EMQX webhook auth endpoints (`/api/v1/emqx/auth` and `/api/v1/emqx/acl`) that were designed for a **self-hosted EMQX broker**. The broker calls these endpoints to validate device credentials.

**HiveMQ Cloud Serverless does NOT support webhook-based authentication.**

This means the entire provisioning flow is broken for HiveMQ Cloud:

```
Current flow (designed for EMQX):
  1. Backend generates device_password during approval
  2. Device polls GET /provision/{license_key} → gets password
  3. Device connects to MQTT with username=license_key, password=device_password
  4. EMQX calls POST /emqx/auth → backend validates credentials ← THIS DOESN'T EXIST ON HIVEMQ
```

### Impact

- Devices CANNOT use per-device credentials with HiveMQ Cloud Serverless
- The provisioning flow generates passwords that no broker validates
- The ACL enforcement (devices restricted to their own topics) doesn't work

### Solutions (Pick One)

| Option | Effort | Security | Scalability |
|--------|--------|----------|-------------|
| **A. Shared credentials** — All devices use `admin`/`Admin123` | Low | Poor | Fine for 2-10 devices |
| **B. Manual HiveMQ credentials** — Create per device in HiveMQ console | Low | Good | Manual, max ~50 |
| **C. EMQX Cloud** — Switch to EMQX Cloud with HTTP Auth Plugin | Medium | Excellent | Unlimited |
| **D. Self-host EMQX on Railway** — Run EMQX container with webhook auth | High | Excellent | Unlimited |
| **E. HiveMQ Dedicated** — Supports REST API + extensions | Low code | Excellent | Unlimited, expensive |

### Recommendation

**For now (2-3 devices): Option A** — All devices connect with `admin`/`Admin123`. The topic structure (`device/{licenseKey}/...`) still provides logical separation. No device can impersonate another because the backend processes telemetry by license_key.

**When scaling (10+ devices): Switch to Option C** — EMQX Cloud supports HTTP Auth Plugin. Your existing `/api/v1/emqx/auth` and `/acl` endpoints will work without changes. Cost: ~$15/month for 1000 connections.

### What This Means for Firmware

The firmware's provisioning flow remains intact but the MQTT credentials it receives via `/provision/{license_key}` will be **ignored by HiveMQ Cloud**. Instead:

```
Updated flow for HiveMQ Cloud:
  1. Device still polls GET /provision/{license_key}
  2. Backend returns mqtt_host, mqtt_port, and status "ready"
  3. Device connects to HiveMQ with HARDCODED admin/Admin123 credentials
  4. mqtt_password from provisioning stored in EEPROM but not used for auth
  5. License key used as MQTT client ID (provides uniqueness)
```

The provisioning endpoint still controls WHEN a device can switch to MQTT mode (only after admin approval). So the flow remains meaningful — it's just the password validation at the broker that's missing.

---

## 3. COMPLETE CHANGE LIST

### 3.1 configuration.h Changes

```
BEFORE                                          AFTER
────────────────────────────────────────        ────────────────────────────────────────
WiFiClient mqttWifiClient;                      WiFiClientSecure mqttWifiClient;
                                                 + #include <WiFiClientSecure.h>

mqttBrokerHost = "192.168.29.236"               mqttBrokerHost = "f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud"
mqttBrokerPort = 1883                           mqttBrokerPort = 8883

apiBaseURL = "http://192.168.29.236:3800..."    apiBaseURL = "https://protective-enjoyment-production-2320.up.railway.app/api/v1"

FIRMWARE_VERSION = "1.0.0"                      FIRMWARE_VERSION = "4.0.0"
```

### 3.2 mqttClient.ino Changes

```
1. Replace WiFiClient → WiFiClientSecure (already in configuration.h)
2. Add mqttWifiClient.setInsecure() in setupMQTT() (skip cert pinning)
3. Add PubSubClient keepAlive (setKeepAlive(60))
4. Use hardcoded MQTT username/password for HiveMQ Cloud
5. Add SHA256 checksum validation to handleOTA()
6. Disconnect MQTT before OTA download (free memory for TLS)
7. Add QoS 1 for telemetry publish (ensure delivery)
```

### 3.3 sendingJsonRequest.ino Changes

```
1. Replace WiFiClient → WiFiClientSecure for all HTTP calls
2. Add client.setInsecure() for HTTPS (Railway uses Let's Encrypt)
3. Update HTTP headers if needed
```

### 3.4 main.ino Changes

```
1. REMOVE EEPROM.commit() from end of loop() ← CRITICAL (prevents flash wear)
2. Add NTP time sync after WiFi connects
3. Add free heap monitoring with warning at < 20KB
```

---

## 4. EEPROM LAYOUT CHANGES

**NO changes needed.** The existing 512-byte layout is sufficient. The MQTT password area (addr 39-102) will still store the provisioned password even though HiveMQ doesn't validate it — this is fine for future migration to EMQX Cloud.

---

## 5. FUTURE ISSUES & RISKS

### TIER 1: WILL DEFINITELY CAUSE PROBLEMS (Fix Now)

#### 5.1 EEPROM Flash Wear — URGENT

**What:** `EEPROM.commit()` is called EVERY loop iteration (line 196, main.ino). ESP32 flash has 10K-100K write cycles. At 30s sensor intervals + relay state writes in `checkForRelay()`, that's ~2,880 writes/day = potentially dead flash in **35-350 days**.

**Why it matters:** Dead EEPROM = device loses all config on reboot = device brick.

**Fix:** Only call `EEPROM.commit()` when values actually change. Add a dirty flag.

---

#### 5.2 Dual TLS Connections Exhaust RAM

**What:** ESP32 WROOM has 320KB SRAM. WiFiClientSecure uses ~40-45KB per TLS session. If MQTT TLS is active AND OTA tries to download via HTTPS simultaneously, that's ~90KB just for TLS = likely crash.

**Why it matters:** OTA update will fail or crash the device.

**Fix:** Disconnect MQTT before starting OTA download. Reconnect after OTA success or failure.

---

#### 5.3 MQTT Auth Not Enforced by HiveMQ Cloud

**What:** See Section 2 above. Per-device passwords generated by the backend are never validated by HiveMQ Cloud.

**Why it matters:** Any MQTT client knowing the shared credentials can publish to any device's topic. For 2-3 devices on a private farm this is acceptable. For commercial deployment it's a security gap.

**Fix (later):** Migrate to EMQX Cloud with HTTP Auth Plugin when scaling.

---

#### 5.4 Backend + Firmware Relay Conflict

**What:** Both firmware (`checkForRelay()`) AND backend (`relay_automation.py`) evaluate thresholds and control relays independently. When a device is in MQTT mode with AUTO relay configs on the backend:

1. Firmware reads sensor → threshold exceeded → toggles relay locally
2. Backend receives telemetry → evaluates same threshold → sends MQTT command → toggles relay

This creates **relay chatter** — the relay toggles twice in quick succession.

**Why it matters:** Relay clicking on/off rapidly damages the relay contacts and connected equipment (compressors, humidifiers, fans).

**Fix:** When device is in MQTT mode, firmware should ONLY control relays via MQTT commands. Disable local `checkForRelay()` for the 3 threshold relays (CO2, Humidity, Temperature) when `mqttProvisioned == true`. Backend takes full control in MQTT mode.

---

### TIER 2: WILL CAUSE PROBLEMS UNDER LOAD (Fix Before Scaling)

#### 5.5 String Concatenation Heap Fragmentation

**What:** `publishTelemetry()` and `sendHTTPRequest()` build large JSON strings using `String +=` concatenation. Arduino's String class allocates/frees heap memory for each concatenation, causing fragmentation over time.

**Why it matters:** Free heap gradually decreases until `malloc()` fails → crash/watchdog reset. Typically manifests after 24-72 hours of continuous operation.

**Symptoms:** `free_heap` in telemetry data trends downward over days.

**Fix:** Use `snprintf()` with a pre-allocated char buffer instead of String concatenation. Or use ArduinoJson's `serializeJson()` which manages memory properly.

---

#### 5.6 WiFi Reconnect Blocks Everything

**What:** `reconnectWiFi()` blocks for up to 30 seconds. During this time:
- No sensor reading
- No relay threshold checking
- No LCD updates
- No MQTT message processing

**Why it matters:** If CO2 spikes during a WiFi reconnect, the relay won't activate for 30 seconds. For mushroom farming, CO2 levels above 2000 PPM can damage crops.

**Fix:** Non-blocking WiFi reconnect using a state machine. Read sensors and check relays while WiFi reconnects in background.

---

#### 5.7 No NTP Time Sync

**What:** Firmware has no real-time clock or NTP. It uses `millis()` (uptime counter). The backend schedules (SCHEDULE relay mode) are time-based but evaluated server-side.

**Why it matters:** If you ever need firmware-side scheduling or time-stamped logs, there's no reliable clock. Also, TLS certificate validation (if enabled later) requires accurate time.

**Fix:** Add NTP sync after WiFi connection. Use `configTime()` from ESP32 Arduino core.

---

#### 5.8 No Watchdog Reset on Hard Hang

**What:** If the firmware enters an infinite loop (e.g., `while(true){}` on invalid key — line 163 in loop, or `while(digitalRead(BUTTON))` in initializeDevices), the device is permanently stuck until power cycle.

**Why it matters:** A remote device that hangs is completely unrecoverable without physical access.

**Fix:** Enable the ESP32 Task Watchdog Timer (TWDT). If the main loop doesn't feed the watchdog within 30 seconds, the device auto-reboots.

---

#### 5.9 PubSubClient QoS 0 for Telemetry

**What:** `mqttClient.publish()` defaults to QoS 0 (fire and forget). If the MQTT message is lost (WiFi hiccup, broker busy), the reading is gone forever.

**Why it matters:** Gaps in sensor data. The dashboard shows missing readings. Reports have holes.

**Fix:** Use QoS 1 for telemetry (at least once delivery). PubSubClient supports it: `mqttClient.publish(topic, payload, true)` for retained, or pass QoS parameter.

---

#### 5.10 Neon Database Cold Start

**What:** Neon PostgreSQL free tier auto-suspends after 5 minutes of inactivity. First query after suspension takes 500ms-2s for cold start.

**Why it matters:** First telemetry from a device after a quiet period may time out or fail to process. The backend MQTT handler has no retry — the reading is lost.

**Fix (backend):** Add a retry mechanism in `_handle_telemetry()` for database errors. Or configure Neon to never suspend (paid feature).

---

#### 5.11 Upstash Redis Free Tier Limits

**What:** Upstash free tier: 10,000 commands/day. Each telemetry reading uses ~3-5 Redis commands (store live data, check relay states, TTL operations).

**Why it matters:** 2 devices × 2 reads/min × 60 min × 24 hrs × 4 commands = 23,040 commands/day. **Already over the limit with just 2 devices.**

**Fix:** Upgrade Upstash to Pay-as-you-go ($0.2/100K commands) or reduce Redis usage (batch operations, longer TTLs).

---

### TIER 3: GOOD TO KNOW (Fix Eventually)

#### 5.12 OTA Download Has No Resume

**What:** If OTA download is interrupted at 80%, the entire download must restart. Large firmware (~1.5MB) over cellular/weak WiFi could repeatedly fail.

**Fix:** Not practical on ESP32 with current libraries. Ensure strong WiFi before triggering OTA.

---

#### 5.13 EEPROM Password Stored in Plaintext

**What:** The MQTT device password is stored as plaintext in EEPROM (addr 39-102). Anyone with physical access to the ESP32 can read it with a simple sketch.

**Fix:** Acceptable for farm environment. If concerned, use ESP32's eFuse-based secure boot + flash encryption.

---

#### 5.14 No Firmware Rollback Notification

**What:** If new firmware fails validation (doesn't call `esp_ota_mark_app_valid_cancel_rollback()` within 60s), the bootloader rolls back. But the backend doesn't know this happened — it still shows the new version.

**Fix:** After boot, firmware should report its actual running version via telemetry. Backend should compare expected vs actual version and flag mismatches.

---

#### 5.15 HiveMQ Cloud Free Tier Limits

**What:** HiveMQ Cloud Serverless free tier allows 100 simultaneous connections and 10 GB traffic/month. Backend is 1 connection. Each ESP32 is 1 connection.

**Fix:** Sufficient for ~98 devices. Monitor connection count.

---

#### 5.16 Cookie `secure=False` in Production

**What:** Backend sets auth cookies with `secure=False`. This means cookies are sent over both HTTP and HTTPS. On Railway (HTTPS), this technically works but is a security weakness.

**Fix:** Set `secure=True` in production. Requires ensuring ALL access is via HTTPS.

---

#### 5.17 DEVICE_ENCRYPTION_KEY is Placeholder

**What:** `backend/.env.production` has `DEVICE_ENCRYPTION_KEY=change-me-32-byte-base64-key-pad=`. This is the key used to encrypt/decrypt device passwords in the database. If it's still the placeholder, it's insecure.

**Fix:** Generate a proper key: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and update `.env.production`.

---

#### 5.18 CORS Missing Dashboard Domain

**What:** Current CORS origins in production: `https://mushroomkimandi.com,http://localhost:3801`. Missing `https://dashboard.mushroomkimandi.com`.

**Fix:** Add dashboard domain to `CORS_ORIGINS` in `.env.production`.

---

#### 5.19 No Rate Limiting on Login (Production)

**What:** Rate limiter was removed because it depended on Redis. Login endpoint is now unprotected against brute force in production.

**Fix:** Implement IP-based rate limiting using Railway's edge layer, or a simple in-memory counter.

---

#### 5.20 Legacy Hardcoded WiFi Credentials

**What:** `eepromConfig.ino` line 84 hardcodes `Jas_Mehar`/`airtel2730` for legacy WiFi migration. This is your personal WiFi.

**Fix:** Remove the hardcoded credentials in production firmware. Force captive portal for WiFi setup.

---

## 6. MITIGATION PLAN FOR EACH RISK

### Must Fix in v4.0.0 (This Update)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 5.1 | EEPROM wear | Dirty flag, commit only on change | 30 min |
| 5.2 | Dual TLS RAM | Disconnect MQTT before OTA | 15 min |
| 5.3 | MQTT auth | Use shared admin/Admin123 for now | 10 min |
| 5.4 | Relay conflict | Skip local checkForRelay in MQTT mode | 20 min |
| 5.5 | Heap fragmentation | Use ArduinoJson serialization | 45 min |
| 5.7 | No NTP | Add configTime() after WiFi | 10 min |
| 5.9 | QoS 0 | Switch telemetry to QoS 1 | 5 min |
| 5.17 | Encryption key | Generate proper Fernet key | 5 min |
| 5.18 | CORS | Add dashboard domain | 2 min |
| 5.20 | Hardcoded WiFi | Remove from eepromConfig.ino | 5 min |

### Fix Before Scaling (10+ Devices)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 5.3 | MQTT auth | Migrate to EMQX Cloud | 4 hours |
| 5.6 | WiFi blocking | Non-blocking reconnect state machine | 2 hours |
| 5.8 | No watchdog | Enable TWDT | 30 min |
| 5.10 | Neon cold start | Upgrade Neon or add retry | 1 hour |
| 5.11 | Redis limits | Upgrade Upstash plan | 10 min |
| 5.16 | Cookie secure | Set secure=True | 5 min |
| 5.19 | Rate limiting | In-memory limiter | 1 hour |

### Fix Eventually

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 5.12 | OTA no resume | Accept limitation | — |
| 5.13 | EEPROM plaintext | ESP32 flash encryption | 4 hours |
| 5.14 | Rollback notification | Version check in telemetry | 30 min |
| 5.15 | HiveMQ limits | Monitor, upgrade when needed | — |

---

## 7. TESTING CHECKLIST

### Before Flashing v4.0.0

- [ ] Build succeeds in PlatformIO (no compilation errors)
- [ ] Flash size fits in partition (< 1.875 MB)
- [ ] Free heap after boot > 80KB (check Serial monitor)

### After Flashing (Per Device)

- [ ] Device boots and shows firmware v4.0.0 on Serial
- [ ] WiFi connects to saved SSID (or captive portal if new device)
- [ ] NTP time syncs (check Serial for time output)
- [ ] HTTP mode: Device registers with Railway backend via HTTPS
- [ ] HTTP mode: Sensor readings POST successfully (HTTP 200)
- [ ] HTTP mode: Provision polling works (GET /provision/{key})
- [ ] MQTT mode: TLS connection to HiveMQ Cloud succeeds
- [ ] MQTT mode: Telemetry appears on dashboard (check WebSocket)
- [ ] MQTT mode: Relay commands from dashboard reach device
- [ ] MQTT mode: Config sync updates thresholds on device
- [ ] MQTT mode: Kill-switch disables/enables device
- [ ] OTA: Trigger test OTA update via MQTT /ota topic
- [ ] OTA: Verify new firmware boots and validates
- [ ] OTA: Verify rollback works (flash bad firmware, confirm revert)
- [ ] Relay: All 7 relays toggle correctly from dashboard
- [ ] Relay: AUTO mode — only backend controls (no local hysteresis in MQTT mode)
- [ ] EEPROM: Power cycle device — all settings persist
- [ ] WiFi resilience: Disconnect router, verify device recovers
- [ ] Long-running: Monitor free_heap over 24 hours (should be stable)

### Backend Verification

- [ ] CORS includes dashboard.mushroomkimandi.com
- [ ] DEVICE_ENCRYPTION_KEY is not placeholder
- [ ] Backend MQTT connects to HiveMQ Cloud (check Railway logs)
- [ ] Telemetry from device processed → readings appear in DB
- [ ] Relay commands published → device responds
- [ ] WebSocket pushes sensor data to dashboard

---

## 8. ROLLBACK PLAN

### If v4.0.0 Fails

1. **Dual OTA auto-rollback**: If new firmware crashes within 60s (before `esp_ota_mark_app_valid_cancel_rollback()`), the bootloader automatically reverts to v1.0.0 on the other partition.

2. **Manual rollback via USB**: Flash v1.0.0 directly via PlatformIO USB upload. The old partition with v1.0.0 is still intact.

3. **ElegantOTA web rollback**: Navigate to `http://{device_ip}/update` and upload v1.0.0 binary via browser.

4. **Backend stays backward compatible**: The backend still supports HTTP mode. If firmware reverts to v1.0.0 (HTTP-only), it continues working with local broker URLs (won't reach production, but won't crash). The provision endpoint always returns the current MQTT config.

### What to Keep in Mind

- v1.0.0 points to local IPs (192.168.29.236) — it won't reach production backend
- If you need to rollback AND keep production connectivity, you'd need a v3.5.0 with production URLs but no TLS (HTTP only) — this isn't possible since Railway forces HTTPS
- **Bottom line: once we go to production URLs, there's no going back to HTTP-only mode.** The rollback partition should ideally also have v4.0.0 (or at least production URLs).

### Safe Deployment Strategy

1. Flash v4.0.0 on **ESP32-Sensor-02 first** (test device)
2. Monitor for 24 hours — check heap, connectivity, relay behavior
3. If stable, flash **ESP32-Sensor-01** (primary device)
4. Keep USB cable accessible for both devices for first week

---

## APPENDIX: PRODUCTION CREDENTIALS REFERENCE

| Service | Host | Port | Username | Password |
|---------|------|------|----------|----------|
| HiveMQ Cloud | f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud | 8883 | admin | Admin123 |
| Railway Backend | protective-enjoyment-production-2320.up.railway.app | 443 | — | — |
| Neon PostgreSQL | ep-wispy-bread-ahepiky3-pooler.c-3.us-east-1.aws.neon.tech | 5432 | neondb_owner | (in .env.production) |
| Upstash Redis | closing-bee-67960.upstash.io | 6379 | default | (in .env.production) |
| Dashboard | dashboard.mushroomkimandi.com | 443 | admin | admin123 |

---

## APPENDIX: ESP32 MEMORY BUDGET

| Component | RAM Usage (approx) |
|-----------|-------------------|
| FreeRTOS + Arduino core | 50 KB |
| WiFi stack | 40 KB |
| WiFiClientSecure (1 TLS session) | 45 KB |
| PubSubClient buffer (1024 bytes) | 1 KB |
| AsyncWebServer | 15 KB |
| EEPROM buffer (512 bytes) | 0.5 KB |
| LCD + I2C drivers | 5 KB |
| Sensor libraries (SCD41, DS18B20, DHT) | 10 KB |
| ArduinoJson documents | 3 KB |
| String objects + stack | 20 KB |
| **TOTAL USED** | **~190 KB** |
| **ESP32 SRAM** | **320 KB** |
| **FREE** | **~130 KB** |
| **During OTA (2nd TLS)** | **~85 KB free** |

Tight but workable. Must disconnect MQTT TLS before OTA download.

---

*This document should be reviewed before implementation and updated as issues are resolved.*
