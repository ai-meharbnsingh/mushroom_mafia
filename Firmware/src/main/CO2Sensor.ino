uint16_t co2 = 0;
float temperature = 0.0f;
float humidity = 0.0f;

void initializeCO2Sensor()  {
  
  uint16_t error;
  char errorMessage[256];

  // stop potentially previously started measurement
    error = scd4x.stopPeriodicMeasurement();
    if (error) {
        Serial.print("Error trying to execute stopPeriodicMeasurement(): ");
        errorToString(error, errorMessage, 256);
        Serial.println(errorMessage);
    }

    uint16_t serial0;
    uint16_t serial1;
    uint16_t serial2;
    error = scd4x.getSerialNumber(serial0, serial1, serial2);
    if (error) {
        Serial.print("Error trying to execute getSerialNumber(): ");
        errorToString(error, errorMessage, 256);
        Serial.println(errorMessage);
    } else {
        printSerialNumber(serial0, serial1, serial2);
    }

    // Start Measurement
    error = scd4x.startPeriodicMeasurement();
    if (error) {
        Serial.print("Error trying to execute startPeriodicMeasurement(): ");
        errorToString(error, errorMessage, 256);
        Serial.println(errorMessage);
    }

    Serial.println("Waiting for first measurement... (5 sec)");
    
}

void printUint16Hex(uint16_t value) {
    Serial.print(value < 4096 ? "0" : "");
    Serial.print(value < 256 ? "0" : "");
    Serial.print(value < 16 ? "0" : "");
    Serial.print(value, HEX);
}

void printSerialNumber(uint16_t serial0, uint16_t serial1, uint16_t serial2) {
    Serial.print("Serial: 0x");
    printUint16Hex(serial0);
    printUint16Hex(serial1);
    printUint16Hex(serial2);
    Serial.println();
}

void readFromCO2()  {
    uint16_t error;
    char errorMessage[256];

    delay(100);

    // Read Measurement
    bool isDataReady = false;
    error = scd4x.getDataReadyFlag(isDataReady);
    if (error) {
        lcd.setCursor(0,0);
        lcd.print("CO2 : ");
        lcd.setCursor(5,0);
        lcd.print("nan");
        lcd.setCursor(0,1);
        lcd.print("TEMP: ");
        lcd.setCursor(5,1);
        lcd.print("nan");
        lcd.setCursor(0,2);
        lcd.print("HUM : ");
        lcd.setCursor(5,2);
        lcd.print("nan");
        Serial.print("Error trying to execute readMeasurement(): ");
        errorToString(error, errorMessage, 256);
        Serial.println(errorMessage);
        return;
    }
    if (!isDataReady) {
        return;
    }
    error = scd4x.readMeasurement(co2, temperature, humidity);
    if (error) {
        Serial.print("Error trying to execute readMeasurement(): ");
        errorToString(error, errorMessage, 256);
        Serial.println(errorMessage);
    } else if (co2 == 0) {
        Serial.println("Invalid sample detected, skipping.");
    } else {
        lcd.setCursor(0,0);
        lcd.print("CO2 : ");
        lcd.setCursor(5,0);
        lcd.print(String(co2));
//        lcd.setCursor(10,0);
        lcd.print("ppm");
        Serial.print("Co2 :");
        Serial.print(co2);
        Serial.print("\t");
        lcd.setCursor(0,1);
        lcd.print("TEMP: ");
        lcd.setCursor(5,1);
        lcd.print(String(temperature));
        lcd.setCursor(10,1);
        lcd.print("C ");
        Serial.print("Temperature:");
        Serial.print(String(temperature));
        Serial.print("\t");
        lcd.setCursor(0,2);
        lcd.print("HUM : ");
        lcd.setCursor(5,2);
        lcd.print(String(humidity));
        lcd.setCursor(10,2);
        lcd.print("%");
        Serial.print("Humidity:");
        Serial.println(humidity);
    }
}
