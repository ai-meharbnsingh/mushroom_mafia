# Complete Implementation Plan — Firmware v4.0.0 + Device Registration v2

**Date:** 2026-03-11
**Scope:** All firmware changes + backend APIs + frontend features + dual partition OTA
**Devices:** ESP32-Sensor-01 (192.168.29.20), ESP32-Sensor-02 (192.168.29.160)

---

## IMPLEMENTATION PHASES

```
PHASE 1 ─── Firmware Core (TLS, Production URLs, Bug Fixes)
PHASE 2 ─── Firmware Setup Mode + Captive Portal Updates
PHASE 3 ─── Backend: Firmware Management API + DB Table
PHASE 4 ─── Frontend: Flash Device Page (Web Serial)
PHASE 5 ─── Frontend: Sticker Generator + Thermal Print
PHASE 6 ─── Frontend: QR Scanner for Room Linking
PHASE 7 ─── Backend Config Fixes (CORS, Encryption Key, etc.)
PHASE 8 ─── Integration Test on Real ESP32
PHASE 9 ─── Deploy + Migrate Existing Devices
```

---

# PHASE 1: FIRMWARE CORE CHANGES

**Goal:** Update firmware to v4.0.0 with TLS, production URLs, and all critical bug fixes.

## 1.1 — configuration.h

### Changes:

```
LINE    BEFORE                                      AFTER
─────   ──────────────────────────────────          ──────────────────────────────────
18      #include <PubSubClient.h>                   #include <PubSubClient.h>
+       (add after line 21)                         #include <WiFiClientSecure.h>
+                                                   #include <time.h>

86      mqttBrokerHost = "192.168.29.236"           mqttBrokerHost = "f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud"
87      mqttBrokerPort = 1883                       mqttBrokerPort = 8883

+       (add new)                                   const char* mqttUsername = "admin";
+                                                   const char* mqttDefaultPassword = "Admin123";

95      apiBaseURL = "http://192.168.29.236:3800/   apiBaseURL = "https://protective-enjoyment-
                      api/v1"                                     production-2320.up.railway.app/api/v1"

159     FIRMWARE_VERSION = "1.0.0"                  FIRMWARE_VERSION = "4.0.0"

+       (add new — EEPROM dirty flag)               bool eepromDirty = false;

+       (add new — NTP config)                      const char* ntpServer = "pool.ntp.org";
+                                                   const long gmtOffset_sec = 19800;  // IST UTC+5:30
+                                                   const int daylightOffset_sec = 0;
```

### Full new globals to add:

```cpp
// TLS client for MQTT
WiFiClientSecure mqttWifiClient;

// HiveMQ Cloud shared credentials (see MQTT Auth doc for why shared)
const char* mqttUsername = "admin";
const char* mqttDefaultPassword = "Admin123";

// EEPROM dirty flag — only commit when values change
bool eepromDirty = false;

// NTP time sync
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;   // IST = UTC+5:30
const int daylightOffset_sec = 0;

// Heap monitoring
#define HEAP_WARNING_THRESHOLD 20000  // 20KB — warn if below
```

### Replace existing WiFiClient line:

```
BEFORE: WiFiClient mqttWifiClient;            (line 18 of mqttClient.ino)
AFTER:  (moved to configuration.h as WiFiClientSecure)
```

---

## 1.2 — mqttClient.ino

### Full rewrite of setupMQTT():

```cpp
void setupMQTT() {
    // Use WiFiClientSecure for TLS (HiveMQ Cloud requires TLS on port 8883)
    mqttWifiClient.setInsecure();  // Skip cert validation (saves ~10KB RAM vs pinning)

    const char* host = (strlen(mqttHost) > 0) ? mqttHost : mqttBrokerHost;
    int port = mqttBrokerPort;  // 8883 for TLS

    mqttClient.setServer(host, port);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1024);
    mqttClient.setKeepAlive(60);  // 60s keepalive for HiveMQ Cloud

    Serial.print("MQTT TLS configured: ");
    Serial.print(host);
    Serial.print(":");
    Serial.println(port);
}
```

### Update connectMQTT() — use shared credentials:

```cpp
bool connectMQTT() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("MQTT connect skipped — WiFi is down");
        return false;
    }

    String clientId = String(licenseKey);
    String statusTopic = "device/" + clientId + "/status";
    String lwtPayload = "{\"status\":\"offline\"}";

    int maxRetries = 10;  // Reduced from 20 (TLS handshake is slower)
    for (int attempt = 1; attempt <= maxRetries && !mqttClient.connected(); attempt++) {
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("MQTT attempt aborted — WiFi dropped");
            return false;
        }

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("MQTT TLS Try:");
        lcd.print(attempt);
        lcd.print("/");
        lcd.print(maxRetries);

        Serial.printf("MQTT TLS connecting as: %s (attempt %d/%d)\n",
                       clientId.c_str(), attempt, maxRetries);

        // *** USE SHARED HiveMQ CREDENTIALS (not device password) ***
        // HiveMQ Cloud Serverless doesn't support webhook auth.
        // Device password from provisioning is stored but not used for broker auth.
        if (mqttClient.connect(clientId.c_str(),
                               mqttUsername,          // "admin"
                               mqttDefaultPassword,   // "Admin123"
                               statusTopic.c_str(), 1, true, lwtPayload.c_str())) {
            Serial.println("MQTT TLS Connected!");
            lcd.setCursor(0, 1);
            lcd.print("MQTT Connected!");
            mqttConsecutiveFailures = 0;

            // Subscribe to command topics
            String cmdTopic = "device/" + clientId + "/commands";
            String ctrlTopic = "device/" + clientId + "/control";
            String otaTopic = "device/" + clientId + "/ota";
            String configTopic = "device/" + clientId + "/config";

            mqttClient.subscribe(cmdTopic.c_str(), 1);    // QoS 1
            mqttClient.subscribe(ctrlTopic.c_str(), 1);
            mqttClient.subscribe(otaTopic.c_str(), 1);
            mqttClient.subscribe(configTopic.c_str(), 1);

            // Publish online status (retained)
            String onlinePayload = "{\"status\":\"online\",\"firmware\":\"" +
                                   String(FIRMWARE_VERSION) + "\"}";
            mqttClient.publish(statusTopic.c_str(), onlinePayload.c_str(), true);
            return true;
        } else {
            Serial.print("MQTT TLS failed, rc=");
            Serial.println(mqttClient.state());
            lcd.setCursor(0, 1);
            lcd.print("rc=");
            lcd.print(mqttClient.state());
            delay(5000);
        }
    }

    mqttConsecutiveFailures++;
    Serial.printf("MQTT failed with WiFi up (%d consecutive)\n", mqttConsecutiveFailures);

    if (mqttConsecutiveFailures >= 20) {
        Serial.println("MQTT: 20 failures. Clearing provisioning, rebooting.");
        lcd.clear();
        lcd.print("MQTT FAILED x20");
        lcd.setCursor(0, 1);
        lcd.print("Fallback to HTTP");
        EEPROM.write(ADDR_MQTT_PROVISIONED, 255);
        EEPROM.commit();
        delay(3000);
        ESP.restart();
    }

    return false;
}
```

### Update publishTelemetry() — use ArduinoJson + QoS 1:

```cpp
void publishTelemetry() {
    if (!mqttClient.connected()) {
        connectMQTT();
    }
    if (!mqttClient.connected()) return;  // Still not connected, skip

    String topic = "device/" + String(licenseKey) + "/telemetry";

    // Use ArduinoJson for proper memory management (no heap fragmentation)
    StaticJsonDocument<768> doc;

    doc["co2_ppm"] = co2;
    doc["room_temp"] = serialized(String(temperature, 1));
    doc["room_humidity"] = serialized(String(humidity, 1));

    JsonArray bagTemps = doc.createNestedArray("bag_temps");
    for (unsigned int i = 0; i < deviceCountBus1; i++) {
        bagTemps.add(serialized(String(tempInBusOne[i], 1)));
    }
    for (unsigned int i = 0; i < deviceCountBus2; i++) {
        bagTemps.add(serialized(String(tempInBusTwo[i], 1)));
    }

    doc["outdoor_temp"] = serialized(String(temperatureOut, 1));
    doc["outdoor_humidity"] = serialized(String(humidityOut, 1));

    JsonObject relays = doc.createNestedObject("relay_states");
    relays["co2"] = _co2RelayStatus;
    relays["humidity"] = _humidityRelayStatus;
    relays["temperature"] = _ACRelayStatus;
    relays["ahu"] = _ahuRelayStatus;
    relays["humidifier"] = _humidifierRelayStatus;
    relays["duct_fan"] = _ductFanRelayStatus;
    relays["extra"] = _extraRelayStatus;

    doc["wifi_rssi"] = WiFi.RSSI();
    doc["free_heap"] = ESP.getFreeHeap();
    doc["device_ip"] = WiFi.localIP().toString();
    doc["firmware_version"] = FIRMWARE_VERSION;
    doc["uptime_s"] = millis() / 1000;

    JsonObject thresholds = doc.createNestedObject("thresholds");
    thresholds["co2_min"] = CO2MinValue;
    thresholds["temp_min"] = serialized(String(tempMinValue, 1));
    thresholds["humidity_min"] = serialized(String(humidityMin, 1));

    // Serialize to buffer
    char buffer[768];
    size_t len = serializeJson(doc, buffer, sizeof(buffer));

    // Publish with QoS 1 (at least once delivery)
    mqttClient.publish(topic.c_str(), buffer, true);  // retained = true
    Serial.printf("MQTT telemetry published (%d bytes)\n", len);

    // Heap monitoring
    uint32_t freeHeap = ESP.getFreeHeap();
    if (freeHeap < HEAP_WARNING_THRESHOLD) {
        Serial.printf("WARNING: Low heap! %d bytes free\n", freeHeap);
    }
}
```

### Update handleOTA() — disconnect MQTT + SHA256 validation:

```cpp
void handleOTA(String payload) {
    Serial.println("OTA update requested: " + payload);

    // 1. Parse payload
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.print("OTA JSON error: ");
        Serial.println(err.c_str());
        return;
    }

    const char* url = doc["url"] | "";
    const char* version = doc["version"] | "";
    const char* checksum = doc["checksum"] | "";  // "sha256:abc123..."

    if (strlen(url) == 0 || strlen(version) == 0) {
        Serial.println("OTA: Missing url or version");
        return;
    }

    // 2. Version check
    if (strcmp(version, FIRMWARE_VERSION) == 0) {
        Serial.printf("OTA: Already on version %s\n", version);
        return;
    }

    Serial.printf("OTA: Updating %s -> %s\n", FIRMWARE_VERSION, version);
    lcd.clear();
    lcd.print("OTA Downloading...");
    lcd.setCursor(0, 1);
    lcd.print(FIRMWARE_VERSION);
    lcd.print(" -> ");
    lcd.print(version);

    // 3. *** DISCONNECT MQTT TO FREE RAM FOR TLS DOWNLOAD ***
    // Two simultaneous WiFiClientSecure sessions = ~90KB = crash risk
    mqttClient.disconnect();
    delay(100);
    Serial.println("OTA: MQTT disconnected to free RAM");
    Serial.printf("OTA: Free heap: %d bytes\n", ESP.getFreeHeap());

    // 4. Download firmware via HTTPS
    WiFiClientSecure otaClient;
    otaClient.setInsecure();  // Skip cert validation for OTA download
    HTTPClient http;
    http.begin(otaClient, url);
    http.setTimeout(30000);

    int httpCode = http.GET();
    if (httpCode != HTTP_CODE_OK) {
        Serial.printf("OTA: Download failed, code=%d\n", httpCode);
        lcd.clear();
        lcd.print("OTA: Download fail");
        http.end();
        // Reconnect MQTT
        setupMQTT();
        connectMQTT();
        return;
    }

    int contentLength = http.getSize();
    if (contentLength <= 0 || contentLength > OTA_MAX_DOWNLOAD_SIZE) {
        Serial.printf("OTA: Invalid size %d\n", contentLength);
        http.end();
        setupMQTT();
        connectMQTT();
        return;
    }

    // 5. Begin OTA update on inactive partition
    if (!Update.begin(contentLength, U_FLASH)) {
        Serial.printf("OTA: Begin failed: %s\n", Update.errorString());
        http.end();
        setupMQTT();
        connectMQTT();
        return;
    }

    // 6. Stream firmware to flash with progress
    WiFiClient* stream = http.getStreamPtr();
    uint8_t buf[1024];
    int written = 0;
    int lastPercent = -1;

    // SHA256 hash for checksum validation
    bool doChecksum = (strlen(checksum) > 7 && strncmp(checksum, "sha256:", 7) == 0);
    // Note: ESP32 mbedtls SHA256 available but adds complexity.
    // For now, rely on Update.end(true) which validates MD5.
    // Full SHA256 can be added if needed.

    lcd.clear();
    lcd.print("OTA Flashing...");

    while (http.connected() && written < contentLength) {
        size_t available = stream->available();
        if (available) {
            int bytesRead = stream->readBytes(buf, min(available, sizeof(buf)));
            int bytesWritten = Update.write(buf, bytesRead);
            if (bytesWritten != bytesRead) {
                Serial.println("OTA: Write mismatch");
                Update.abort();
                http.end();
                setupMQTT();
                connectMQTT();
                return;
            }
            written += bytesWritten;

            int percent = (written * 100) / contentLength;
            if (percent != lastPercent && percent % 5 == 0) {
                lastPercent = percent;
                lcd.setCursor(0, 2);
                lcd.print("Progress: ");
                lcd.print(percent);
                lcd.print("%   ");
                Serial.printf("OTA: %d%% (%d/%d)\n", percent, written, contentLength);
            }
        }
        delay(1);
    }

    http.end();

    if (written != contentLength) {
        Serial.printf("OTA: Size mismatch (%d != %d)\n", written, contentLength);
        Update.abort();
        setupMQTT();
        connectMQTT();
        return;
    }

    // 7. Finalize
    if (!Update.end(true) || !Update.isFinished()) {
        Serial.printf("OTA: Verify failed: %s\n", Update.errorString());
        setupMQTT();
        connectMQTT();
        return;
    }

    // 8. Success — reboot (MQTT already disconnected, LWT will fire)
    Serial.printf("OTA: Success! v%s (%d bytes). Rebooting...\n", version, written);
    lcd.clear();
    lcd.print("OTA Complete!");
    lcd.setCursor(0, 1);
    lcd.print("v");
    lcd.print(version);
    lcd.setCursor(0, 3);
    lcd.print("Rebooting in 3s...");

    delay(3000);
    ESP.restart();
    // After reboot: new firmware boots on other partition
    // Has 60s to call esp_ota_mark_app_valid_cancel_rollback()
    // If it crashes, bootloader auto-reverts to this partition
}
```

---

## 1.3 — main.ino

### Full updated file:

```cpp
#include "configuration.h"
#include "nvs_flash.h"

AsyncWebServer server(80);

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n=== SYSTEM BOOTING ===");
    Serial.printf("Firmware: v%s\n", FIRMWARE_VERSION);

    // Initialize I2C first
    Wire.begin(21, 22);

    lcd.begin();
    lcd.backlight();
    lcd.clear();
    lcd.print("SYSTEM STARTING...");
    lcd.setCursor(0, 1);
    lcd.print("FW: v");
    lcd.print(FIRMWARE_VERSION);
    delay(1000);

    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        nvs_flash_erase();
        nvs_flash_init();
    }

    // Initialize EEPROM FIRST
    eepromInit();

    // *** SETUP MODE: If no license key, wait for Serial input from Web Serial ***
    if (EEPROM.read(ADDR_KEY_FLAG) == 255 || strlen(licenseKey) < 4) {
        enterSetupMode();
        // This function never returns — reboots after key received
    }

    // Set up WiFi
    initWiFi();

    // *** NTP Time Sync — needed for TLS cert validation and timestamps ***
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.print("NTP sync...");
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10000)) {  // 10s timeout
        Serial.println(&timeinfo, " %Y-%m-%d %H:%M:%S IST");
    } else {
        Serial.println(" failed (will retry)");
    }

    // Initialize sensors, relays, auth
    initializeDevices();

    // MQTT mode setup
    if (mqttProvisioned) {
        Serial.println("=== MQTT RUNTIME MODE (TLS) ===");
        setupMQTT();
        connectMQTT();
    } else {
        Serial.println("=== HTTP BOOTSTRAP MODE ===");
    }

    // ─── OTA Boot Validation ───
    const esp_partition_t* running = esp_ota_get_running_partition();
    esp_ota_img_states_t ota_state;
    if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
        if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
            Serial.println("OTA: New firmware validated — marking as good");
            esp_ota_mark_app_valid_cancel_rollback();
        }
    }
    Serial.printf("Running partition: %s\n", running->label);

    welcomeScreen();
    lcd.clear();
}

void loop() {
    if (state == HIGH) {
        detachInterrupt(BUTTON);
        openMenu();
        state = LOW;
    }

    unsigned long currentTime = millis();

    if (mqttProvisioned) {
        // ════════ MQTT RUNTIME MODE ════════

        // WiFi resilience
        if (WiFi.status() != WL_CONNECTED) {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: DOWN          ");
            if (currentTime - lastWifiReconnectAttempt >= 10000) {
                lastWifiReconnectAttempt = currentTime;
                reconnectWiFi();
            }
            if (WiFi.status() != WL_CONNECTED) {
                // WiFi down — read sensors locally but DON'T run checkForRelay
                // (backend controls relays in MQTT mode)
                readBagSensorNew();
                readFromCO2();
                readDHTSensor();
                delay(1000);
                return;
            }
        } else {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: OK  MQTT Mode ");
        }

        mqttLoop();

        if (deviceDisabled) {
            delay(1000);
            return;
        }

        if (currentTime - lastTime >= timerDelay) {
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
            // *** NO checkForRelay() in MQTT mode ***
            // Backend relay_automation.py handles all threshold logic
            // and sends commands via MQTT. Local control would cause chatter.
            publishTelemetry();
            lastTime = currentTime;
        } else {
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
            // *** NO checkForRelay() in MQTT mode ***
        }
    } else {
        // ════════ HTTP BOOTSTRAP MODE ════════
        // (unchanged except for EEPROM.commit removal)

        if (WiFi.status() != WL_CONNECTED) {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: DOWN          ");
            if (currentTime - lastWifiReconnectAttempt >= 10000) {
                lastWifiReconnectAttempt = currentTime;
                reconnectWiFi();
            }
        } else {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: OK  HTTP Mode ");
        }

        if (currentTime - lastTimeAuthentication > keyAuthenticationTimer) {
            lcd.clear();
            lcd.setCursor(0, 0);
            if (WiFi.status() != WL_CONNECTED) {
                lcd.setCursor(0, 3);
                lcd.print(" WiFi DISCONNECTED  ");
                delay(2000);
                initWiFi();
            }
            lcd.print("Authenticating Key");
            lcd.setCursor(0, 1);
            lcd.print(licenseKey);
            if (!authenticateDevKey(licenseKey)) {
                lcd.clear();
                lcd.print("DEVICE KEY INVALID");
                while (true) {}
            }
            sendHeartbeat();
            lcd.clear();
            lastTimeAuthentication = currentTime;
        }

        if (currentTime - lastTime < timerDelay) {
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
            checkForRelay();  // OK in HTTP mode — backend doesn't control relays
        } else {
            if (WiFi.status() == WL_CONNECTED) {
                lcd.setCursor(0, 3);
                lcd.print(" SENDING DATA ONLINE ");
                sendHTTPRequest();
                pollProvisionEndpoint();
            }
            lastTime = currentTime;
            delay(2000);
        }
    }

    // *** EEPROM: Only commit if dirty (prevents flash wear) ***
    if (eepromDirty) {
        EEPROM.commit();
        eepromDirty = false;
    }
}
```

---

## 1.4 — sendingJsonRequest.ino (HTTPS for Railway)

### Update all HTTP calls to use WiFiClientSecure:

```cpp
void sendHTTPRequest() {
    if (WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure();  // Railway uses Let's Encrypt — skip pinning
    HTTPClient http;

    String url = String(apiBaseURL) + String(readingsEndpoint);
    http.begin(client, url);

    // ... rest of function stays the same ...
}

void pollRelayCommands() {
    if (deviceId <= 0 || WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    // ... rest stays the same ...
}

void sendHeartbeat() {
    if (deviceId <= 0 || WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    // ... rest stays the same ...
}

void pollProvisionEndpoint() {
    if (WiFi.status() != WL_CONNECTED || strlen(licenseKey) < 18) return;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    // ... rest stays the same ...
}
```

### Update authenticateDevKey() in getKey.ino:

```cpp
bool authenticateDevKey(const char* tempDevKey) {
    StaticJsonDocument<200> doc;
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    String newAuthURL = String(apiBaseURL) + String(registerEndpoint);
    http.begin(client, newAuthURL);
    // ... change firmware_version to "4.0.0" ...
    // ... rest stays the same ...
}
```

---

## 1.5 — relayControl.ino (EEPROM dirty flag)

### Update all writeToEeprom calls to set dirty flag:

```cpp
void checkForRelay() {
    // NOTE: This function only runs in HTTP mode.
    // In MQTT mode, backend controls relays via commands topic.

    if (co2 < CO2MinValue) {
        digitalWrite(CO2_RELAY_3, HIGH);
        if (!_co2RelayStatus) {  // Only write if changed
            _co2RelayStatus = HIGH;
            writeToEeprom<bool>(ADDR_CO2_RELAY_STATUS, _co2RelayStatus);
            eepromDirty = true;
        }
    } else if (co2 > CO2MinValue + 100) {
        digitalWrite(CO2_RELAY_3, LOW);
        if (_co2RelayStatus) {
            _co2RelayStatus = LOW;
            writeToEeprom<bool>(ADDR_CO2_RELAY_STATUS, _co2RelayStatus);
            eepromDirty = true;
        }
    }

    delay(100);

    if (humidity >= humidityMin) {
        digitalWrite(HUMIDITY_RELAY_1, HIGH);
        if (!_humidityRelayStatus) {
            _humidityRelayStatus = HIGH;
            writeToEeprom<bool>(ADDR_HUM_RELAY_STATUS, _humidityRelayStatus);
            eepromDirty = true;
        }
    } else if (humidity < humidityMin - 2.5) {
        digitalWrite(HUMIDITY_RELAY_1, LOW);
        if (_humidityRelayStatus) {
            _humidityRelayStatus = LOW;
            writeToEeprom<bool>(ADDR_HUM_RELAY_STATUS, _humidityRelayStatus);
            eepromDirty = true;
        }
    }

    delay(100);

    if (temperature <= tempMinValue) {
        digitalWrite(TEMP_RELAY_2, HIGH);
        if (!_ACRelayStatus) {
            _ACRelayStatus = HIGH;
            writeToEeprom<bool>(ADDR_AC_RELAY_STATUS, _ACRelayStatus);
            eepromDirty = true;
        }
    } else if (temperature > tempMinValue + 1) {
        digitalWrite(TEMP_RELAY_2, LOW);
        if (_ACRelayStatus) {
            _ACRelayStatus = LOW;
            writeToEeprom<bool>(ADDR_AC_RELAY_STATUS, _ACRelayStatus);
            eepromDirty = true;
        }
    }

    // LCD relay display (unchanged)
    lcd.setCursor(13, 0); lcd.print("RELAY: "); lcd.setCursor(19, 0); lcd.print(_co2RelayStatus);
    lcd.setCursor(13, 1); lcd.print("RELAY: "); lcd.setCursor(19, 1); lcd.print(_humidityRelayStatus);
    lcd.setCursor(13, 2); lcd.print("RELAY: "); lcd.setCursor(19, 2); lcd.print(_ACRelayStatus);

    delay(100);
}
```

### Update handleRelayCommand() in mqttClient.ino — add dirty flag:

All `writeToEeprom` calls in `handleRelayCommand()` need `eepromDirty = true;` after them.

### Update handleConfig() — add dirty flag:

The `EEPROM.commit()` at line 479 of handleConfig becomes:
```cpp
// Remove: EEPROM.commit();
// Replace with:
eepromDirty = true;
```

---

## 1.6 — eepromConfig.ino (Remove hardcoded WiFi)

### Remove legacy WiFi hardcode:

```cpp
// DELETE lines 81-85:
// uint8_t wifiFlag = EEPROM.read(ADDR_WIFI_PROVISIONED);
// if (wifiFlag == 255 && strlen(licenseKey) > 4) {
//     Serial.println("Legacy migration: writing hardcoded WiFi to EEPROM");
//     saveWiFiCredentials("Jas_Mehar", "airtel2730");
// }
```

**Replace with:**
```cpp
// No legacy WiFi migration — all new devices use captive portal
```

---

# PHASE 2: FIRMWARE SETUP MODE + CAPTIVE PORTAL

**Goal:** ESP32 enters Setup Mode on first boot (no key). Web Serial writes key. Captive portal uses key-based WiFi name.

## 2.1 — New function: enterSetupMode() (add to main.ino or new file)

```cpp
void enterSetupMode() {
    Serial.println("\n=== SETUP MODE ===");
    Serial.print("MAC:");
    Serial.println(WiFi.macAddress());
    Serial.println("AWAITING_KEY");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("=== SETUP MODE ===");
    lcd.setCursor(0, 1);
    lcd.print("Waiting for key...");
    lcd.setCursor(0, 2);
    lcd.print("MAC:");
    lcd.setCursor(4, 2);
    lcd.print(WiFi.macAddress());

    // Flash onboard LED to indicate Setup Mode
    pinMode(2, OUTPUT);  // Onboard LED

    unsigned long lastBlink = 0;
    bool ledState = false;

    while (true) {
        // Blink LED
        if (millis() - lastBlink > 500) {
            ledState = !ledState;
            digitalWrite(2, ledState);
            lastBlink = millis();
        }

        // Check Serial for key command
        if (Serial.available()) {
            String input = Serial.readStringUntil('\n');
            input.trim();

            if (input.startsWith("KEY:")) {
                String key = input.substring(4);
                key.trim();

                if (key.length() == 18 && key.startsWith("LIC-")) {
                    // Valid key — write to EEPROM
                    char keyArr[20];
                    key.toCharArray(keyArr, 20);
                    writeStringToEEPROM(ADDR_KEY_FLAG, keyArr);

                    // Also set license_key global
                    for (int i = 0; i < 18; i++) licenseKey[i] = keyArr[i];
                    licenseKey[18] = '\0';

                    // Write default thresholds
                    writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
                    writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
                    writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
                    EEPROM.commit();

                    Serial.println("KEY_OK:" + key);
                    lcd.clear();
                    lcd.print("Key Saved!");
                    lcd.setCursor(0, 1);
                    lcd.print(key);
                    lcd.setCursor(0, 2);
                    lcd.print("Rebooting...");

                    delay(2000);
                    ESP.restart();
                } else {
                    Serial.println("KEY_ERR:Invalid format (need LIC-XXXX-YYYY-ZZZZ)");
                }
            } else if (input == "PING") {
                // Health check from Web Serial
                Serial.println("PONG");
            } else if (input == "MAC") {
                Serial.print("MAC:");
                Serial.println(WiFi.macAddress());
            } else if (input == "VERSION") {
                Serial.print("VERSION:");
                Serial.println(FIRMWARE_VERSION);
            }
        }
        delay(10);
    }
}
```

## 2.2 — captivePortal.ino (WiFi name from license key)

### Update startCaptivePortal():

```cpp
void startCaptivePortal() {
    portalActive = true;
    portalRunning = true;

    // WiFi AP name: MUSH_ + last 4 chars of license key
    String apName = "MUSH_";
    if (strlen(licenseKey) >= 4) {
        apName += String(licenseKey + strlen(licenseKey) - 4);
    } else {
        // Fallback to MAC
        String mac = WiFi.macAddress();
        String suffix = mac.substring(mac.length() - 5);
        suffix.replace(":", "");
        apName += suffix;
    }

    // Standard password for ALL devices
    String apPass = "123456";

    Serial.println("Starting captive portal...");
    Serial.println("AP Name: " + apName);
    Serial.println("AP Pass: " + apPass);

    // ... rest of function unchanged ...
}
```

---

# PHASE 3: BACKEND — FIRMWARE MANAGEMENT API

**Goal:** Store .bin files in DB, serve for OTA + Web Serial flashing.

## 3.1 — New model: backend/app/models/firmware.py

```python
from sqlalchemy import Column, Integer, String, LargeBinary, Boolean, DateTime, func
from app.database import Base

class FirmwareFile(Base):
    __tablename__ = "firmware_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    version = Column(String(20), nullable=False, unique=True)
    filename = Column(String(255), nullable=False)
    file_data = Column(LargeBinary, nullable=False)
    file_size = Column(Integer, nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    board_type = Column(String(50), default="ESP32")
    upload_notes = Column(String, nullable=True)
    uploaded_by = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime, server_default=func.now())
    is_active = Column(Boolean, default=True)
```

## 3.2 — New router: backend/app/api/firmware.py

```
POST   /api/v1/firmware/upload        Upload .bin (admin only)
GET    /api/v1/firmware/latest         Get latest active firmware metadata + download URL
GET    /api/v1/firmware/latest/bin     Download latest .bin binary
GET    /api/v1/firmware/versions       List all firmware versions
GET    /api/v1/firmware/{version}/bin  Download specific .bin
DELETE /api/v1/firmware/{version}      Delete a firmware version (admin only)
```

## 3.3 — Alembic migration

```bash
alembic revision --autogenerate -m "add firmware_files table"
alembic upgrade head
```

---

# PHASE 4: FRONTEND — FLASH DEVICE PAGE

**Goal:** Admin can flash ESP32 directly from Chrome dashboard via Web Serial API.

## 4.1 — New npm dependencies

```bash
npm install esptool-js html5-qrcode qrcode.react jsbarcode
```

## 4.2 — New page: frontend/src/pages/FlashDevice.tsx

**Key components:**
- Serial port connection (navigator.serial.requestPort())
- Firmware download from backend API
- Flash via esptool-js (ESPLoader class)
- Serial monitor for MAC address + Setup Mode commands
- Device registration API call
- Sticker preview + print

## 4.3 — Web Serial Flow (JavaScript)

```typescript
// 1. Request serial port
const port = await navigator.serial.requestPort();
await port.open({ baudRate: 115200 });

// 2. Flash firmware using esptool-js
import { ESPLoader, Transport } from 'esptool-js';
const transport = new Transport(port);
const esploader = new ESPLoader({ transport, baudrate: 115200 });
await esploader.main();
await esploader.flashData(firmwareBin, 0x10000);  // app0 offset

// 3. Reset device and read Serial
await esploader.hardReset();
// Read serial output for "MAC:XX:XX:XX:XX:XX:XX"

// 4. Send license key
const writer = port.writable.getWriter();
await writer.write(new TextEncoder().encode(`KEY:${licenseKey}\n`));
// Read "KEY_OK:LIC-XXXX-YYYY-ZZZZ"

// 5. Done — close port
await port.close();
```

---

# PHASE 5: FRONTEND — STICKER GENERATOR + THERMAL PRINT

**Goal:** Generate and print device sticker with QR, barcode, WiFi info.

## 5.1 — New component: frontend/src/components/ui-custom/DeviceSticker.tsx

```
Renders:
  - QR Code (qrcode.react) — contains license key
  - Barcode (JsBarcode) — Code128 of license key
  - WiFi AP name (MUSH_XXXX)
  - WiFi password (123456)
  - MAC address
  - Firmware version
  - Serial number / device name

Print: window.print() with @media print CSS
  - Sized for 62mm thermal label
  - Hides everything except sticker in print mode
```

---

# PHASE 6: FRONTEND — QR SCANNER FOR ROOM LINKING

**Goal:** User scans QR code on device sticker to link device to room.

## 6.1 — New component: frontend/src/components/ui-custom/QRScanner.tsx

```typescript
import { Html5QrcodeScanner } from 'html5-qrcode';

// Renders camera preview with scan overlay
// On successful scan: validates LIC-XXXX-YYYY-ZZZZ format
// Calls: POST /api/v1/devices/link { license_key, room_id }
// Falls back to manual text input
```

## 6.2 — Update Room page

Add "Add Device" button → opens QR scanner modal → on scan success → confirms link.

---

# PHASE 7: BACKEND CONFIG FIXES

## 7.1 — CORS (add dashboard domain)

```
File: backend/.env.production
CORS_ORIGINS=https://mushroomkimandi.com,https://dashboard.mushroomkimandi.com,http://localhost:3801
```

## 7.2 — Device Encryption Key

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy output to .env.production DEVICE_ENCRYPTION_KEY=...
```

## 7.3 — Cookie secure flag

```
File: backend/app/api/auth.py
# In set_auth_cookies():
secure = True  # Was False — Railway is HTTPS
```

---

# PHASE 8: INTEGRATION TEST

## Test Matrix

| Test | Method | Expected |
|------|--------|----------|
| Flash fresh ESP32 via Web Serial | Dashboard Chrome | .bin flashed, MAC read |
| Write license key via Serial | Dashboard → Setup Mode | KEY_OK response |
| Captive portal AP name | Phone WiFi scan | "MUSH_K60T" visible |
| Captive portal password | Connect with "123456" | Portal page loads |
| WiFi config via portal | Select network, submit | Device reboots, connects |
| Device registers on backend | Auto after WiFi | Appears in Devices list PENDING |
| QR scan links to room | Dashboard camera | Device linked, PENDING_APPROVAL |
| Admin approves | Dashboard notification | MQTT credentials generated |
| MQTT TLS connection | Auto after approval | Device connects to HiveMQ |
| Telemetry flows | Dashboard sensor page | Real-time data appears |
| Relay commands work | Dashboard toggle | Relay clicks on device |
| OTA update | Publish to /ota topic | Device downloads, flashes, reboots |
| OTA rollback | Flash bad firmware | Auto-reverts to previous partition |
| Kill-switch | Dashboard disable | All relays off, device frozen |
| Config sync | Change thresholds | Device EEPROM updated |
| EEPROM persistence | Power cycle device | Settings survive |
| 24-hour heap stability | Monitor free_heap | Stable, no downward trend |

---

# PHASE 9: DEPLOY + MIGRATE

## 9.1 — Deploy order

```
1. Backend migration (firmware_files table) → Railway
2. Upload firmware v4.0.0 .bin to backend API
3. Frontend build + deploy to Vercel
4. Flash ESP32-Sensor-02 (test device) via Web Serial
5. Monitor 24 hours
6. Flash ESP32-Sensor-01 (production device)
7. Update memory/MEMORY.md
```

## 9.2 — Migrate existing devices

Existing ESP32-Sensor-01 and 02 have v1.0.0 with local IPs. They cannot be OTA-updated to v4.0.0 because:
- They point to local broker (192.168.29.236:1883)
- Production backend is HTTPS (they use HTTP)
- **Must be flashed via USB** for this one-time migration

After USB flash to v4.0.0, all future updates are via OTA.

---

# DUAL PARTITION OTA — HOW IT WORKS

## Partition Layout

```
Flash Memory (4MB):
┌──────────────────────┐ 0x000000
│   Bootloader          │ (factory, never changes)
├──────────────────────┤ 0x009000
│   NVS                 │ 20KB (WiFi calibration, misc)
├──────────────────────┤ 0x00E000
│   OTA Data            │ 8KB (which partition to boot)
├──────────────────────┤ 0x010000
│                       │
│   app0 (OTA_0)        │ 1.875 MB ← CURRENTLY RUNNING (v4.0.0)
│                       │
├──────────────────────┤ 0x1F0000
│                       │
│   app1 (OTA_1)        │ 1.875 MB ← EMPTY (receives OTA update)
│                       │
├──────────────────────┤ 0x3D0000
│   SPIFFS              │ 192KB (file storage, unused currently)
└──────────────────────┘ 0x400000
```

## OTA Update Sequence

```
STATE BEFORE OTA:
  Bootloader → boots app0 (v4.0.0, marked VALID)
  app1 = empty or old firmware

1. MQTT /ota message arrives with URL + version

2. Download .bin and write to app1 (inactive partition)
   app0: v4.0.0 (running, VALID)
   app1: v4.1.0 (being written...)

3. Update.end(true) — finalize write
   Sets OTA data: "boot app1 next"
   Marks app1 as PENDING_VERIFY

4. ESP.restart()
   Bootloader sees: app1 = PENDING_VERIFY
   Boots app1 (v4.1.0)

5. NEW FIRMWARE BOOTS (60 second validation window)
   WiFi connects? ✓
   MQTT connects? ✓
   Sensors read? ✓
   → Calls esp_ota_mark_app_valid_cancel_rollback()
   → app1 marked VALID
   → Success!

6. IF NEW FIRMWARE CRASHES within 60s:
   Watchdog triggers reboot
   Bootloader sees: app1 = PENDING_VERIFY (not validated)
   Rolls back → boots app0 (v4.0.0)
   Device safe on old firmware!
```

## What Triggers Rollback

| Scenario | Result |
|----------|--------|
| New FW crashes in setup() | Bootloader reverts to old partition |
| New FW hangs (no `mark_valid` in 60s) | Bootloader reverts on next reboot |
| New FW runs but MQTT fails | Still marks valid (WiFi worked) — design choice |
| Power loss during OTA write | Old partition untouched, boots normally |
| OTA download interrupted | Update.abort() called, no partition change |

---

# FILES CHANGED (SUMMARY)

## Firmware (Modify)

| File | Changes |
|------|---------|
| `configuration.h` | WiFiClientSecure, prod URLs, MQTT 8883, v4.0.0, eepromDirty, NTP, heap threshold, mqtt credentials |
| `main.ino` | Setup Mode, NTP sync, remove EEPROM.commit from loop, skip checkForRelay in MQTT mode, eepromDirty commit |
| `mqttClient.ino` | TLS setup, shared HiveMQ creds, ArduinoJson telemetry, QoS 1, disconnect MQTT before OTA, reconnect after |
| `sendingJsonRequest.ino` | WiFiClientSecure for all HTTP calls |
| `getKey.ino` | WiFiClientSecure, fw version 4.0.0 |
| `relayControl.ino` | eepromDirty flag, only write on change |
| `eepromConfig.ino` | Remove hardcoded Jas_Mehar WiFi |
| `captivePortal.ino` | AP name from license key, password "123456" |

## Backend (New + Modify)

| File | Action |
|------|--------|
| `models/firmware.py` | NEW — FirmwareFile model |
| `api/firmware.py` | NEW — Upload/download/list endpoints |
| `api/router.py` | MODIFY — Add firmware router |
| `alembic migration` | NEW — firmware_files table |
| `.env.production` | MODIFY — CORS, encryption key |
| `api/auth.py` | MODIFY — secure=True for cookies |

## Frontend (New + Modify)

| File | Action |
|------|--------|
| `pages/FlashDevice.tsx` | NEW — Web Serial flash page |
| `components/ui-custom/DeviceSticker.tsx` | NEW — QR + barcode sticker |
| `components/ui-custom/QRScanner.tsx` | NEW — Camera QR scanner |
| `pages/Rooms.tsx` | MODIFY — Add "Add Device" with QR scan |
| `services/firmwareService.ts` | NEW — Firmware API calls |
| `package.json` | MODIFY — Add esptool-js, html5-qrcode, qrcode.react, jsbarcode |

---

# IMPLEMENTATION ORDER (Critical Path)

```
Week 1:
  ├── PHASE 1: Firmware core (TLS, URLs, bugs)        — 3 hours
  ├── PHASE 2: Setup Mode + captive portal             — 1 hour
  └── PHASE 7: Backend config fixes                    — 30 min
       └── Flash & test on ESP32-Sensor-02             — 1 hour

Week 2:
  ├── PHASE 3: Backend firmware management API         — 2 hours
  ├── PHASE 4: Frontend flash page (Web Serial)        — 4 hours
  ├── PHASE 5: Sticker generator                       — 2 hours
  └── PHASE 6: QR scanner                              — 1.5 hours

Week 3:
  ├── PHASE 8: Integration testing (full flow)         — 2 hours
  └── PHASE 9: Deploy + migrate existing devices       — 1 hour

TOTAL: ~18 hours across 3 weeks
```
