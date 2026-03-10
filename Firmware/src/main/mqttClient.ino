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
 *
 * Requires: PubSubClient library by Nick O'Leary (install via Arduino Library Manager)
 */

WiFiClient mqttWifiClient;
PubSubClient mqttClient(mqttWifiClient);

void setupMQTT() {
    // Use provisioned host if available, otherwise default
    const char* host = (strlen(mqttHost) > 0) ? mqttHost : mqttBrokerHost;
    mqttClient.setServer(host, mqttBrokerPort);
    mqttClient.setCallback(mqttCallback);
    mqttClient.setBufferSize(1024);
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

    int maxRetries = 20;
    for (int attempt = 1; attempt <= maxRetries && !mqttClient.connected(); attempt++) {
        // Re-check WiFi before each attempt
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("MQTT attempt aborted — WiFi dropped mid-retry");
            return false;  // Don't count as MQTT failure
        }

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print("MQTT Try: ");
        lcd.print(attempt);
        lcd.print("/");
        lcd.print(maxRetries);

        Serial.printf("MQTT connecting as: %s (attempt %d/%d)\n", clientId.c_str(), attempt, maxRetries);

        if (mqttClient.connect(clientId.c_str(), licenseKey, devicePassword,
                               statusTopic.c_str(), 1, true, lwtPayload.c_str())) {
            Serial.println("MQTT Connected");
            lcd.setCursor(0, 1);
            lcd.print("MQTT Connected!");
            mqttConsecutiveFailures = 0;  // Reset failure counter on success

            // Subscribe to command topics
            String cmdTopic = "device/" + clientId + "/commands";
            String ctrlTopic = "device/" + clientId + "/control";
            String otaTopic = "device/" + clientId + "/ota";
            mqttClient.subscribe(cmdTopic.c_str());
            mqttClient.subscribe(ctrlTopic.c_str());
            mqttClient.subscribe(otaTopic.c_str());

            Serial.println("Subscribed: " + cmdTopic);
            Serial.println("Subscribed: " + ctrlTopic);
            Serial.println("Subscribed: " + otaTopic);

            // Publish online status (retained)
            String onlinePayload = "{\"status\":\"online\"}";
            mqttClient.publish(statusTopic.c_str(), onlinePayload.c_str(), true);
            return true;
        } else {
            Serial.print("MQTT failed, rc=");
            Serial.println(mqttClient.state());
            lcd.setCursor(0, 1);
            lcd.print("MQTT fail rc=");
            lcd.print(mqttClient.state());
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
        Serial.println("MQTT: AHU relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "HUMIDIFIER" || relayType == "humidifier") {
        digitalWrite(HUMIDIFIER_RELAY_5, relayState ? HIGH : LOW);
        _humidifierRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_HUM2_RELAY_STATUS, _humidifierRelayStatus);
        Serial.println("MQTT: Humidifier relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "DUCT_FAN" || relayType == "duct_fan") {
        digitalWrite(DUCT_FAN_RELAY_6, relayState ? HIGH : LOW);
        _ductFanRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_DUCT_RELAY_STATUS, _ductFanRelayStatus);
        Serial.println("MQTT: Duct fan relay -> " + String(relayState ? "ON" : "OFF"));
    } else if (relayType == "EXTRA" || relayType == "extra") {
        digitalWrite(EXTRA_RELAY_7, relayState ? HIGH : LOW);
        _extraRelayStatus = relayState;
        writeToEeprom<bool>(ADDR_EXTRA_RELAY_STATUS, _extraRelayStatus);
        Serial.println("MQTT: Extra relay -> " + String(relayState ? "ON" : "OFF"));
    }
}

void handleOTA(String payload) {
    // TODO: Full OTA implementation in a future phase
    Serial.println("OTA update requested: " + payload);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("OTA Update");
    lcd.setCursor(0, 1);
    lcd.print("Available");
    delay(3000);
}

void publishTelemetry() {
    if (!mqttClient.connected()) {
        connectMQTT();
    }

    String topic = "device/" + String(licenseKey) + "/telemetry";

    // Build JSON telemetry payload
    String json = "{";
    json += "\"co2_ppm\":" + String(co2) + ",";
    json += "\"room_temp\":" + String(temperature, 1) + ",";
    json += "\"room_humidity\":" + String(humidity, 1) + ",";
    json += "\"bag_temps\":[";
    for (unsigned int i = 0; i < deviceCountBus1; i++) {
        json += String(tempInBusOne[i], 1);
        if (i < deviceCountBus1 - 1 || deviceCountBus2 > 0) json += ",";
    }
    for (unsigned int i = 0; i < deviceCountBus2; i++) {
        json += String(tempInBusTwo[i], 1);
        if (i < deviceCountBus2 - 1) json += ",";
    }
    json += "],";
    json += "\"outdoor_temp\":" + String(temperatureOut, 1) + ",";
    json += "\"outdoor_humidity\":" + String(humidityOut, 1) + ",";
    json += "\"relay_states\":{";
    json += "\"co2\":" + String(_co2RelayStatus ? "true" : "false") + ",";
    json += "\"humidity\":" + String(_humidityRelayStatus ? "true" : "false") + ",";
    json += "\"temperature\":" + String(_ACRelayStatus ? "true" : "false") + ",";
    json += "\"ahu\":" + String(_ahuRelayStatus ? "true" : "false") + ",";
    json += "\"humidifier\":" + String(_humidifierRelayStatus ? "true" : "false") + ",";
    json += "\"duct_fan\":" + String(_ductFanRelayStatus ? "true" : "false") + ",";
    json += "\"extra\":" + String(_extraRelayStatus ? "true" : "false");
    json += "},";
    json += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"device_ip\":\"" + WiFi.localIP().toString() + "\"";
    json += "}";

    mqttClient.publish(topic.c_str(), json.c_str());
    Serial.println("MQTT telemetry published (" + String(json.length()) + " bytes)");
}

void mqttLoop() {
    mqttClient.loop();
}
