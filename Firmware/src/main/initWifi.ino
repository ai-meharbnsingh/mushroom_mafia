bool serverStarted = false;

// Non-blocking WiFi reconnect — used in main loop, does NOT reboot on failure
bool reconnectWiFi() {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Reconnecting...");
    Serial.println("WiFi reconnecting (non-blocking)...");

    WiFi.reconnect();  // ESP32 remembers last SSID/password

    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 30000) {
        delay(500);
        Serial.print(".");
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi reconnected! IP: " + WiFi.localIP().toString());
        lcd.setCursor(0, 0);
        lcd.print("WiFi: RECONNECTED   ");
        setupServer();  // Ensure web server is running
        return true;
    }

    Serial.println("\nWiFi reconnect failed.");
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

void initWiFi() {
  const char* ssid = "Jas_Mehar";
  const char* pass = "airtel2730";

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
      return; // Success!
    }
    
    Serial.println("\nAttempt failed, cooling down...");
    delay(2000);
  }

  // If all 3 retries fail
  Serial.println("\nAll WiFi attempts failed.");
  lcd.clear();
  lcd.print("WiFi FAILED");
  lcd.setCursor(0, 1);
  lcd.print("Check Router");
  delay(5000);
  ESP.restart();
}
