float humidityOut;
float temperatureOut;

void readDHTSensor()  {
  
  humidityOut = dht.readHumidity();
  // Read temperature as Celsius (the default) 
  temperatureOut = dht.readTemperature();
  // Read temperature as Fahrenheit (isFahrenheit = true)
  float f = dht.readTemperature(true);

  // Check if any reads failed and exit early (to try again).
  if (isnan(humidityOut) || isnan(temperatureOut) || isnan(f)) {
    lcd.setCursor(0,3);
//    lcd.print("DHT: nan |");
    Serial.println(F("Failed to read from DHT sensor!"));
    return;
  }

  // Compute heat index in Fahrenheit (the default)
  float hif = dht.computeHeatIndex(f, humidityOut);
  // Compute heat index in Celsius (isFahreheit = false)
  float hic = dht.computeHeatIndex(temperatureOut, humidityOut, false);

  Serial.print(F("Humidity: "));
  Serial.print(humidityOut);
  Serial.print(F("%  Temperature: "));
  Serial.print(temperatureOut);
  Serial.print(F("°C "));
  Serial.print(f);
  Serial.print(F("°F  Heat index: "));
  Serial.print(hic);
  Serial.print(F("°C "));
  Serial.print(hif);
  Serial.println(F("°F"));
  
}
