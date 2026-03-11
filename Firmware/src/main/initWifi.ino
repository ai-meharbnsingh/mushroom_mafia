bool serverStarted = false;

// ─── Risk 1 Fix: Non-blocking WiFi reconnect with exponential backoff ───
// Does NOT block the main loop. Returns immediately after issuing reconnect.
// Caller checks WiFi.status() on next loop iteration.
// Backoff doubles from 10s to max 5 min. After 10 consecutive failures,
// restarts the WiFi stack entirely.
bool reconnectWiFi() {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Reconnecting...");
    Serial.printf("WiFi reconnect (non-blocking, backoff=%lums, fails=%d)\n",
                  wifiBackoffInterval, wifiConsecutiveFailures);

    // After 10 consecutive failures: restart the WiFi stack entirely
    if (wifiConsecutiveFailures >= 10) {
        Serial.println("WiFi: 10 consecutive failures — restarting WiFi stack");
        WiFi.disconnect(true);
        delay(1000);
        WiFi.mode(WIFI_STA);
        WiFi.persistent(false);
        WiFi.setTxPower(WIFI_POWER_19_5dBm);
        // Re-read credentials from EEPROM for a fresh connection
        char ssid[33] = {0};
        char pass[65] = {0};
        if (readWiFiCredentials(ssid, pass)) {
            WiFi.begin(ssid, pass);
        } else {
            WiFi.reconnect();
        }
        wifiConsecutiveFailures = 0;
        wifiBackoffInterval = 10000;  // Reset backoff
        return false;  // Will check on next loop
    }

    WiFi.reconnect();  // ESP32 remembers last SSID/password

    // Brief non-blocking check (2 seconds max — NOT 30 seconds)
    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 2000) {
        delay(100);
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("WiFi reconnected! IP: " + WiFi.localIP().toString());
        lcd.setCursor(0, 0);
        lcd.print("WiFi: RECONNECTED   ");
        setupServer();  // Ensure web server is running
        // Reset backoff on success
        wifiConsecutiveFailures = 0;
        wifiBackoffInterval = 10000;
        return true;
    }

    // Exponential backoff: double interval up to 5 minutes (300000ms)
    wifiConsecutiveFailures++;
    wifiBackoffInterval = min(wifiBackoffInterval * 2, (unsigned long)300000);
    Serial.printf("WiFi reconnect failed. Next attempt in %lums\n", wifiBackoffInterval);
    lcd.setCursor(0, 0);
    lcd.print("WiFi: DOWN          ");
    return false;
}

void setupServer() {
  if (serverStarted) return;
  
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "MUSHROOM DEVICE ONLINE");
  });

  // Diagnostic endpoint — returns all sensor values as JSON
  server.on("/sensors", HTTP_GET, [](AsyncWebServerRequest *request) {
    String json = "{";
    json += "\"co2_ppm\":" + String(co2) + ",";
    json += "\"room_temp\":" + String(temperature, 1) + ",";
    json += "\"room_humidity\":" + String(humidity, 1) + ",";
    json += "\"outdoor_temp\":" + String(temperatureOut, 1) + ",";
    json += "\"outdoor_humidity\":" + String(humidityOut, 1) + ",";
    json += "\"bag_bus1_count\":" + String(deviceCountBus1) + ",";
    json += "\"bag_bus2_count\":" + String(deviceCountBus2) + ",";
    json += "\"bag_temps\":[";
    if (tempInBusOne != NULL) {
      for (unsigned int i = 0; i < deviceCountBus1; i++) {
        json += String(tempInBusOne[i], 1);
        if (i < deviceCountBus1 - 1 || deviceCountBus2 > 0) json += ",";
      }
    }
    if (tempInBusTwo != NULL) {
      for (unsigned int i = 0; i < deviceCountBus2; i++) {
        json += String(tempInBusTwo[i], 1);
        if (i < deviceCountBus2 - 1) json += ",";
      }
    }
    json += "],";
    json += "\"wifi_rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"free_heap\":" + String(ESP.getFreeHeap()) + ",";
    json += "\"uptime_s\":" + String(millis() / 1000) + ",";
    json += "\"mqtt_provisioned\":" + String(mqttProvisioned ? "true" : "false") + ",";
    json += "\"device_id\":" + String(deviceId) + ",";
    json += "\"relay_states\":{";
    json += "\"co2\":" + String(_co2RelayStatus ? "true" : "false") + ",";
    json += "\"humidity\":" + String(_humidityRelayStatus ? "true" : "false") + ",";
    json += "\"temperature\":" + String(_ACRelayStatus ? "true" : "false") + ",";
    json += "\"ahu\":" + String(_ahuRelayStatus ? "true" : "false") + ",";
    json += "\"humidifier\":" + String(_humidifierRelayStatus ? "true" : "false") + ",";
    json += "\"duct_fan\":" + String(_ductFanRelayStatus ? "true" : "false") + ",";
    json += "\"extra\":" + String(_extraRelayStatus ? "true" : "false");
    json += "}";
    json += "}";
    request->send(200, "application/json", json);
  });

  AsyncElegantOTA.begin(&server);
  server.begin();
  serverStarted = true;
  Serial.println("HTTP server started");
}

// Connect to WiFi with 3 retries, 30 seconds each.
// Returns true on success. On total failure: clears WiFi credentials
// and reboots into captive portal for re-configuration.
bool connectToWiFi(const char* ssid, const char* pass) {
  for (int retry = 1; retry <= 3; retry++) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Try: ");
    lcd.print(retry);
    lcd.print("/3");
    Serial.printf("\nWiFi Connection Attempt %d...\n", retry);

    WiFi.disconnect(true);
    delay(1000);
    WiFi.mode(WIFI_STA);
    WiFi.persistent(false);
    WiFi.setTxPower(WIFI_POWER_19_5dBm); // Max TX power for better range
    WiFi.begin(ssid, pass);

    unsigned long startAttemptTime = millis();
    // Try for 30 seconds per attempt
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 30000) {
      esp_task_wdt_reset();  // Risk 2: Feed watchdog during WiFi connection attempts
      delay(500);
      Serial.print(".");
      lcd.setCursor(0, 1);
      lcd.print("Time: ");
      lcd.print((millis() - startAttemptTime) / 1000);
      lcd.print("s ");
    }

    if (WiFi.status() == WL_CONNECTED) {
      lcd.clear();
      lcd.print("WiFi: CONNECTED");
      lcd.setCursor(0, 1);
      lcd.print("IP: ");
      lcd.print(WiFi.localIP());
      Serial.print("\nConnected! IP: ");
      Serial.println(WiFi.localIP());
      setupServer();
      delay(2000);
      return true;
    }

    Serial.println("\nAttempt failed, cooling down...");
    delay(2000);
  }

  // All 3 retries failed — clear stored credentials and reboot into AP mode
  Serial.println("\nAll WiFi attempts failed. Clearing credentials for portal re-config.");
  lcd.clear();
  lcd.print("WiFi FAILED");
  lcd.setCursor(0, 1);
  lcd.print("Clearing creds...");
  clearWiFiCredentials();
  delay(3000);
  ESP.restart();
  return false;  // unreachable — ESP restarts above
}

void initWiFi() {
  char ssid[33] = {0};
  char pass[65] = {0};

  if (readWiFiCredentials(ssid, pass)) {
    // WiFi credentials found in EEPROM -- connect in STA mode
    Serial.printf("WiFi from EEPROM: SSID=%s\n", ssid);
    connectToWiFi(ssid, pass);
  } else {
    // No WiFi credentials -- start captive portal
    Serial.println("No WiFi credentials -- starting captive portal");
    lcd.clear();
    lcd.print("WiFi Setup Mode");
    lcd.setCursor(0, 1);
    lcd.print("Connect to AP:");

    // Build AP name from MAC for LCD display
    String apName = "MUSHROOM_" + WiFi.macAddress().substring(WiFi.macAddress().length() - 5);
    apName.replace(":", "");
    lcd.setCursor(0, 2);
    lcd.print(apName);

    startCaptivePortal();
    // Portal blocks until user submits credentials and device reboots
  }
}
