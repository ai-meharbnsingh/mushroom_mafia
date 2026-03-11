/*
 * sendingJsonRequest.ino
 * Sends unified sensor data to FastAPI backend via HTTP POST
 * Uses X-Device-ID and X-Device-Key headers for authentication
 *
 * Updated for Phase D: sends full license key in headers,
 * adds pollProvisionEndpoint() for MQTT credential retrieval.
 */

void sendHTTPRequest() {
    if(WiFi.status() != WL_CONNECTED) {
        lcd.setCursor(0,3);
        lcd.print("WiFi DOWN-no send   ");
        Serial.println("HTTP send skipped — WiFi down");
        return;
    }

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    // Build full URL
    String url = String(apiBaseURL) + String(readingsEndpoint);
    http.begin(client, url);

    // Set headers — send full licenseKey (works for both 19-char and legacy 12-char)
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Id", String(deviceId));
    http.addHeader("X-Device-Key", String(licenseKey));

    // Build unified JSON payload
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
    json += "}}";

    Serial.println("POST " + url);
    Serial.println(json);

    int httpResponseCode = http.POST(json);
    Serial.print("Response: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == 200) {
        String response = http.getString();
        Serial.println(response);
    }

    http.end();
    delay(100);

    // Poll for relay commands after sending reading
    pollRelayCommands();
}

void pollRelayCommands() {
    if (deviceId <= 0) return;
    if (WiFi.status() != WL_CONNECTED) {
        lcd.setCursor(0,3);
        lcd.print("WiFi DOWN-no poll   ");
        Serial.println("Relay poll skipped — WiFi down");
        return;
    }

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    String url = String(apiBaseURL) + String(commandsEndpoint) + String(deviceId) + "/commands";
    http.begin(client, url);
    http.addHeader("X-Device-Id", String(deviceId));
    http.addHeader("X-Device-Key", String(licenseKey));

    int httpResponseCode = http.GET();

    if (httpResponseCode == 200) {
        String response = http.getString();
        Serial.println("Commands: " + response);

        // Parse commands and apply relay changes
        if (response.indexOf("\"co2\"") > 0) {
            if (response.indexOf("\"state\":true") > 0 || response.indexOf("\"state\": true") > 0) {
                int co2Pos = response.indexOf("\"co2\"");
                int statePos = response.indexOf("\"state\"");

                if (co2Pos > 0 && co2Pos < statePos) {
                    digitalWrite(CO2_RELAY_3, HIGH);
                    _co2RelayStatus = HIGH;
                }
            }
        }
    }

    http.end();
}

void sendHeartbeat() {
    if (deviceId <= 0 || WiFi.status() != WL_CONNECTED) return;

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    String url = String(apiBaseURL) + String(heartbeatEndpoint);
    http.begin(client, url);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Id", String(deviceId));
    http.addHeader("X-Device-Key", String(licenseKey));

    String json = "{";
    json += "\"device_ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"uptime_seconds\":" + String(millis() / 1000);
    json += "}";

    int httpResponseCode = http.POST(json);
    Serial.print("Heartbeat: ");
    Serial.println(httpResponseCode);

    http.end();
}

/*
 * pollProvisionEndpoint()
 *
 * Called during HTTP bootstrap mode to check if the backend has provisioned
 * MQTT credentials for this device. Polls GET /device/provision/{license_key}.
 *
 * Expected JSON response when ready:
 * {
 *   "status": "ready",
 *   "mqtt_host": "broker.example.com",
 *   "mqtt_port": 1883,
 *   "mqtt_password": "generated-password-here"
 * }
 *
 * If status == "ready": saves MQTT credentials to EEPROM, sets mqttProvisioned = true, reboots.
 * If status == "pending" or error: does nothing, will retry next cycle.
 */
void pollProvisionEndpoint() {
    if (WiFi.status() != WL_CONNECTED) return;
    if (strlen(licenseKey) < 18) {
        Serial.println("Provision poll skipped: legacy key (need 18-char license key)");
        return;
    }

    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;

    String url = String(apiBaseURL) + String(provisionEndpoint) + String(licenseKey);
    http.begin(client, url);
    http.addHeader("X-Device-Key", String(licenseKey));

    Serial.println("Polling provision: " + url);
    int httpResponseCode = http.GET();
    Serial.print("Provision response: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == 200) {
        String response = http.getString();
        Serial.println("Provision data: " + response);

        StaticJsonDocument<512> doc;
        DeserializationError err = deserializeJson(doc, response);
        if (err) {
            Serial.print("Provision JSON parse error: ");
            Serial.println(err.c_str());
            http.end();
            return;
        }

        // 2-stage boot: update API base URL from provisioning response (any status)
        if (doc.containsKey("api_base_url") && !doc["api_base_url"].isNull()) {
            const char* newApiUrl = doc["api_base_url"];
            if (strlen(newApiUrl) > 0 && strcmp(newApiUrl, apiBaseURL) != 0) {
                saveApiBaseUrl(newApiUrl);
                Serial.println("API URL updated from provisioning server");
            }
        }

        String status = doc["status"] | "";
        if (status == "ready") {
            const char* mqttPwd = doc["mqtt_password"] | "";
            const char* mqttH = doc["mqtt_host"] | "localhost";
            int mqttP = doc["mqtt_port"] | 1883;

            Serial.println("MQTT provisioned! Saving credentials...");
            lcd.clear();
            lcd.setCursor(0, 0);
            lcd.print("MQTT Provisioned!");
            lcd.setCursor(0, 1);
            lcd.print("Host: " + String(mqttH));
            lcd.setCursor(0, 2);
            lcd.print("Rebooting...");

            saveMQTTCredentials(mqttPwd, mqttH, mqttP);

            delay(3000);
            http.end();
            ESP.restart();  // Reboot into MQTT mode
        } else {
            Serial.println("Provision status: " + status + " (not ready yet)");
        }
    } else if (httpResponseCode == 404) {
        Serial.println("Device not yet provisioned on server");
    } else {
        Serial.println("Provision endpoint error: " + String(httpResponseCode));
    }

    http.end();
}
