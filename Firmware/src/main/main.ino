

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

    // Set up the WiFi connection (reads credentials from EEPROM or starts captive portal)
    initWiFi();

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
                readBagSensorNew();
                readFromCO2();
                readDHTSensor();
                checkForRelay();
                delay(1000);
                return;
            }
        } else {
            lcd.setCursor(0, 3);
            lcd.print("WiFi: OK            ");
        }

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
            checkForRelay();
            publishTelemetry();
            lastTime = currentTime;
        } else {
            // Between intervals: still read sensors and control relays locally
            readBagSensorNew();
            readFromCO2();
            readDHTSensor();
            checkForRelay();
        }
    } else {
        // ═══════════════════════════════════════════
        //  HTTP BOOTSTRAP MODE (existing behavior + provision polling)
        // ═══════════════════════════════════════════

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
    EEPROM.commit();
}
