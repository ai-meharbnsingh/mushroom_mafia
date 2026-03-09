#include <Arduino.h>
#include <WiFi.h>

void setup() {
  Serial.begin(115200);
  delay(2000);
  WiFi.mode(WIFI_STA);
  Serial.println("\n=== ESP32 INFO ===");
  Serial.print("MAC Address: ");
  Serial.println(WiFi.macAddress());
  Serial.print("Chip Model: ");
  Serial.println(ESP.getChipModel());
  Serial.print("Flash Size: ");
  Serial.println(ESP.getFlashChipSize());
  Serial.println("=================");
}

void loop() {
  delay(5000);
  Serial.print("MAC: ");
  Serial.println(WiFi.macAddress());
}
