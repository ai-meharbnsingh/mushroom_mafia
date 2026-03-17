bool authenticateDevKey(const char* tempDevKey) {
    esp_task_wdt_reset();  // Feed watchdog before TLS operation
    StaticJsonDocument<200> doc;
    WiFiClientSecure client;
    client.setInsecure();
    client.setTimeout(10);  // 10 second TLS timeout
    HTTPClient http;

    String newAuthURL = String(apiBaseURL) + String(registerEndpoint);
    http.begin(client, newAuthURL);
    http.setTimeout(10000);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Key", String(tempDevKey));

    String jsonPayload = "{\"license_key\":\"" + String(tempDevKey) + "\",";
    jsonPayload += "\"mac_address\":\"" + WiFi.macAddress() + "\",";
    jsonPayload += "\"firmware_version\":\"" + String(FIRMWARE_VERSION) + "\"}";

    Serial.println("Auth URL: " + newAuthURL);
    int httpResponseCode = http.POST(jsonPayload);
    Serial.print("Auth Response code: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode == 200 || httpResponseCode == 201) {
        String response = http.getString();
        deserializeJson(doc, response);
        if (doc.containsKey("device_id")) {
            deviceId = doc["device_id"];
            writeToEeprom<int>(ADDR_DEVICE_ID, deviceId);
            EEPROM.commit();
        }
        lcd.clear();
        lcd.print("AUTHENTICATED");
        http.end();
        return true;
    }
    http.end();
    lcd.clear();
    lcd.print("AUTH ERROR: ");
    lcd.print(httpResponseCode);
    delay(3000);
    return false;
}

String readStringFromEEPROM(int addrOffset) {
  int newStrLen = EEPROM.read(addrOffset);
  if (newStrLen == 255 || newStrLen == 0) return "";
  char data[newStrLen + 1];
  for (int i = 0; i < newStrLen; i++) {
    data[i] = EEPROM.read(addrOffset + 1 + i);
  }
  data[newStrLen] = '\0';
  return String(data);
}

void inputKey() {
  String deviceKeyTemp = "";
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("KEY AUTHENTICATION");
  lcd.setCursor(0,1);
  Serial.println("\n--- LICENSE KEY INPUT ---");
  Serial.println("Type your key in Serial Monitor and press Enter.");

#ifdef DEBUG_MODE
  // ─── Risk 6: Auto-auth with dev key only in DEBUG builds ──────
  lcd.print("Auto-Auth in 10s...");
  Serial.println("Waiting 10s for auto-auth (DEBUG_MODE)...");
  unsigned long startTime = millis();
  bool keyEntered = false;

  while (millis() - startTime < 10000) {
    esp_task_wdt_reset();  // Feed watchdog during wait
    if (Serial.available()) {
      deviceKeyTemp = Serial.readStringUntil('\n');
      deviceKeyTemp.trim();
      if (deviceKeyTemp.length() > 0) {
        keyEntered = true;
        break;
      }
    }
    lcd.setCursor(15, 1);
    lcd.print(10 - (millis() - startTime) / 1000);
    lcd.print("s ");
    delay(100);
  }

  if (!keyEntered) {
    deviceKeyTemp = "LIC-877V-4REX-K60T";
    Serial.println("No input. Auto-using dev key (DEBUG_MODE)");
    lcd.clear();
    lcd.print("AUTO-USING DEV KEY");
    delay(2000);
  }
#else
  // ─── Risk 6: Production — require manual key entry via Serial ───
  lcd.print("Enter key via USB...");
  Serial.println("Waiting for key input via Serial...");
  while (true) {
    esp_task_wdt_reset();  // Feed watchdog during wait
    if (Serial.available()) {
      deviceKeyTemp = Serial.readStringUntil('\n');
      deviceKeyTemp.trim();
      if (deviceKeyTemp.length() > 0) {
        break;
      }
    }
    delay(100);
  }
#endif

  if(!authenticateDevKey(deviceKeyTemp.c_str()))  {
    Serial.println("Auth Failed. Retrying...");
    inputKey(); 
    return;
  }

  // Success
  for(int i = 0; i < 18; i++) {
    licenseKey[i] = deviceKeyTemp[i];
  }
  licenseKey[18] = '\0';
  writeStringToEEPROM(ADDR_KEY_FLAG, licenseKey);
  
  writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
  writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
  writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
  EEPROM.commit();
  
  lcd.clear();
  lcd.print("SUCCESS!");
  delay(2000);
}
