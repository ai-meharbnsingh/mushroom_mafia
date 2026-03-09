float* tempInBusOne;
float* tempInBusTwo;
bool busPrintFlag = true;

void displayBagReadings() {
    lcd.clear();
    int numOfBags = deviceCountBus1 + deviceCountBus2;
    if (numOfBags == 0) {
      lcd.print("NO BAGS FOUND");
      delay(1000);
      return;
    }
    int i = 0;
    for(int k = 0; k < deviceCountBus1%4; i++, k++)  {
      lcd.setCursor(1,i);
      lcd.print(i + ".");
      lcd.setCursor(3,i);
      lcd.print(tempInBusOne[i]);
    }

    delay(2000);
}

void initBagSensors() {
  
  dsTempSensorOne.begin();
  Serial.print("Locating devices...");
  deviceCountBus1 = dsTempSensorOne.getDeviceCount();
  Serial.println(deviceCountBus1, DEC);
  Serial.println(" devices.");
  Serial.println("");
  
  dsTempSensorTwo.begin();
  Serial.print("Locating devices...");
  deviceCountBus2 = dsTempSensorTwo.getDeviceCount();
  Serial.println(deviceCountBus1, DEC);
  Serial.println(" devices.");
  Serial.println("");

  tempInBusOne = (float*)calloc(deviceCountBus1, sizeof(float));
  tempInBusTwo = (float*)calloc(deviceCountBus2, sizeof(float));

  if (tempInBusOne == NULL || tempInBusTwo == NULL) {
    Serial.println("Unable to allocate memory");
    return;
  }
  
}

void readBagSensorNew() {
  int numOfBags = deviceCountBus1 + deviceCountBus2;
    if (numOfBags == 0) {
      for ( int i = 0; i < 4; i++)  {
        lcd.setCursor(14,i);
        lcd.print("B");
        lcd.print(i + 1);
        lcd.print(":nan");       
      }
      delay(1000);
      return;
  }
  dsTempSensorOne.requestTemperatures();
  delay(1000);
  for (int i = 0; i < deviceCountBus1 && i < 4; i++) {
    
    tempInBusOne[i] = dsTempSensorOne.getTempCByIndex(i);
    Serial.print("Temperature for the sensor in Bag ");
    Serial.print(i);
    Serial.print(" is ");
    Serial.println(tempInBusOne[i]);
    lcd.setCursor(14,i);
    lcd.print("B");
    lcd.print(i + 1);
    lcd.print(":");
    lcd.print((int)tempInBusOne[i]);
    lcd.print("C");
  }
  
  dsTempSensorTwo.requestTemperatures();
  delay(1000);
  
  for (int i = 0; i < deviceCountBus2 && i < 4 - deviceCountBus1; i++) {
    tempInBusTwo[i] = dsTempSensorTwo.getTempCByIndex(i);
    Serial.print("Temperature for the sensor in Bag ");
    Serial.print(i + deviceCountBus1);
    Serial.print(" is ");
    Serial.println(tempInBusTwo[i]);
    lcd.setCursor(14,i + deviceCountBus1);
    lcd.print("B");
    lcd.print(i + 1 + deviceCountBus1);
    lcd.print(":");
    lcd.print((int)tempInBusTwo[i]);
    lcd.print("C");
  }
}

void readBagSensor()  {
  
  int numOfBags = deviceCountBus1 + deviceCountBus2;
    if (numOfBags == 0) {
      lcd.setCursor(10,3);
      lcd.print("BAG: nan  ");
      delay(1000);
      return;
  }
  
  dsTempSensorOne.requestTemperatures();
  delay(1000);
  lcd.setCursor(0,3);
  
  for (int i = 0; i < deviceCountBus1 && i < 4; i++) {
    
    tempInBusOne[i] = dsTempSensorOne.getTempCByIndex(i);
    Serial.print("Temperature for the sensor in Bag ");
    Serial.print(i);
    Serial.print(" is ");
    Serial.println(tempInBusOne[i]);
//    lcd.print("B");
//    lcd.print(i + 1);
//    lcd.print(": ");
//    lcd.print(tempInBusOne[i]);
  }
  Serial.println();
  lcd.setCursor(0,3);
  if (deviceCountBus1 > 1)  {
   if (busPrintFlag)  {
     for (int i = 0;  i < deviceCountBus1 && i < 2; i++)  {
      lcd.print("B");
      lcd.print(i + 1);
      lcd.print(": ");
      lcd.print(tempInBusOne[i]);
     lcd.print("|");
     }
     busPrintFlag = false;
   }
   else {
      for (int i = 2;  i < deviceCountBus1 && i < 4; i++)  {
      lcd.print("B");
      lcd.print(i + 1 + 2);
      lcd.print(": ");
      lcd.print(tempInBusOne[i]);
           lcd.print("|");
     }
     busPrintFlag = true;
   }
   return;
  }
  else  {
    if(busPrintFlag)  {
      for (int i = 0;  i < deviceCountBus1 && i < 2; i++)  {
      lcd.print("B");
      lcd.print(i + 1);
      lcd.print(": ");
      lcd.print(tempInBusOne[i]);
           lcd.print("|");
     }
     busPrintFlag = false;
    }
  }

  dsTempSensorTwo.requestTemperatures();
  delay(1000);
//  lcd.setCursor(10,3);
  for (int i = 0; i < deviceCountBus2 && i < 4; i++) {
    tempInBusTwo[i] = dsTempSensorTwo.getTempCByIndex(i);
    Serial.print("Temperature for the sensor in Bag ");
    Serial.print(i + deviceCountBus1);
    Serial.print(" is ");
    Serial.println(tempInBusTwo[i]);
//    lcd.print("B"+ i + ":" + tempInBusTwo[i]);
//    lcd.print("B");
//    lcd.print(i+2);
//    lcd.print(":");
//    lcd.print(tempInBusOne[i]);
  }
  Serial.println();
  lcd.setCursor(0,3);
  if (deviceCountBus2 > 1)  {
   if (busPrintFlag)  {
     for (int i = 0;  i < deviceCountBus2 && i < 2; i++)  {
      lcd.print("B");
      lcd.print(i + 1);
      lcd.print(": ");
      lcd.print(tempInBusTwo[i]);
     lcd.print("|");
     }
     busPrintFlag = false;
   }
   else {
      for (int i = 2;  i < deviceCountBus2 && i < 4; i++)  {
      lcd.print("B");
      lcd.print(i + 1 + 2);
      lcd.print(": ");
      lcd.print(tempInBusTwo[i]);
           lcd.print("|");
     }
     busPrintFlag = true;
   }
   return;
  }
  else  {
    if(!busPrintFlag)  {
      for (int i = 0;  i < deviceCountBus2 && i < 2; i++)  {
      lcd.print("B");
      lcd.print(i + 1 + 2);
      lcd.print(": ");
      lcd.print(tempInBusTwo[i]);
           lcd.print("|");
     }
     busPrintFlag = true;
    }
  }

}

void printBagReadings() {

  lcd.print("B1");
  lcd.print(deviceCountBus1 + deviceCountBus2);
  
}
