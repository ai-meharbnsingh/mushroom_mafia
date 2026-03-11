

#include"configuration.h"
#include "nvs_flash.h"

AsyncWebServer server(80);

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n=== SYSTEM BOOTING ===");

    // Initialize I2C first
    Wire.begin(21, 22); 
    
    lcd.begin(); // standard init for this library
    lcd.backlight();
    lcd.clear();
    lcd.print("SYSTEM STARTING...");
    delay(1000);

    // Initialize NVS
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        nvs_flash_erase();
        nvs_flash_init();
    }
    // Initialize EEPROM FIRST — WiFi credentials are stored there
    // (must happen before initWiFi so we can read SSID/password or start portal)
    eepromInit();

    // Setup Mode check: if EEPROM is blank or key is too short, enter USB provisioning
    if (EEPROM.read(ADDR_KEY_FLAG) == 255 || strlen(licenseKey) < 4) {
        enterSetupMode();
    }

    // Set up the WiFi connection (reads credentials from EEPROM or starts captive portal)
    initWiFi();

    // NTP time sync (needed for TLS certificate validation)
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    Serial.print("NTP sync...");
    struct tm timeinfo;
    if (getLocalTime(&timeinfo, 10000)) {
        Serial.println(&timeinfo, " %Y-%m-%d %H:%M:%S IST");
    } else {
        Serial.println(" failed (will retry)");
    }

    // Initialize the connected devices (sensors, relays, auth)
    // Note: eepromInit() already called above, initializeDevices() will skip it
    initializeDevices();

    // Two-stage boot: if MQTT provisioned, set up MQTT connection
    if (mqttProvisioned) {
        Serial.println("=== MQTT RUNTIME MODE ===");
        setupMQTT();
        connectMQTT();
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

    // Print the welcome screen
    welcomeScreen();
    lcd.clear();
}

void loop() {
    // If the button is pressed, the ISR(interrupt service routine)
    // sets state to high, thus below conditional is called which opens up the menu
    if(state == HIGH)  {
      detachInterrupt(BUTTON);
      openMenu();
      state = LOW;
    }
    unsigned long currentTime = millis();

    if (mqttProvisioned) {
        // ═══════════════════════════════════════════
        //  MQTT RUNTIME MODE
        // ═══════════════════════════════════════════

        // WiFi resilience: check connection before MQTT operations
        if (WiFi.status() != WL_CONNECTED) {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: DOWN          ");
            // Backoff: only try reconnect every 10 seconds
            if (currentTime - lastWifiReconnectAttempt >= 10000) {
                lastWifiReconnectAttempt = currentTime;
                reconnectWiFi();
            }
            if (WiFi.status() != WL_CONNECTED) {
                // WiFi still down — skip MQTT ops, keep reading sensors locally
                // Backend controls relays in MQTT mode — no local threshold checking
                readBagSensorNew();
                readFromCO2();
                readDHTSensor();
                delay(1000);
                return;
            }
        } else {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: OK            ");
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
            // Backend controls relays in MQTT mode — no local threshold checking
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
            publishTelemetry();
            lastTime = currentTime;
        } else {
            // Between intervals: still read sensors locally
            // Backend controls relays in MQTT mode — no local threshold checking
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

        // WiFi resilience: check connection before HTTP operations
        if (WiFi.status() != WL_CONNECTED) {
          lcd.setCursor(0, 3);
          lcd.print("WiFi: DOWN          ");
          if (currentTime - lastWifiReconnectAttempt >= 10000) {
            lastWifiReconnectAttempt = currentTime;
            reconnectWiFi();
          }
        } else {
          lcd.setCursor(0, 3);
          lcd.print("WiFi: OK            ");
        }

        // After every 30 minutes: re-authenticate device key + heartbeat
        if(currentTime - lastTimeAuthentication > keyAuthenticationTimer) {
          lcd.clear();
          lcd.setCursor(0,0);
          if (WiFi.status() != WL_CONNECTED) {
            lcd.setCursor(0,3);
            lcd.print(" WiFi DISCONNECTED  ");
            delay(2000);
            initWiFi();
          }
          lcd.print("Authenticating Key");
          lcd.setCursor(0,1);
          lcd.print(licenseKey);
          if (!authenticateDevKey(licenseKey)) {
            lcd.clear();
            lcd.print("DEVICE KEY INVALID");
            while(true) {}  // program halt
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
            sendHTTPRequest();

            // Poll for MQTT provisioning credentials
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
