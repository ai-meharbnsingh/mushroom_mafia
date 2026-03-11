/*
 * relayControl.ino
 *
 * This file contains functions for controlling the relays and setting their values.
 */

/*
 * Function: void changeRelayValues()
 * ------------------------
 * Allows the user to change the values for CO2, humidity, and temperature.
 * Reads user input from the LCD screen and updates the corresponding values.
 * Writes the updated values to EEPROM and checks the relay status based on the new values.
 */
void changeRelayValues()  {
  
  char key;  
  String arr[] = {"CO2", "HUMIDITY", "TEMPERATURE"};
  float values[3];
  for (int i = 0; i < 3; i++) {
    String result = "";
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print(arr[i]);
    currentKeyboard = specialKeyboard;
    printKeyboard();
    result = typeWithJoystick();
    if (result == "\0") {
      lcd.clear();
      lcd.print("RETURNING");
      delay(2000);
      return;
    }
    values[i] = result.toFloat();
  }  
  
  CO2MinValue = int(values[0]);
  humidityMin = values[1];
  tempMinValue = values[2];
  
  lcd.clear();
  lcd.print("VALUES CONFIRMED");
  writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
  writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
  writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
  checkForRelay();
  delay(2000);
  return;

}

// This is an old function, the checkRelay() function does the the same job in a better way(tested and deployed)
/*
void setRelayValues() {
  delay(100);
  while (Serial.available() > 0 ) {
    Serial.read();
  }
  Serial.println("Enter the Values below: ");
  Serial.println("CO2 MIN VALUE: ");
  while(Serial.available() == 0)  {}
  CO2MinValue = Serial.parseInt();
  while (Serial.available() > 0 ) {
    Serial.read();
  }
  delay(100);
  Serial.println("HUMIDITY MIN VALUE: ");
  while(Serial.available() == 0)  {}
  humidityMin = Serial.parseInt();
  while (Serial.available() > 0 ) {
    Serial.read();
  }
  delay(100);
  Serial.println("TEMPERATURE MIN VALUE: ");
  while(Serial.available() == 0)  {}
  tempMinValue = Serial.parseInt();

  writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
  writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
  writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);

  EEPROM.commit();
}
*/

/*
 * Function: void checkForRelay()
 * ------------------------
 * Checks the current sensor readings against the defined threshold values.
 * Controls the relay state based on the sensor readings and threshold values.
 * Updates the relay status variables and writes them to EEPROM.
 * Displays the relay status on the LCD screen.
 */
void checkForRelay()  {
  
  if(co2 < CO2MinValue )  {
      digitalWrite(CO2_RELAY_3, HIGH);
      if (_co2RelayStatus != HIGH) {
          _co2RelayStatus = HIGH;
          writeToEeprom<bool>(ADDR_CO2_RELAY_STATUS, _co2RelayStatus);
          eepromDirty = true;
      }
  }
  else if(co2 > CO2MinValue + 100)  {
      digitalWrite(CO2_RELAY_3, LOW);
      if (_co2RelayStatus != LOW) {
          _co2RelayStatus = LOW;
          writeToEeprom<bool>(ADDR_CO2_RELAY_STATUS, _co2RelayStatus);
          eepromDirty = true;
      }
  }

  delay(100);

  if (humidity >= humidityMin)  {
      digitalWrite(HUMIDITY_RELAY_1, HIGH);
      if (_humidityRelayStatus != HIGH) {
          _humidityRelayStatus = HIGH;
          writeToEeprom<bool>(ADDR_HUM_RELAY_STATUS, _humidityRelayStatus);
          eepromDirty = true;
      }
  }
  else if( humidity < humidityMin - 2.5)  {
      digitalWrite(HUMIDITY_RELAY_1, LOW);
      if (_humidityRelayStatus != LOW) {
          _humidityRelayStatus = LOW;
          writeToEeprom<bool>(ADDR_HUM_RELAY_STATUS, _humidityRelayStatus);
          eepromDirty = true;
      }
  }

  delay(100);

  if (temperature <= tempMinValue)  {
      digitalWrite(TEMP_RELAY_2, HIGH);
      if (_ACRelayStatus != HIGH) {
          _ACRelayStatus = HIGH;
          writeToEeprom<bool>(ADDR_AC_RELAY_STATUS, _ACRelayStatus);
          eepromDirty = true;
      }
  }
  else if (temperature > tempMinValue + 1)  {
      digitalWrite(TEMP_RELAY_2, LOW);
      if (_ACRelayStatus != LOW) {
          _ACRelayStatus = LOW;
          writeToEeprom<bool>(ADDR_AC_RELAY_STATUS, _ACRelayStatus);
          eepromDirty = true;
      }
  }

  lcd.setCursor(13,0);
  lcd.print("RELAY: ");
  lcd.setCursor(19,0);
  lcd.print(_co2RelayStatus);
  lcd.setCursor(13,1);
  lcd.print("RELAY: ");
  lcd.setCursor(19,1);
  lcd.print(_humidityRelayStatus);
  lcd.setCursor(13,2);
  lcd.print("RELAY: ");
  lcd.setCursor(19,2);
  lcd.print(_ACRelayStatus);
  
  delay(100);
}
