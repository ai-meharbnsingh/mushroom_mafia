/*
 * mqttClient.ino
 *
 * MQTT communication module for Phase D: HTTP bootstrap → MQTT runtime.
 * Handles connection, telemetry publishing, and incoming command/control messages.
 *
 * Topics:
 *   device/{licenseKey}/telemetry  — outbound sensor data (publish)
 *   device/{licenseKey}/status     — online/offline LWT (publish, retained)
 *   device/{licenseKey}/commands   — relay commands from server (subscribe)
 *   device/{licenseKey}/control    — kill-switch enable/disable (subscribe)
 *   device/{licenseKey}/ota        — OTA update notifications (subscribe)
 *   device/{licenseKey}/config     — threshold config sync from server (subscribe)
 *
 * Requires: PubSubClient library by Nick O'Leary (install via Arduino Library Manager)
 */

WiFiClientSecure mqttWifiClient;
PubSubClient mqttClient(mqttWifiClient);

void setupMQTT() {
    // Use provisioned host if available, otherwise default
    const char* host = (strlen(mqttHost) > 0) ? mqttHost : mqttBrokerHost;
    mqttWifiClient.setInsecure();
    mqttClient.setServer(host, mqttBrokerPort);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1024);
    mqttClient.setKeepAlive(60);
    Serial.print("MQTT configured: ");
    Serial.print(host);
    Serial.print(":");
    Serial.println(mqttBrokerPort);
}

// Track consecutive MQTT failures (only counted when WiFi IS connected)
int mqttConsecutiveFailures = 0;

bool connectMQTT() {
    // If WiFi is down, don't attempt MQTT and don't count as a failure
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("MQTT connect skipped — WiFi is down");
        return false;
    }

    String clientId = String(licenseKey);
    // LWT: publish offline status on unexpected disconnect
    String statusTopic = "device/" + clientId + "/status";
    String lwtPayload = "{\"status\":\"offline\"}";

    int maxRetries = 10;
    for (int attempt = 1; attempt <= maxRetries && !mqttClient.connected(); attempt++) {
        // Re-check WiFi before each attempt
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("MQTT attempt aborted — WiFi dropped mid-retry");
            return false;  // Don't count as MQTT failure
        }

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("TLS MQTT Try: ");
        lcd.print(attempt);
        lcd.print("/");
        lcd.print(maxRetries);

        Serial.printf("MQTT TLS connecting as: %s (attempt %d/%d)\n", clientId.c_str(), attempt, maxRetries);

        if (mqttClient.connect(clientId.c_str(), mqttUsername, mqttDefaultPassword,
                               statusTopic.c_str(), 1, true, lwtPayload.c_str())) {
            Serial.println("MQTT TLS Connected");
            lcd.setCursor(0, 1);
            lcd.print("MQTT TLS Connected!");
            mqttConsecutiveFailures = 0;  // Reset failure counter on success

            // Subscribe to command topics with QoS 1
            String cmdTopic = "device/" + clientId + "/commands";
            String ctrlTopic = "device/" + clientId + "/control";
            String otaTopic = "device/" + clientId + "/ota";
            mqttClient.subscribe(cmdTopic.c_str(), 1);
            mqttClient.subscribe(ctrlTopic.c_str(), 1);
            mqttClient.subscribe(otaTopic.c_str(), 1);

            String configTopic = "device/" + clientId + "/config";
            mqttClient.subscribe(configTopic.c_str(), 1);

            Serial.println("Subscribed: " + cmdTopic);
            Serial.println("Subscribed: " + ctrlTopic);
            Serial.println("Subscribed: " + otaTopic);
            Serial.println("Subscribed: " + configTopic);

            // Publish online status (retained)
            String onlinePayload = "{\"status\":\"online\"}";
            mqttClient.publish(statusTopic.c_str(), onlinePayload.c_str(), true);
            return true;
        } else {
            Serial.print("MQTT TLS failed, rc=");
            Serial.println(mqttClient.state());
            lcd.setCursor(0, 1);
            lcd.print("TLS fail rc=");
            lcd.print(mqttClient.state());
            esp_task_wdt_reset();  // Risk 2: Feed watchdog between MQTT retries
            delay(5000);
        }
    }

    // All retries exhausted WITH WiFi connected — count as real MQTT failure
    mqttConsecutiveFailures++;
    Serial.printf("MQTT failed with WiFi up (%d consecutive)\n", mqttConsecutiveFailures);

    if (mqttConsecutiveFailures >= 20) {
        // Only clear provisioning after 20 consecutive real MQTT failures
        Serial.println("MQTT: 20 consecutive failures with WiFi up. Clearing provisioning, rebooting to HTTP mode.");
        lcd.clear();
        lcd.print("MQTT FAILED x20");
        lcd.setCursor(0, 1);
        lcd.print("Fallback to HTTP");
        EEPROM.write(ADDR_MQTT_PROVISIONED, 255);
        EEPROM.commit();
        delay(3000);
        ESP.restart();
    }

    lcd.clear();
    lcd.print("MQTT FAILED");
    lcd.setCursor(0, 1);
    lcd.print("Will retry later");
    return false;
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
    String topicStr = String(topic);
    String payloadStr = "";
    for (unsigned int i = 0; i < length; i++) {
        payloadStr += (char)payload[i];
    }
    Serial.println("MQTT rx: " + topicStr + " -> " + payloadStr);

    if (topicStr.endsWith("/control")) {
        handleKillSwitch(payloadStr);
    } else if (topicStr.endsWith("/commands")) {
        handleRelayCommand(payloadStr);
    } else if (topicStr.endsWith("/ota")) {
        handleOTA(payloadStr);
    } else if (topicStr.endsWith("/config")) {
        handleConfig(payloadStr);
    }
}

void handleKillSwitch(String payload) {
    StaticJsonDocument<200> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.print("Kill-switch JSON error: ");
        Serial.println(err.c_str());
        return;
    }
    String action = doc["action"] | "";

    if (action == "DISABLE") {
        deviceDisabled = true;
        Serial.println("DEVICE DISABLED via kill-switch");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("** DEVICE DISABLED **");
        lcd.setCursor(0, 1);
        lcd.print("Contact Admin");
        // Force all relay outputs off
        digitalWrite(CO2_RELAY_3, LOW);
        digitalWrite(HUMIDITY_RELAY_1, LOW);
        digitalWrite(TEMP_RELAY_2, LOW);
        digitalWrite(AHU_RELAY_4, LOW);
        digitalWrite(HUMIDIFIER_RELAY_5, LOW);
        digitalWrite(DUCT_FAN_RELAY_6, LOW);
        digitalWrite(EXTRA_RELAY_7, LOW);
        _co2RelayStatus = false;
        _humidityRelayStatus = false;
        _ACRelayStatus = false;
        _ahuRelayStatus = false;
        _humidifierRelayStatus = false;
        _ductFanRelayStatus = false;
        _extraRelayStatus = false;
    } else if (action == "ENABLE") {
        deviceDisabled = false;
        Serial.println("DEVICE RE-ENABLED via kill-switch");
        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("Device Re-enabled");
        delay(2000);
    }
}

void handleRelayCommand(String payload) {
    StaticJsonDocument<200> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.print("Relay cmd JSON error: ");
        Serial.println(err.c_str());
        return;
    }
    String relayType = doc["relay_type"] | "";
    String state = doc["state"] | "";

    bool relayState = (state == "ON" || state == "true");

    if (relayType == "CO2" || relayType == "co2") {
        digitalWrite(CO2_RELAY_3, relayState ? HIGH : LOW);
        _co2RelayStatus = relayState;
        Serial.println("MQTT: CO2 relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "HUMIDITY" || relayType == "humidity") {
        digitalWrite(HUMIDITY_RELAY_1, relayState ? HIGH : LOW);
        _humidityRelayStatus = relayState;
        Serial.println("MQTT: Humidity relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "TEMPERATURE" || relayType == "temperature") {
        digitalWrite(TEMP_RELAY_2, relayState ? HIGH : LOW);
        _ACRelayStatus = relayState;
        Serial.println("MQTT: Temp relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "AHU" || relayType == "ahu") {
        digitalWrite(AHU_RELAY_4, relayState ? HIGH : LOW);
        _ahuRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_AHU_RELAY_STATUS, _ahuRelayStatus);
        eepromDirty = true;
        Serial.println("MQTT: AHU relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "HUMIDIFIER" || relayType == "humidifier") {
        digitalWrite(HUMIDIFIER_RELAY_5, relayState ? HIGH : LOW);
        _humidifierRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_HUM2_RELAY_STATUS, _humidifierRelayStatus);
        eepromDirty = true;
        Serial.println("MQTT: Humidifier relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "DUCT_FAN" || relayType == "duct_fan") {
        digitalWrite(DUCT_FAN_RELAY_6, relayState ? HIGH : LOW);
        _ductFanRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_DUCT_RELAY_STATUS, _ductFanRelayStatus);
        eepromDirty = true;
        Serial.println("MQTT: Duct fan relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "EXTRA" || relayType == "extra") {
        digitalWrite(EXTRA_RELAY_7, relayState ? HIGH : LOW);
        _extraRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_EXTRA_RELAY_STATUS, _extraRelayStatus);
        eepromDirty = true;
        Serial.println("MQTT: Extra relay -> " + String(relayState ? "ON" : "OFF"));
    }
}

void handleOTA(String payload) {
    Serial.println("OTA update requested: " + payload);

    // ─── 1. Parse MQTT payload ─────────────────────────────────────
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.print("OTA JSON parse error: ");
        Serial.println(err.c_str());
        lcd.clear();
        lcd.print("OTA: Bad payload");
        delay(3000);
        return;
    }

    const char* url = doc["url"] | "";
    const char* version = doc["version"] | "";
    const char* checksum = doc["checksum"] | "";  // e.g. "sha256:abc123..."

    if (strlen(url) == 0 || strlen(version) == 0) {
        Serial.println("OTA: Missing url or version in payload");
        lcd.clear();
        lcd.print("OTA: Missing fields");
        delay(3000);
        return;
    }

    // ─── 2. Version check — skip if already running this version ───
    if (strcmp(version, FIRMWARE_VERSION) == 0) {
        Serial.printf("OTA: Already on version %s — skipping\n", version);
        lcd.clear();
        lcd.print("OTA: Up to date");
        lcd.setCursor(0, 1);
        lcd.print("v");
        lcd.print(FIRMWARE_VERSION);
        delay(3000);
        return;
    }

    Serial.printf("OTA: Updating %s -> %s\n", FIRMWARE_VERSION, version);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Downloading...");
    lcd.setCursor(0, 1);
    lcd.print("v");
    lcd.print(FIRMWARE_VERSION);
    lcd.print(" -> v");
    lcd.print(version);

    // ─── 3. Download firmware binary via HTTPS ─────────────────────
    // Disconnect MQTT to free RAM for 2nd TLS connection
    mqttClient.disconnect();
    delay(100);

    WiFiClientSecure otaClient;
    otaClient.setInsecure();
    HTTPClient http;
    http.begin(otaClient, url);
    http.setTimeout(30000);  // 30s timeout for download

    int httpCode = http.GET();
    if (httpCode != HTTP_CODE_OK) {
        Serial.printf("OTA: HTTP download failed, code=%d\n", httpCode);
        lcd.clear();
        lcd.print("OTA: Download fail");
        lcd.setCursor(0, 1);
        lcd.print("HTTP ");
        lcd.print(httpCode);
        http.end();
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    int contentLength = http.getSize();
    if (contentLength <= 0) {
        Serial.println("OTA: Invalid content length");
        lcd.clear();
        lcd.print("OTA: Bad size");
        http.end();
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    if (contentLength > OTA_MAX_DOWNLOAD_SIZE) {
        Serial.printf("OTA: Firmware too large (%d > %d)\n", contentLength, OTA_MAX_DOWNLOAD_SIZE);
        lcd.clear();
        lcd.print("OTA: Too large");
        lcd.setCursor(0, 1);
        lcd.print(String(contentLength / 1024) + "KB max=" + String(OTA_MAX_DOWNLOAD_SIZE / 1024) + "KB");
        http.end();
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    Serial.printf("OTA: Firmware size: %d bytes\n", contentLength);

    // ─── 4. Begin OTA update on inactive partition ─────────────────
    if (!Update.begin(contentLength, U_FLASH)) {
        Serial.printf("OTA: Update.begin() failed: %s\n", Update.errorString());
        lcd.clear();
        lcd.print("OTA: Begin fail");
        lcd.setCursor(0, 1);
        lcd.print(Update.errorString());
        http.end();
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    // ─── 5. Stream firmware to flash with progress on LCD ──────────
    WiFiClient* stream = http.getStreamPtr();
    uint8_t buf[1024];
    int written = 0;
    int lastPercent = -1;

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Flashing...");
    lcd.setCursor(0, 1);
    lcd.print("v");
    lcd.print(version);

    while (http.connected() && written < contentLength) {
        size_t available = stream->available();
        if (available) {
            int bytesRead = stream->readBytes(buf, min(available, sizeof(buf)));
            int bytesWritten = Update.write(buf, bytesRead);
            if (bytesWritten != bytesRead) {
                Serial.printf("OTA: Write mismatch (%d != %d)\n", bytesWritten, bytesRead);
                Update.abort();
                lcd.clear();
                lcd.print("OTA: Write error");
                http.end();
                delay(3000);
                setupMQTT(); connectMQTT();
                return;
            }
            written += bytesWritten;

            // Show progress on LCD (update every 5%)
            int percent = (written * 100) / contentLength;
            if (percent != lastPercent && percent % 5 == 0) {
                lastPercent = percent;
                lcd.setCursor(0, 2);
                lcd.print("Progress: ");
                lcd.print(percent);
                lcd.print("%   ");

                // Progress bar on line 4
                lcd.setCursor(0, 3);
                int bars = percent / 5;  // 20 chars wide = 100% / 5
                for (int i = 0; i < 20; i++) {
                    lcd.print(i < bars ? "#" : ".");
                }

                Serial.printf("OTA: %d%% (%d/%d bytes)\n", percent, written, contentLength);
            }
        }
        delay(1);  // Yield to watchdog
    }

    http.end();

    if (written != contentLength) {
        Serial.printf("OTA: Size mismatch (wrote %d, expected %d)\n", written, contentLength);
        Update.abort();
        lcd.clear();
        lcd.print("OTA: Size mismatch");
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    // ─── 6. Finalize and verify ────────────────────────────────────
    if (!Update.end(true)) {
        Serial.printf("OTA: Update.end() failed: %s\n", Update.errorString());
        lcd.clear();
        lcd.print("OTA: Verify fail");
        lcd.setCursor(0, 1);
        lcd.print(Update.errorString());
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    if (!Update.isFinished()) {
        Serial.println("OTA: Update not finished");
        lcd.clear();
        lcd.print("OTA: Incomplete");
        delay(3000);
        setupMQTT(); connectMQTT();
        return;
    }

    // ─── 7. Success — set boot partition and reboot ────────────────
    Serial.printf("OTA: Success! Firmware v%s written (%d bytes). Rebooting...\n", version, written);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Complete!");
    lcd.setCursor(0, 1);
    lcd.print("v");
    lcd.print(version);
    lcd.print(" (");
    lcd.print(written / 1024);
    lcd.print("KB)");
    lcd.setCursor(0, 2);
    lcd.print("####################");
    lcd.setCursor(0, 3);
    lcd.print("Rebooting in 3s...");

    // Publish OTA success status via MQTT before reboot
    String statusTopic = "device/" + String(licenseKey) + "/telemetry";
    String otaStatus = "{\"ota_status\":\"success\",\"new_version\":\"" + String(version) + "\",\"bytes_written\":" + String(written) + "}";
    mqttClient.publish(statusTopic.c_str(), otaStatus.c_str());
    mqttClient.loop();  // Ensure message is sent

    delay(3000);
    ESP.restart();
}

void handleConfig(String payload) {
    StaticJsonDocument<300> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (err) {
        Serial.print("Config JSON error: ");
        Serial.println(err.c_str());
        return;
    }

    // Update CO2 threshold
    if (doc.containsKey("co2_min")) {
        uint16_t newCO2Min = doc["co2_min"];
        CO2MinValue = newCO2Min;
        writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
        Serial.printf("Config: CO2 min updated to %d\n", CO2MinValue);
    }

    // Update temperature threshold
    if (doc.containsKey("temp_min")) {
        float newTempMin = doc["temp_min"];
        tempMinValue = newTempMin;
        writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
        Serial.printf("Config: Temp min updated to %.1f\n", tempMinValue);
    }

    // Update humidity threshold
    if (doc.containsKey("humidity_min")) {
        float newHumMin = doc["humidity_min"];
        humidityMin = newHumMin;
        writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
        Serial.printf("Config: Humidity min updated to %.1f\n", humidityMin);
    }

    eepromDirty = true;

    // Show on LCD
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Config Updated");
    lcd.setCursor(0, 1);
    lcd.print("CO2:");
    lcd.print(CO2MinValue);
    lcd.setCursor(0, 2);
    lcd.print("T:");
    lcd.print(tempMinValue, 1);
    lcd.print(" H:");
    lcd.print(humidityMin, 1);
    delay(2000);
}

void publishTelemetry() {
    if (!mqttClient.connected()) {
        connectMQTT();
    }

    // Heap warning check
    uint32_t freeHeap = ESP.getFreeHeap();
    if (freeHeap < HEAP_WARNING_THRESHOLD) {
        Serial.printf("WARNING: Low heap: %u bytes\n", freeHeap);
    }

    String topic = "device/" + String(licenseKey) + "/telemetry";

    // Build JSON telemetry payload using ArduinoJson (replaces String concatenation)
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
    relays["co2"] = (bool)_co2RelayStatus;
    relays["humidity"] = (bool)_humidityRelayStatus;
    relays["temperature"] = (bool)_ACRelayStatus;
    relays["ahu"] = (bool)_ahuRelayStatus;
    relays["humidifier"] = (bool)_humidifierRelayStatus;
    relays["duct_fan"] = (bool)_ductFanRelayStatus;
    relays["extra"] = (bool)_extraRelayStatus;

    doc["wifi_rssi"] = WiFi.RSSI();
    doc["free_heap"] = freeHeap;
    doc["device_ip"] = WiFi.localIP().toString();
    doc["firmware_version"] = FIRMWARE_VERSION;

    JsonObject thresholds = doc.createNestedObject("thresholds");
    thresholds["co2_min"] = CO2MinValue;
    thresholds["temp_min"] = serialized(String(tempMinValue, 1));
    thresholds["humidity_min"] = serialized(String(humidityMin, 1));

    char buffer[768];
    size_t len = serializeJson(doc, buffer, sizeof(buffer));

    mqttClient.publish(topic.c_str(), buffer);
    Serial.printf("MQTT telemetry published (%d bytes)\n", len);
}

void mqttLoop() {
    mqttClient.loop();
}
