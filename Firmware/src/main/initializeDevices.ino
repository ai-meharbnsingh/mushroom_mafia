void IRAM_ATTR isr() {
  if (millis() - lastMillis > 1000)  
    state = HIGH;
  lastMillis = millis();
}

void initializeDevices()  {
  delay(100);
  Wire.begin();
  scd4x.begin(Wire);    // CO2 sensor
  initializeCO2Sensor();
  initBagSensors();
  dht.begin();
  pinMode(joyX, INPUT);
  pinMode(joyY, INPUT);
  pinMode(BUTTON, INPUT_PULLUP);
  pinMode(HUMIDITY_RELAY_1, OUTPUT);
  pinMode(TEMP_RELAY_2, OUTPUT);
  pinMode(CO2_RELAY_3, OUTPUT);
  pinMode(AHU_RELAY_4, OUTPUT);
  pinMode(HUMIDIFIER_RELAY_5, OUTPUT);
  pinMode(DUCT_FAN_RELAY_6, OUTPUT);
  pinMode(EXTRA_RELAY_7, OUTPUT);
  eepromInit();
  // If already MQTT-provisioned, skip HTTP auth (MQTT will authenticate via broker)
  if (!mqttProvisioned) {
    if (!authenticateDevKey(licenseKey))  {
      lcd.clear();
      lcd.print("DEVICE KEY INVALID");
      delay(2000);
      lcd.setCursor(0,1);
      lcd.print(licenseKey);
      lcd.setCursor(0,2);
      lcd.print("Press Button");
      while(digitalRead(BUTTON)) {
      }
      inputKey();
    }
  }
  attachInterrupt(digitalPinToInterrupt(BUTTON), isr,FALLING);
  
}

void openMenu() {
  row = 0;
  column = 0;
  displayUpperMenu();
  menuControl();  
  lcd.clear();
  attachInterrupt(digitalPinToInterrupt(BUTTON),isr,FALLING);
}
