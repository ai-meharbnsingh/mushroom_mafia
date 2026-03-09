/*
 * menuControl.ino
 *
 * This file contains functions for controlling the menu system and performing menu actions.
 */

/*
 * Function: void changeWifi()
 * ------------------------
 * Resets the WiFi settings and initiates a WiFi connection.
 * Restarts the ESP8266 after resetting the settings.
 */
void changeWifi() {
  WiFi.disconnect(true, true);  // disconnect and erase saved credentials
  delay(1000);
  ESP.restart();
}

/*
 * Function: void displayUpperMenu()
 * ------------------------
 * Displays the upper menu options on the LCD screen.
 * Prints the menu options with a delay for visual effect.
 */
void displayUpperMenu()  {
  lcd.clear();
  int i = 0;
  while (i < 4) {
    lcd.setCursor(1,i);
    lcd.print(options[i]);
    i++;
    delay(50);
  }
}

/*
 * Function: void displayLowerMenu()
 * ------------------------
 * Displays the lower menu options on the LCD screen.
 * Prints the menu options with a delay for visual effect.
 */
void displayLowerMenu() {
  lcd.clear();
  int i = 2;
  while(i < 6)  {
    lcd.setCursor(1,i-1);
    lcd.print(options[i]);
    ++i;
    delay(50);
  }
}

/*
 * Function: void resetToDefault()
 * ------------------------
 * Resets the device to default values.
 * Displays a progress message on the LCD screen.
 * Writes default values to EEPROM and restarts the ESP8266.
 */
void resetToDefault() {
  lcd.clear();
  lcd.print("CHANGING VALUES");
  
  uint16_t CO2MinValue = 1000;
  float tempMinValue = 16;
  float humidityMin = 80;
  for (int i = 15; i <20; i++)  {
    lcd.print('.');
    delay(1000);
  }
  writeToEeprom<uint16_t>(ADDR_MIN_VAL_CO2, CO2MinValue);
  writeToEeprom<float>(ADDR_MIN_VAL_HUM, humidityMin);
  writeToEeprom<float>(ADDR_MIN_VAL_TEMP, tempMinValue);
  lcd.clear();
  lcd.print("SUCCESSFUL");
  delay(2000);
  ESP.restart();
}

/*
 * Function: void menuAction()
 * ------------------------
 * Executes the menu action based on the current row selection.
 * Performs different actions depending on the menu flag and row value.
 */
void menuAction() {

  if (!menuFlag)  {
    switch(row) {
      case 0: {
        changeRelayValues();
        break;
      }
      case 1: {
        resetToDefault();
        break;
      }
      case 2: {
        factoryReset();
        break;
      }
      case 3: {
        changeWifi();
        break;
      }
    }
  }
  else  {
    switch(row) {
      case 0: {
        factoryReset();
        break;
      }
      case 1: {
        changeWifi();
        break;
      }
      case 2: {
        displayBagReadings();
        break;
      }
      case 3: {
         lcd.clear();
         lcd.print("REBOOTING");
         delay(2000);
         ESP.restart();
         break;
      }
    }
  }
    
}

/*
 * Function: void menuControl()
 * ------------------------
 * Controls the menu system and user interaction.
 * Displays the menu options on the LCD screen and waits for user input.
 * Performs menu actions based on user selections.
 */
void menuControl()  {
  menuLastTime = millis();
  while (millis() - menuLastTime < menuDisplayDelay)  {
    row = 0;
    lcd.setCursor(0,0);
    while (!readJoystick() && row < 4 && row >= 0)  {
      lcd.setCursor(0,row-1);
      lcd.print(' ');
      lcd.setCursor(0,row+1);
      lcd.print(' ');
      lcd.setCursor(0,row);
      lcd.print('>');
    }
    if (state == 0) {
      menuAction();
      return;
    }
    if (row > 3) {
      menuFlag = 1;
      displayLowerMenu();
    }
    if (row < 0) {
      menuFlag = 0;
      displayUpperMenu();
    }
  }
  lcd.clear();
  lcd.print("MENU TIMEOUT");
}

/*
 * Function: void factoryReset()
 * ------------------------
 * Resets the device to factory settings.
 * Resets WiFi settings and clears EEPROM memory.
 * Performs a factory reset based on a user-entered reset code.
 * Restarts the ESP8266 after performing the factory reset.
 */
void factoryReset()  {
  WiFi.disconnect(true, true);  // clear saved WiFi credentials
  String input = "";
  lcd.clear();
  lcd.setCursor(0,0);
  lcd.print("ENTER RESET CODE:");
  currentKeyboard = smallKeyboard;
  printKeyboard();
  input = typeWithJoystick();
  if (input == "\0") {
    lcd.clear();
    lcd.print("RETURNING");
    delay(2000);
    return;
  }
  if (input != resetCode) {
    lcd.clear();
    lcd.print("INVALID CODE");
    delay(1000);
    factoryReset();
  }
  for (int i = 0; i < EEPROM_MEMORY_SIZE; i++)  {
    EEPROM.write(i,255);
  }
  EEPROM.commit();
  ESP.restart();
}
