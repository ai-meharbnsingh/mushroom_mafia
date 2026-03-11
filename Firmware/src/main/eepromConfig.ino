// eepromConfig.ino
//
// Functions for reading and writing data to EEPROM memory.
// Updated for Phase D: expanded EEPROM layout (256 bytes) with MQTT provisioning data.


// writeToEeprom<T>() template is defined in configuration.h
// to avoid PlatformIO auto-prototype generation issues.

void writeStringToEEPROM(int addrOffset, char *strToWrite)  {
  // Writes a string to the EEPROM at the specified address offset.
  // First byte = string length, followed by the characters.
  // Supports variable-length strings (not hardcoded to 12).
  int len = strlen(strToWrite);
  EEPROM.write(addrOffset, len);
  for (int i = 0; i < len; i++)
  {
    EEPROM.write(addrOffset + 1 + i, strToWrite[i]);
  }
}

void readFromEeprom() {
  // Reads data from EEPROM and assigns the values to respective variables.
  // Supports both legacy 12-char deviceKey and new 18-char licenseKey.
  delay(2000);
  if(EEPROM.read(ADDR_KEY_FLAG) == 255 )  {
#ifdef DEBUG_MODE
    // ─── Risk 6: Hardcoded dev key only available in DEBUG builds ───
    Serial.println("EEPROM EMPTY — auto-writing dev license key (DEBUG_MODE)");
    char devKey[] = "LIC-877V-4REX-K60T";
    writeStringToEEPROM(ADDR_KEY_FLAG, devKey);
    for (int i = 0; i < 18; i++) { licenseKey[i] = devKey[i]; }
    licenseKey[18] = '\0';
    for (int i = 0; i < 12; i++) { deviceKey[i] = devKey[i]; }
    writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
    writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
    writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
    EEPROM.commit();
    Serial.println("Dev key written: " + String(licenseKey));
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("Dev Key Loaded");
    lcd.setCursor(0,1);
    lcd.print(licenseKey);
    delay(2000);
    return;
#else
    // ─── Risk 6: Production — no hardcoded keys. Setup Mode will handle it. ───
    Serial.println("EEPROM EMPTY — no license key. Device will enter Setup Mode.");
    return;
#endif
  }

  delay(100);
  String keyTemp = readStringFromEEPROM(ADDR_KEY_FLAG);
  int keyLen = keyTemp.length();
  Serial.println("KEY FOUND (length " + String(keyLen) + ")");
  Serial.println(keyTemp);

  if (keyLen >= 18) {
    // New 18-char license key (LIC-XXXX-YYYY-ZZZZ)
    for(int i = 0; i < 18; i++) {
      licenseKey[i] = keyTemp[i];
    }
    licenseKey[18] = '\0';
    // Also populate legacy deviceKey with first 12 chars for backward compat
    for(int i = 0; i < 12 && i < keyLen; i++) {
      deviceKey[i] = keyTemp[i];
    }
    Serial.println("License key loaded: " + String(licenseKey));
  } else {
    // Legacy 12-char device key — HTTP-only mode
    for(int i = 0; i < 12 && i < keyLen; i++) {
      deviceKey[i] = keyTemp[i];
    }
    // Copy into licenseKey too so HTTP functions can use it uniformly
    for(int i = 0; i < keyLen; i++) {
      licenseKey[i] = keyTemp[i];
    }
    licenseKey[keyLen] = '\0';
    Serial.println("Legacy device key loaded (HTTP-only mode)");
  }

  // No legacy WiFi migration — new devices use captive portal

  EEPROM.get(ADDR_CO2_RELAY_STATUS, _co2RelayStatus);
  EEPROM.get(ADDR_HUM_RELAY_STATUS, _humidityRelayStatus);
  EEPROM.get(ADDR_AC_RELAY_STATUS, _ACRelayStatus);

  Serial.println(_co2RelayStatus);
  Serial.println(_humidityRelayStatus);
  Serial.println(_ACRelayStatus);

  // Read expanded relay states (addresses 171-174)
  // Legacy migration: if EEPROM byte == 255 (uninitialized), default to OFF
  uint8_t ahuRaw = EEPROM.read(ADDR_AHU_RELAY_STATUS);
  uint8_t hum2Raw = EEPROM.read(ADDR_HUM2_RELAY_STATUS);
  uint8_t ductRaw = EEPROM.read(ADDR_DUCT_RELAY_STATUS);
  uint8_t extraRaw = EEPROM.read(ADDR_EXTRA_RELAY_STATUS);

  _ahuRelayStatus = (ahuRaw == 255) ? false : (bool)ahuRaw;
  _humidifierRelayStatus = (hum2Raw == 255) ? false : (bool)hum2Raw;
  _ductFanRelayStatus = (ductRaw == 255) ? false : (bool)ductRaw;
  _extraRelayStatus = (extraRaw == 255) ? false : (bool)extraRaw;

  // Initialize uninitialized EEPROM slots to 0
  if (ahuRaw == 255) { EEPROM.write(ADDR_AHU_RELAY_STATUS, 0); }
  if (hum2Raw == 255) { EEPROM.write(ADDR_HUM2_RELAY_STATUS, 0); }
  if (ductRaw == 255) { EEPROM.write(ADDR_DUCT_RELAY_STATUS, 0); }
  if (extraRaw == 255) { EEPROM.write(ADDR_EXTRA_RELAY_STATUS, 0); }

  Serial.print("AHU relay: "); Serial.println(_ahuRelayStatus);
  Serial.print("Humidifier relay: "); Serial.println(_humidifierRelayStatus);
  Serial.print("Duct fan relay: "); Serial.println(_ductFanRelayStatus);
  Serial.print("Extra relay: "); Serial.println(_extraRelayStatus);

  EEPROM.get(ADDR_MIN_VAL_CO2, CO2MinValue);
  EEPROM.get(ADDR_MIN_VAL_TEMP, tempMinValue);
  EEPROM.get(ADDR_MIN_VAL_HUM, humidityMin);
  EEPROM.get(ADDR_DEVICE_ID, deviceId);

  Serial.println(CO2MinValue);
  Serial.println(tempMinValue);
  Serial.println(humidityMin);
  Serial.print("Device ID: ");
  Serial.println(deviceId);

  // Read MQTT provisioning data
  readMQTTCredentials();

  // Read API base URL from EEPROM (2-stage boot pattern)
  uint8_t apiUrlLen = EEPROM.read(ADDR_API_BASE_URL);
  if (apiUrlLen > 0 && apiUrlLen < 100 && apiUrlLen != 255) {
      for (int i = 0; i < apiUrlLen; i++) {
          apiBaseURL[i] = (char)EEPROM.read(ADDR_API_BASE_URL + 1 + i);
      }
      apiBaseURL[apiUrlLen] = '\0';
      Serial.print("API URL from EEPROM: ");
      Serial.println(apiBaseURL);
  } else {
      // No URL in EEPROM — use bootstrap URL as fallback
      strncpy(apiBaseURL, BOOTSTRAP_URL, sizeof(apiBaseURL) - 1);
      apiBaseURL[sizeof(apiBaseURL) - 1] = '\0';
      Serial.print("API URL (bootstrap fallback): ");
      Serial.println(apiBaseURL);
  }

  // Note: Config version check + stamp is handled in main.ino setup()
  // Do NOT stamp here — main.ino needs to see the mismatch first to trigger EEPROM reset
}

// ─── WiFi Credential Functions (Captive Portal) ───────────────────────

void saveWiFiCredentials(const char* ssid, const char* password) {
    // Write SSID: length byte at ADDR_WIFI_SSID, then chars
    uint8_t ssidLen = strlen(ssid);
    if (ssidLen > 32) ssidLen = 32;
    EEPROM.write(ADDR_WIFI_SSID, ssidLen);
    for (uint8_t i = 0; i < ssidLen; i++) {
        EEPROM.write(ADDR_WIFI_SSID + 1 + i, ssid[i]);
    }
    // Write Password: length byte at ADDR_WIFI_PASSWORD, then chars
    uint8_t passLen = strlen(password);
    if (passLen > 64) passLen = 64;
    EEPROM.write(ADDR_WIFI_PASSWORD, passLen);
    for (uint8_t i = 0; i < passLen; i++) {
        EEPROM.write(ADDR_WIFI_PASSWORD + 1 + i, password[i]);
    }
    // Set provisioned flag
    EEPROM.write(ADDR_WIFI_PROVISIONED, 1);
    EEPROM.commit();
    Serial.println("WiFi credentials saved to EEPROM");
}

bool readWiFiCredentials(char* ssid, char* password) {
    uint8_t flag = EEPROM.read(ADDR_WIFI_PROVISIONED);
    if (flag != 1) return false;  // Not provisioned (0 or 255)

    uint8_t ssidLen = EEPROM.read(ADDR_WIFI_SSID);
    if (ssidLen == 0 || ssidLen > 32 || ssidLen == 255) return false;
    for (uint8_t i = 0; i < ssidLen; i++) {
        ssid[i] = EEPROM.read(ADDR_WIFI_SSID + 1 + i);
    }
    ssid[ssidLen] = '\0';

    uint8_t passLen = EEPROM.read(ADDR_WIFI_PASSWORD);
    if (passLen > 64 || passLen == 255) passLen = 0;
    for (uint8_t i = 0; i < passLen; i++) {
        password[i] = EEPROM.read(ADDR_WIFI_PASSWORD + 1 + i);
    }
    password[passLen] = '\0';

    return true;
}

void clearWiFiCredentials() {
    EEPROM.write(ADDR_WIFI_PROVISIONED, 0);
    EEPROM.commit();
    Serial.println("WiFi credentials cleared from EEPROM");
}

// ─── MQTT Credential Functions ────────────────────────────────────────

void saveMQTTCredentials(const char* password, const char* host, int port) {
  // Save MQTT credentials to EEPROM after provisioning.
  // password: MQTT auth password (max 64 chars)
  // host: MQTT broker hostname (max 64 chars)
  // port: MQTT broker port

  // Write provisioned flag
  EEPROM.write(ADDR_MQTT_PROVISIONED, 1);

  // Write password (raw bytes, null-terminated)
  int pwdLen = strlen(password);
  if (pwdLen > 64) pwdLen = 64;
  for (int i = 0; i < pwdLen; i++) {
    EEPROM.write(ADDR_DEVICE_PASSWORD + i, password[i]);
  }
  EEPROM.write(ADDR_DEVICE_PASSWORD + pwdLen, '\0');

  // Write host (raw bytes, null-terminated)
  int hostLen = strlen(host);
  if (hostLen > 64) hostLen = 64;
  for (int i = 0; i < hostLen; i++) {
    EEPROM.write(ADDR_MQTT_HOST + i, host[i]);
  }
  EEPROM.write(ADDR_MQTT_HOST + hostLen, '\0');

  // Write port
  EEPROM.put(ADDR_MQTT_PORT, port);

  EEPROM.commit();
  Serial.println("MQTT credentials saved to EEPROM");
}

void readMQTTCredentials() {
  // Read MQTT provisioning data from EEPROM.
  // Sets mqttProvisioned, devicePassword, mqttHost, mqttBrokerPort globals.

  uint8_t provFlag = EEPROM.read(ADDR_MQTT_PROVISIONED);

  if (provFlag == 1) {
    mqttProvisioned = true;

    // Read password
    for (int i = 0; i < 64; i++) {
      devicePassword[i] = EEPROM.read(ADDR_DEVICE_PASSWORD + i);
      if (devicePassword[i] == '\0') break;
    }
    devicePassword[64] = '\0';

    // Read host
    for (int i = 0; i < 64; i++) {
      mqttHost[i] = EEPROM.read(ADDR_MQTT_HOST + i);
      if (mqttHost[i] == '\0') break;
    }
    mqttHost[64] = '\0';

    // Read port
    int storedPort = 0;
    EEPROM.get(ADDR_MQTT_PORT, storedPort);
    if (storedPort > 0 && storedPort < 65536) {
      mqttBrokerPort = storedPort;
    }

    // Fix stale "localhost" MQTT host from old provisioning
    if (String(mqttHost) == "localhost") {
      Serial.println("Stale MQTT host 'localhost' — clearing provisioning for re-provision");
      EEPROM.write(ADDR_MQTT_PROVISIONED, 255);
      EEPROM.commit();
      mqttProvisioned = false;
      Serial.println("MQTT provisioned: NO (cleared stale localhost)");
      return;
    }

    Serial.println("MQTT provisioned: YES");
    Serial.print("MQTT Host: ");
    Serial.println(mqttHost);
    Serial.print("MQTT Port: ");
    Serial.println(mqttBrokerPort);
  } else {
    mqttProvisioned = false;
    Serial.println("MQTT provisioned: NO (HTTP bootstrap mode)");
  }
}

// ─── API Base URL Functions (2-stage boot) ───────────────────────────

void saveApiBaseUrl(const char* url) {
    uint8_t len = strlen(url);
    if (len >= 100) len = 99;  // Safety cap
    EEPROM.write(ADDR_API_BASE_URL, len);
    for (int i = 0; i < len; i++) {
        EEPROM.write(ADDR_API_BASE_URL + 1 + i, url[i]);
    }
    EEPROM.commit();
    strncpy(apiBaseURL, url, sizeof(apiBaseURL) - 1);
    apiBaseURL[sizeof(apiBaseURL) - 1] = '\0';
    Serial.print("API URL saved: ");
    Serial.println(apiBaseURL);
}

bool eepromInitialized = false;

void eepromInit() {
  // Initializes the EEPROM and reads the stored values from it.
  // Guard against double-init (called from setup() before initWiFi, and from initializeDevices)
  if (eepromInitialized) return;
  eepromInitialized = true;
  Serial.println("start...");
  EEPROM.begin(EEPROM_MEMORY_SIZE);  // ESP32 Arduino core 3.x: begin() returns void
  readFromEeprom();
}
