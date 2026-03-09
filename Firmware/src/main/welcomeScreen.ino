void welcomeScreen()  {
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print("     POWERED BY     ");
  lcd.setCursor(0, 2);
  delay(2000);
  lcd.print("  DRIFT DEVELOPERS ");
  lcd.setCursor(0, 2);
  
  delay(5000);
  lcd.clear();
  lcd.setCursor(6, 1);
  lcd.print("WELCOME");
  lcd.setCursor(3, 2);
  lcd.print("ORGANIC COURT");
  delay(5000);
  lcd.clear();
  lcd.setCursor(0, 1);
  lcd.print("System Check");

  for (int k = 12; k<19; k++)
  {
  lcd.setCursor(k, 1);
  lcd.print(".");
  delay(500);
  }
      
  delay(3000);
}
