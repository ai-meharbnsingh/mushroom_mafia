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
    Serial.println("EEPROM EMPTY — auto-writing dev license key");
    // Dev mode: auto-write a known license key instead of joystick input
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

  EEPROM.get(ADDR_CO2_RELAY_STATUS, _co2RelayStatus);
  EEPROM.get(ADDR_HUM_RELAY_STATUS, _humidityRelayStatus);
  EEPROM.get(ADDR_AC_RELAY_STATUS, _ACRelayStatus);

  Serial.println(_co2RelayStatus);
  Serial.println(_humidityRelayStatus);
  Serial.println(_ACRelayStatus);

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
}

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

void eepromInit() {
  // Initializes the EEPROM and reads the stored values from it.
  Serial.println("start...");
  EEPROM.begin(EEPROM_MEMORY_SIZE);  // ESP32 Arduino core 3.x: begin() returns void
  readFromEeprom();
}
