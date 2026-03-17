#pragma once

#include <Arduino.h>
#include <SensirionI2CScd4x.h>
#include <Wire.h>
#include <EEPROM.h>
#include <WiFi.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HTTPClient.h>
#include "DHT.h"
#include <LiquidCrystal_I2C.h>
#include <Keypad.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <AsyncElegantOTA.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>                // MQTT client — install via Arduino Library Manager: "PubSubClient by Nick O'Leary"
#include <DNSServer.h>                   // DNS server for captive portal redirect
#include <Update.h>                      // Arduino OTA Update library
#include <esp_ota_ops.h>                 // ESP-IDF OTA partition operations (dual-partition rollback)
#include <WiFiClientSecure.h>
#include <mbedtls/sha256.h>          // SHA256 for OTA checksum verification
#include <time.h>
#include <esp_task_wdt.h>                // Hardware watchdog timer (Risk 2)

// ─── Build Flags ──────────────────────────────────────────────────────
// Uncomment to enable debug-only features (hardcoded keys, etc.)
// #define DEBUG_MODE

// Deep sleep: disabled by default (mains-powered devices).
// Uncomment to enable deep sleep after N minutes of no sensor changes.
// #define ENABLE_DEEP_SLEEP

// ─── Watchdog Configuration (Risk 2) ─────────────────────────────────
#define WDT_TIMEOUT_SECONDS 30           // Hardware watchdog timeout

// ─── EEPROM Config Version (Risk 5) ─────────────────────────────────
// Increment this when EEPROM layout changes to auto-reset stale data.
#define CONFIG_VERSION 7  // Current version — increment to force EEPROM reset on existing devices
#define ADDR_CONFIG_VERSION 274           // 1 byte for config version

int row = 0;
int column = 0;

#define joyX 32
#define joyY 33
#define BUTTON 26
bool state = LOW;

char smallKeyboard[2][20] = {
  {'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t'},
  {'B','C','K',' ',' ','A','#','u','v','w','x','y','z','<',' ',' ',' ','E','N','T'}
};

char specialKeyboard[2][20] = {
  {' ',' ',' ','.','_','-','!','@','#','%','$','^','&','*','+','?','/',' ',' ',' '},
  {'B','C','K',' ','a','0','1','2','3','4','5','6','7','8','9','<',' ','E','N','T'}
};

char capitalKeyboard[2][20] = {
  {'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'},
  {'B','C','K',' ',' ','a','#','U','V','W','X','Y','Z','<',' ',' ',' ','E','N','T'}
};
char (*currentKeyboard)[20] = smallKeyboard;

String options[6] = {"Change Relay Value", "Reset to Default", "Factory Reset","Change WiFi" , "Display Bag Reading", "Restart"};

LiquidCrystal_I2C  lcd(0x27, 20, 4);//lcd() and 0x27,20, 4//0X3f

#define DHTPIN 5     // Digital pin connected to the DHT sensor
#define DHTTYPE DHT11   // DHT 11
DHT dht(DHTPIN, DHTTYPE);

OneWire oneWireBusOne(0);
OneWire oneWireBusTwo(17);

DallasTemperature dsTempSensorOne(&oneWireBusOne);
DallasTemperature dsTempSensorTwo(&oneWireBusTwo);

unsigned int deviceCountBus1 = 0;
unsigned int deviceCountBus2 = 0;

//ESP32Time rtc;
SensirionI2CScd4x scd4x;

bool _co2RelayStatus = 0;
bool _humidityRelayStatus = 0;
bool _ACRelayStatus = 0;
bool _ahuRelayStatus = 0;
bool _humidifierRelayStatus = 0;
bool _ductFanRelayStatus = 0;
bool _extraRelayStatus = 0;

// Legacy device key — kept for backward compatibility with old EEPROM data
char deviceKey[12];
uint8_t addr = 0;

// New license key format: LIC-XXXX-YYYY-ZZZZ (18 chars)
char licenseKey[20];

const char* resetCode = "AB1234";
String id = "";

// MQTT Configuration
const char* mqttBrokerHost = "f92600b988e54ae9b2b04e8c04752642.s1.eu.hivemq.cloud";
int mqttBrokerPort = 8883;
const char* mqttUsername = "admin";
const char* mqttDefaultPassword = "Admin123";
char devicePassword[65];   // MQTT password received from server during provisioning
bool mqttProvisioned = false;  // false = HTTP bootstrap mode, true = MQTT runtime mode
bool portalActive = false;     // true when captive portal is running
bool deviceDisabled = false;   // Kill-switch state (set via MQTT control topic)
char mqttHost[65];             // MQTT broker host from provisioning (overrides mqttBrokerHost)

// ─── Bootstrap Configuration ─────────────────────────────────────
// The ONLY hardcoded URL. Device contacts this to get all other config.
// For local dev: change to "http://192.168.29.236:3800/api/v1"
// For production: "https://protective-enjoyment-production-2320.up.railway.app/api/v1"
const char* BOOTSTRAP_URL = "https://protective-enjoyment-production-2320.up.railway.app/api/v1";

// Runtime API base URL — loaded from EEPROM after first provisioning
// Falls back to BOOTSTRAP_URL if EEPROM is empty
char apiBaseURL[128];  // Mutable, populated from EEPROM or BOOTSTRAP_URL

const char* readingsEndpoint = "/device/readings";
const char* heartbeatEndpoint = "/device/heartbeat";
const char* commandsEndpoint = "/device/";  // + deviceId + "/commands"
const char* registerEndpoint = "/device/register";
const char* provisionEndpoint = "/device/provision/";  // + license_key

#define HTTP_CODE_OK 200
#define HTTP_CODE_UNAUTHORIZED 400

// ─── EEPROM Layout ───────────────────────────────────────────────
// Expanded to 512 bytes to accommodate MQTT provisioning + expanded relays.
//
// Addr  Size  Description
// ----  ----  ----------------------------------------
//   0     1   CO2 relay status (bool)
//   1     1   Humidity relay status (bool)
//   2     1   AC relay status (bool)
//   3     2   CO2 min value (uint16_t)
//   5     4   Temp min value (float)
//   9     4   Humidity min value (float)
//  13    21   License key (1 byte length + up to 20 chars)
//              — also reads legacy 12-char deviceKey
//  34     4   Device ID (int)
//  38     1   MQTT provisioned flag (0=HTTP, 1=MQTT)
//  39    64   Device password (for MQTT auth)
// 103    64   MQTT broker host
// 167     4   MQTT broker port (int)
// 171     1   AHU relay status (bool)
// 172     1   Humidifier relay status (bool)
// 173     1   Duct fan relay status (bool)
// 174     1   Extra relay status (bool)
// 175     1   WiFi provisioned flag (0=not provisioned, 1=provisioned, 255=uninitialized)
// 176    33   WiFi SSID (1 byte length + up to 32 chars)
// 209    65   WiFi Password (1 byte length + up to 64 chars)
// 274     1   Config version (Risk 5: mismatch detection)
// 275   100   API base URL (1 byte length + up to 99 chars) — 2-stage boot
// ─────────────────────────────────────────────────────────────────

#define ADDR_CO2_RELAY_STATUS 0
#define ADDR_HUM_RELAY_STATUS 1
#define ADDR_AC_RELAY_STATUS 2

#define ADDR_MIN_VAL_CO2 3
#define ADDR_MIN_VAL_TEMP 5
#define ADDR_MIN_VAL_HUM 9

#define ADDR_KEY_FLAG 13        // stores length byte + key chars; 255 = not initialized
#define ADDR_DEVICE_ID 34       // 4 bytes for device ID (int)
#define ADDR_MQTT_PROVISIONED 38  // 1 byte flag (0=HTTP mode, 1=MQTT mode)
#define ADDR_DEVICE_PASSWORD 39   // 64 bytes for MQTT password
#define ADDR_MQTT_HOST 103        // 64 bytes for MQTT broker host
#define ADDR_MQTT_PORT 167        // 4 bytes (int)
#define ADDR_AHU_RELAY_STATUS 171
#define ADDR_HUM2_RELAY_STATUS 172
#define ADDR_DUCT_RELAY_STATUS 173
#define ADDR_EXTRA_RELAY_STATUS 174

// WiFi credentials in EEPROM (captive portal provisioning)
#define ADDR_WIFI_PROVISIONED 175  // 1 byte: 0=not provisioned, 1=provisioned, 255=uninitialized
#define ADDR_WIFI_SSID 176         // 1 byte length + up to 32 chars
#define ADDR_WIFI_PASSWORD 209     // 1 byte length + up to 64 chars

// API base URL in EEPROM (2-stage boot: bootstrap → runtime)
#define ADDR_API_BASE_URL 275      // 100 bytes: 1 byte length + up to 99 chars

#define EEPROM_MEMORY_SIZE 512

// ─── OTA Configuration ─────────────────────────────────────────────
const char* FIRMWARE_VERSION = "4.0.0";
#define OTA_VALIDATION_TIMEOUT 60000   // 60s to validate new firmware after boot
#define OTA_MAX_DOWNLOAD_SIZE 1900000  // ~1.9MB max firmware binary size

// Relays
#define HUMIDITY_RELAY_1 23
#define TEMP_RELAY_2 4  // for the ac
#define CO2_RELAY_3 16
#define AHU_RELAY_4 13
#define HUMIDIFIER_RELAY_5 14
#define DUCT_FAN_RELAY_6 27
#define EXTRA_RELAY_7 25

uint16_t CO2MinValue = 1200;
float tempMinValue = 16;
float humidityMin = 90;

// THE DEFAULT TIMER IS SET TO 10 SECONDS FOR TESTING PURPOSES
// For a final application, check the API call limits per hour/minute to avoid getting blocked/banned
unsigned long lastTime = 0;   // for the interrupt delay
unsigned long menuLastTime = 0;

// Set timer to 10 minutes (600000)
//unsigned long timerDelay = 600000;
// Timer set to 10 seconds (10000)

unsigned long keyAuthenticationTimer = 1800000;   // 30 minutes
unsigned long lastTimeAuthentication = 0;

unsigned long menuDisplayDelay = 120000;   // menuy timer 2 minutes
unsigned long lastMillis = 0;             // stores current time of http req
unsigned long lastWifiReconnectAttempt = 0;  // WiFi reconnect backoff tracker
unsigned long wifiBackoffInterval = 10000;  // WiFi reconnect backoff — starts 10s, doubles up to 5 min (Risk 1)
int wifiConsecutiveFailures = 0;            // Track consecutive WiFi reconnect failures (Risk 1)
unsigned long timerDelay = 30000;  // 30 seconds (was 300000 = 5 minutes)
bool ntpSynced = false;                     // NTP sync status (Risk 3)

int deviceId = -1;  // Set after registration, stored in EEPROM

bool eepromDirty = false;
extern bool eepromInitialized;  // Defined in eepromConfig.ino
void eepromInit();              // Forward declaration for eepromConfig.ino
void saveApiBaseUrl(const char* url);  // Forward declaration for eepromConfig.ino
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 19800;
const int daylightOffset_sec = 0;
#define HEAP_WARNING_THRESHOLD 20000

// ─── Deep Sleep Configuration (Risk 4) ───────────────────────────────
#ifdef ENABLE_DEEP_SLEEP
#define DEEP_SLEEP_IDLE_MINUTES 0         // 0 = disabled. Set to N to sleep after N min of no change.
#define DEEP_SLEEP_WAKE_INTERVAL_US (5 * 60 * 1000000ULL)  // Wake every 5 minutes to read sensors
float lastCO2ForSleep = 0;
float lastTempForSleep = 0;
float lastHumForSleep = 0;
unsigned long lastSensorChangeTime = 0;   // millis() of last significant sensor change
#endif

// Template function — declared in header to avoid PlatformIO prototype generation issues
template <typename T>
void writeToEeprom(int addrOffset, T value) {
  EEPROM.put(addrOffset, value);
}
