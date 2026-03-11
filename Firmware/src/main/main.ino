

#include"configuration.h"
#include "nvs_flash.h"

AsyncWebServer server(80);

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n=== SYSTEM BOOTING ===");

    // ─── Risk 4: Log deep sleep wake reason ──────────────────────────
#ifdef ENABLE_DEEP_SLEEP
    esp_sleep_wakeup_cause_t wakeReason = esp_sleep_get_wakeup_cause();
    switch (wakeReason) {
        case ESP_SLEEP_WAKEUP_TIMER:
            Serial.println("Wake: timer (deep sleep cycle)");
            break;
        case ESP_SLEEP_WAKEUP_EXT0:
        case ESP_SLEEP_WAKEUP_EXT1:
            Serial.println("Wake: external signal");
            break;
        default:
            Serial.println("Wake: normal boot / reset");
            break;
    }
#endif

    // Initialize I2C first
    Wire.begin(21, 22);

    lcd.begin(); // standard init for this library
    lcd.backlight();
    lcd.clear();
    lcd.print("SYSTEM STARTING...");
    delay(1000);

    // ─── Risk 2: Initialize hardware watchdog timer ─────────────────
    esp_task_wdt_init(WDT_TIMEOUT_SECONDS, true);  // true = panic (reboot) on timeout
    esp_task_wdt_add(NULL);                          // Add current (loop) task to watchdog
    Serial.printf("Watchdog: %ds timeout enabled\n", WDT_TIMEOUT_SECONDS);

    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        nvs_flash_erase();
        nvs_flash_init();
    }
    // Initialize EEPROM FIRST — WiFi credentials are stored there
    // (must happen before initWiFi so we can read SSID/password or start portal)
    eepromInit();

    // ─── Risk 5: Config version mismatch detection ──────────────────
    // Must run BEFORE runtime config log so we see the corrected values
    uint8_t storedVersion = EEPROM.read(ADDR_CONFIG_VERSION);
    if (storedVersion != CONFIG_VERSION) {
        Serial.printf("Config version mismatch: stored=%d, firmware=%d — resetting EEPROM to defaults\n",
                      storedVersion, CONFIG_VERSION);
        lcd.clear();
        lcd.print("Config Reset...");
        // Preserve WiFi credentials and license key across config resets
        char savedSSID[33] = {0};
        char savedPass[65] = {0};
        bool hadWiFi = readWiFiCredentials(savedSSID, savedPass);
        char savedLicenseKey[20] = {0};
        strncpy(savedLicenseKey, licenseKey, 19);
        uint8_t savedKeyFlag = EEPROM.read(ADDR_KEY_FLAG);

        // Clear ALL EEPROM (wipes stale MQTT host, API URL, provisioning flags)
        for (int i = 0; i < EEPROM_MEMORY_SIZE; i++) {
            EEPROM.write(i, 255);
        }

        // Write new config version
        EEPROM.write(ADDR_CONFIG_VERSION, CONFIG_VERSION);

        // Restore WiFi credentials
        if (hadWiFi) {
            saveWiFiCredentials(savedSSID, savedPass);
        }

        // Restore license key if it was valid
        if (savedKeyFlag != 255 && strlen(savedLicenseKey) >= 4) {
            writeStringToEEPROM(ADDR_KEY_FLAG, savedLicenseKey);
        }

        // Write default threshold values
        writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
        writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
        writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);

        EEPROM.commit();
        Serial.println("EEPROM reset complete — MQTT/API cleared, will use defaults");
        delay(1000);
        // Re-read EEPROM to load fresh defaults (MQTT provisioned=false, API URL=bootstrap)
        eepromInitialized = false;
        eepromInit();
    } else {
        // Version matches — stamp for first-time devices (255 → CONFIG_VERSION)
        // No-op if already stamped
    }

    // ─── 2-Stage Boot: Log runtime config AFTER config version check ──
    Serial.println("=== RUNTIME CONFIG ===");
    Serial.print("API URL: "); Serial.println(apiBaseURL);
    Serial.print("MQTT Host: "); Serial.println(mqttHost[0] ? mqttHost : mqttBrokerHost);
    Serial.print("MQTT Port: "); Serial.println(mqttBrokerPort);
    Serial.print("MQTT Provisioned: "); Serial.println(mqttProvisioned ? "YES" : "NO (HTTP bootstrap)");
    Serial.print("Config source: "); Serial.println(EEPROM.read(ADDR_API_BASE_URL) != 255 ? "EEPROM (provisioned)" : "BOOTSTRAP (default)");
    Serial.println("=====================");

    // Setup Mode check: if EEPROM is blank or key is too short, enter USB provisioning
    if (EEPROM.read(ADDR_KEY_FLAG) == 255 || strlen(licenseKey) < 4) {
        enterSetupMode();
    }

    // ─── Risk 3: Sequential initialization with proper ordering ─────
    // Step 1: WiFi MUST connect before anything network-related
    esp_task_wdt_reset();  // Feed watchdog before WiFi (can take 30s+)
    initWiFi();

    // Step 2: NTP sync MUST succeed before sending telemetry
    // (timestamps must be valid for TLS and data integrity)
    if (WiFi.status() == WL_CONNECTED) {
        configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
        Serial.print("NTP sync...");
        struct tm timeinfo;
        int ntpRetries = 0;
        while (!getLocalTime(&timeinfo, 5000) && ntpRetries < 3) {
            ntpRetries++;
            Serial.printf(" retry %d/3...", ntpRetries);
            esp_task_wdt_reset();  // Feed watchdog during NTP retries
            delay(1000);
        }
        if (getLocalTime(&timeinfo, 5000)) {
            Serial.println(&timeinfo, " %Y-%m-%d %H:%M:%S IST");
            ntpSynced = true;
        } else {
            Serial.println(" NTP failed after 3 retries (timestamps may be invalid)");
            ntpSynced = false;
        }
    } else {
        Serial.println("WiFi not connected — skipping NTP sync");
        ntpSynced = false;
    }

    esp_task_wdt_reset();  // Feed watchdog before device init

    // Step 3: Initialize the connected devices (sensors, relays, auth)
    // Note: eepromInit() already called above, initializeDevices() will skip it
    initializeDevices();

    // Step 4: MQTT connection (only if WiFi is up and provisioned)
    if (mqttProvisioned) {
        if (WiFi.status() == WL_CONNECTED) {
            Serial.println("=== MQTT RUNTIME MODE ===");
            esp_task_wdt_reset();  // Feed watchdog before MQTT (TLS handshake can be slow)
            setupMQTT();
            connectMQTT();
        } else {
            Serial.println("=== MQTT MODE (WiFi down — will connect later) ===");
            setupMQTT();  // Configure but don't connect yet
        }
    } else {
        Serial.println("=== HTTP BOOTSTRAP MODE ===");
    }

    // ─── OTA Boot Validation ───────────────────────────────────────
    // After successful initialization (WiFi + MQTT), mark new firmware
    // as valid so the bootloader won't roll back on next reboot.
    const esp_partition_t* running = esp_ota_get_running_partition();
    esp_ota_img_states_t ota_state;
    if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
        if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
            Serial.println("OTA: New firmware validated — marking as good");
            esp_ota_mark_app_valid_cancel_rollback();
        }
    }
    Serial.printf("Firmware version: %s\n", FIRMWARE_VERSION);
    Serial.printf("Running partition: %s\n", running->label);

    esp_task_wdt_reset();  // Feed watchdog before welcome screen (has delays)

    // Print the welcome screen
    welcomeScreen();
    lcd.clear();
}

void loop() {
    // ─── Risk 2: Feed hardware watchdog every loop iteration ────────
    esp_task_wdt_reset();

    // If the button is pressed, the ISR(interrupt service routine)
    // sets state to high, thus below conditional is called which opens up the menu
    if(state == HIGH)  {
      detachInterrupt(BUTTON);
      openMenu();
      state = LOW;
    }
    unsigned long currentTime = millis();

    // ─── Risk 3: Retry NTP sync if it failed during boot ────────────
    if (!ntpSynced && WiFi.status() == WL_CONNECTED) {
        struct tm timeinfo;
        if (getLocalTime(&timeinfo, 2000)) {
            ntpSynced = true;
            Serial.println("NTP: Late sync succeeded");
        }
    }

    if (mqttProvisioned) {
        // ═══════════════════════════════════════════
        //  MQTT RUNTIME MODE
        // ═══════════════════════════════════════════

        // ─── Risk 1: Non-blocking WiFi reconnect with exponential backoff ───
        if (WiFi.status() != WL_CONNECTED) {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: DOWN          ");
            // Use dynamic backoff interval instead of fixed 10s
            if (currentTime - lastWifiReconnectAttempt >= wifiBackoffInterval) {
                lastWifiReconnectAttempt = currentTime;
                reconnectWiFi();  // Non-blocking (max 2s check)
            }
            if (WiFi.status() != WL_CONNECTED) {
                // WiFi still down — sensors keep reading locally (Risk 1: sensors never stop)
                readBagSensorNew();
                readFromCO2();
                readDHTSensor();
                delay(1000);
                return;
            }
        } else {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: OK            ");
            // Reset backoff on stable connection
            if (wifiConsecutiveFailures > 0) {
                wifiConsecutiveFailures = 0;
                wifiBackoffInterval = 10000;
            }
        }

        lcd.setCursor(0, 2);
        lcd.print("MQTT Mode           ");

        mqttLoop();  // Process incoming MQTT messages

        if (deviceDisabled) {
            // Device killed via MQTT control topic — just keep MQTT alive for re-enable
            delay(1000);
            return;
        }

        if (currentTime - lastTime >= timerDelay) {
            // Every 30 seconds: read sensors and publish telemetry via MQTT
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
            // ─── Risk 3: Only publish telemetry if NTP has synced ────────
            if (ntpSynced) {
                publishTelemetry();
            } else {
                Serial.println("Skipping MQTT publish — NTP not synced (invalid timestamps)");
            }
            lastTime = currentTime;
        } else {
            // Between intervals: still read sensors locally
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
        }
    } else {
        // ═══════════════════════════════════════════
        //  HTTP BOOTSTRAP MODE (existing behavior + provision polling)
        // ═══════════════════════════════════════════

        lcd.setCursor(0, 2);
        lcd.print("HTTP Mode           ");

        // ─── Risk 1: Non-blocking WiFi reconnect with exponential backoff ───
        if (WiFi.status() != WL_CONNECTED) {
          lcd.setCursor(0, 3);
          lcd.print("WiFi: DOWN          ");
          if (currentTime - lastWifiReconnectAttempt >= wifiBackoffInterval) {
            lastWifiReconnectAttempt = currentTime;
            reconnectWiFi();  // Non-blocking
          }
        } else {
          lcd.setCursor(0, 3);
          lcd.print("WiFi: OK            ");
          if (wifiConsecutiveFailures > 0) {
              wifiConsecutiveFailures = 0;
              wifiBackoffInterval = 10000;
          }
        }

        // After every 30 minutes: re-authenticate device key + heartbeat
        if(currentTime - lastTimeAuthentication > keyAuthenticationTimer) {
          lcd.clear();
          lcd.setCursor(0,0);
          if (WiFi.status() != WL_CONNECTED) {
            lcd.setCursor(0,3);
            lcd.print(" WiFi DISCONNECTED  ");
            delay(2000);
            esp_task_wdt_reset();  // Feed watchdog before WiFi init
            initWiFi();
          }
          lcd.print("Authenticating Key");
          lcd.setCursor(0,1);
          lcd.print(licenseKey);
          if (!authenticateDevKey(licenseKey)) {
            lcd.clear();
            lcd.print("DEVICE KEY INVALID");
            while(true) { esp_task_wdt_reset(); }  // Keep watchdog alive during halt
          }
          sendHeartbeat();  // Send heartbeat during auth cycle
          lcd.clear();
          lastTimeAuthentication = currentTime;
        }

        // Every 30 seconds: read sensors, send data, poll for provision
        if(currentTime - lastTime < timerDelay) {
          readBagSensorNew();
          readFromCO2();
          readDHTSensor();
          checkForRelay();
        }
        else {
          // Check WiFi before sending HTTP data
          if (WiFi.status() == WL_CONNECTED) {
            lcd.setCursor(0,3);
            lcd.print(" SENDING DATA ONLINE ");
            Serial.println("SENDING HTTP REQUEST");
            // ─── Risk 3: Only send HTTP data if NTP has synced ──────────
            if (ntpSynced) {
                sendHTTPRequest();
            } else {
                Serial.println("Skipping HTTP send — NTP not synced (invalid timestamps)");
            }

            // Poll for MQTT provisioning credentials (no timestamp needed)
            pollProvisionEndpoint();
          } else {
            lcd.setCursor(0,3);
            lcd.print("WiFi DOWN-skip HTTP ");
            Serial.println("WiFi down — skipping HTTP request");
          }

          lastTime = currentTime;
          delay(2000);
        }
    }

    // ─── Risk 4: Deep sleep check ───────────────────────────────────
#ifdef ENABLE_DEEP_SLEEP
    checkDeepSleep();
#endif

    if (eepromDirty) {
        EEPROM.commit();
        eepromDirty = false;
    }
}

void enterSetupMode() {
    Serial.println("\n=== SETUP MODE ===");
    Serial.print("MAC:");
    Serial.println(WiFi.macAddress());
    Serial.println("AWAITING_KEY");

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("=== SETUP MODE ===");
    lcd.setCursor(0, 1);
    lcd.print("Connect via USB...");
    lcd.setCursor(0, 2);
    lcd.print("MAC:");
    lcd.print(WiFi.macAddress());

    pinMode(2, OUTPUT);
    unsigned long lastBlink = 0;
    bool ledState = false;

    while (true) {
        esp_task_wdt_reset();  // Risk 2: Feed watchdog in setup mode loop
        if (millis() - lastBlink > 500) {
            ledState = !ledState;
            digitalWrite(2, ledState);
            lastBlink = millis();
        }
        if (Serial.available()) {
            String input = Serial.readStringUntil('\n');
            input.trim();
            if (input.startsWith("KEY:")) {
                String key = input.substring(4);
                key.trim();
                if (key.length() == 18 && key.startsWith("LIC-")) {
                    char keyArr[20];
                    key.toCharArray(keyArr, 20);
                    writeStringToEEPROM(ADDR_KEY_FLAG, keyArr);
                    for (int i = 0; i < 18; i++) licenseKey[i] = keyArr[i];
                    licenseKey[18] = '\0';
                    writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
                    writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
                    writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
                    EEPROM.commit();
                    Serial.println("KEY_OK:" + key);
                    lcd.clear();
                    lcd.print("Key Saved!");
                    lcd.setCursor(0, 1);
                    lcd.print(key);
                    delay(2000);
                    ESP.restart();
                } else {
                    Serial.println("KEY_ERR:Invalid format");
                }
            } else if (input == "PING") {
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

// ─── Risk 4: Deep Sleep Function ────────────────────────────────────
// Only compiled when ENABLE_DEEP_SLEEP is defined.
// Enters deep sleep after DEEP_SLEEP_IDLE_MINUTES of no significant
// sensor changes. Wakes on timer to take a reading.
#ifdef ENABLE_DEEP_SLEEP
void checkDeepSleep() {
    if (DEEP_SLEEP_IDLE_MINUTES == 0) return;  // Deep sleep disabled

    // Check for significant sensor changes (thresholds: 50ppm CO2, 0.5C temp, 1% humidity)
    bool sensorChanged = false;
    if (abs((int)co2 - (int)lastCO2ForSleep) > 50) sensorChanged = true;
    if (abs(temperature - lastTempForSleep) > 0.5) sensorChanged = true;
    if (abs(humidity - lastHumForSleep) > 1.0) sensorChanged = true;

    if (sensorChanged) {
        lastCO2ForSleep = co2;
        lastTempForSleep = temperature;
        lastHumForSleep = humidity;
        lastSensorChangeTime = millis();
        return;
    }

    // Initialize lastSensorChangeTime on first run
    if (lastSensorChangeTime == 0) {
        lastSensorChangeTime = millis();
        return;
    }

    unsigned long idleMinutes = (millis() - lastSensorChangeTime) / 60000;
    if (idleMinutes >= DEEP_SLEEP_IDLE_MINUTES) {
        Serial.printf("Deep sleep: %lu min idle (threshold: %d min). Sleeping for %llu us\n",
                      idleMinutes, DEEP_SLEEP_IDLE_MINUTES, DEEP_SLEEP_WAKE_INTERVAL_US);
        lcd.clear();
        lcd.print("DEEP SLEEP...");
        lcd.setCursor(0, 1);
        lcd.print("Wake in 5 min");
        delay(2000);

        // Disconnect cleanly before sleep
        if (mqttProvisioned && mqttClient.connected()) {
            String statusTopic = "device/" + String(licenseKey) + "/status";
            mqttClient.publish(statusTopic.c_str(), "{\"status\":\"sleeping\"}", true);
            mqttClient.disconnect();
        }
        WiFi.disconnect(true);

        esp_sleep_enable_timer_wakeup(DEEP_SLEEP_WAKE_INTERVAL_US);
        esp_deep_sleep_start();
        // Device resets after waking — setup() runs again
    }
}
#endif
