/*
 * joystick.ino
 *
 * This file contains functions for handling input from a joystick and displaying a virtual keyboard on an LCD screen.
 * It allows users to navigate the keyboard using the joystick and select characters by pressing the joystick button.
 */


bool menuFlag = 0;  // Flag variable to control menu behavior

/*
 * Function: String typeWithJoystick()
 * ------------------------
 * Reads input from the joystick and displays a virtual keyboard on the LCD screen.
 * Users can navigate the keyboard and select characters by pressing the joystick button.
 *
 * returns: The string input from the user.
 */

String typeWithJoystick() {
  String input = "";
  lcd.blink();
  lcd.setCursor(0,2);
  
  menuLastTime = millis();
  
  while(true) {
    while (!readJoystick())  {
      column = column % 20;   // Wrap the column position within the keyboard width
      if(column < 0)  {
        column = 19;
      }
      row = (row % 2) + 2;  // Wrap the row position within the keyboard height
      lcd.setCursor(column,row);
    }
    if ((millis() - menuLastTime > menuDisplayDelay) || (state == 0 && column >=0 && column < 3 && row == 3))  {
      lcd.noBlink();  // Disable blinking cursor on LCD
      return "\0";  // Return null character to indicate no input
    }
    if (state == 0 && column >=17 && column < 20 && row == 3)  {
      break;  // Exit the loop when 'ENT' is pressed
    }
    if (state == 0) {
      action(currentKeyboard[row - 2][column], &input);   // Perform action based on the selected key
    }
  }  
  lcd.noBlink();  // Disable blinking cursor on LCD
  return input;
}

/*
 * Function: void printKeyboard()
 * ------------------------
 * Displays the current virtual keyboard on the LCD screen.
 */

void printKeyboard()  {
  lcd.setCursor(0,1);
  lcd.print(":");
  for (int i = 0; i < 2; i++) {
    for (int j = 0; j < 20; j++)  {
      lcd.setCursor(j,i + 2);
      lcd.print(currentKeyboard[i][j]);
    }
  }  
  lcd.setCursor(0,0);
  lcd.blink();
}

/*
 * Function: void action(char key, String *result)
 * ------------------------
 * Performs an action based on the selected key from the virtual keyboard.
 * Updates the result string with the selected character.
 *
 * key: The selected key from the virtual keyboard.
 * result: Pointer to the result string where the selected character will be appended.
 */

void action(char key, String *result) {
  if (row == 3) {
    switch(key) {
    case '#': {
      currentKeyboard = specialKeyboard;
      printKeyboard();
      return;
    }
    case 'A': {
      currentKeyboard = capitalKeyboard;
      printKeyboard();
      return;
    }
    case 'a': {
      currentKeyboard = smallKeyboard;
      printKeyboard();
      return;
    }
    }
  }
  switch(key)  {
    case '<': { // Remove the last character from the result string{This feature needs debugging}
      result[result->length() - 2] = '\0';
      lcd.setCursor(result->length() - 2,1);
      lcd.print(' ');
      break;
    }
    default:  { // Append the selected character to the result string
      *result = *result + key;
      lcd.setCursor(result->length(),1);
      lcd.print(key);
      lcd.setCursor(column,row); 
      break;
    }
  }
}

/*
 * Function: bool readJoystick()
 * ------------------------
 * Reads the input from the joystick and updates the column and row variables.
 * Handles joystick movements and button presses to navigate the virtual keyboard.
 *
 * returns: true if the joystick button is pressed, false otherwise.
 */

bool readJoystick() {

  while(millis() - menuLastTime < menuDisplayDelay) {
    int xValue = analogRead(joyX);
    int yValue = analogRead(joyY);
    state = digitalRead(BUTTON);
    if(state == 0)  {
      if (millis() - lastMillis > 1000)  {
        lastMillis = millis();
        return HIGH;  // Joystick button is pressed
      }
    }
    // below conditions define the cursor position based on joystick input
    if (yValue < 800) {
      Serial.println("LEFT");
      --column; // Move the column position to the left
      delay(300);
    }
    else if(xValue < 800) {
      Serial.println("DOWN");
      ++row;    // Move the row position down
      delay(300);
    }
    else if(xValue > 3500 && yValue < 3000) {
      Serial.println("UP");
      --row;  // Move the row position up
      delay(300);
    }
    else if(xValue > 3500 && yValue >=3500) {
      Serial.println("RIGHT");
      ++column; // move column posn down
      delay(300);
    }
    return LOW; // Joystick button is not pressed
  }
  return HIGH;  // joystick button is pressed
}
