// captivePortal.ino
//
// WiFi captive portal for first-time WiFi setup.
// Starts an AP + DNS redirect so any device connecting to the AP
// is automatically redirected to the WiFi configuration page.

#include "portal_html.h"

DNSServer dnsServer;
bool portalRunning = false;

// ─── Helper functions for portal endpoints ────────────────────────────

void handlePortalRoot(AsyncWebServerRequest *request) {
    request->send_P(200, "text/html", PORTAL_HTML);
}

void handlePortalScan(AsyncWebServerRequest *request) {
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; i++) {
        if (i > 0) json += ",";
        json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",";
        json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
        json += "\"secure\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false") + "}";
    }
    json += "]";
    WiFi.scanDelete();
    request->send(200, "application/json", json);
}

void handlePortalConnect(AsyncWebServerRequest *request) {
    String ssid = "";
    String password = "";
    if (request->hasParam("ssid", true)) {
        ssid = request->getParam("ssid", true)->value();
    }
    if (request->hasParam("password", true)) {
        password = request->getParam("password", true)->value();
    }

    if (ssid.length() == 0) {
        request->send(400, "text/plain", "SSID required");
        return;
    }

    // Save credentials to EEPROM
    saveWiFiCredentials(ssid.c_str(), password.c_str());
    Serial.printf("Portal: saved WiFi SSID=%s\n", ssid.c_str());

    request->send(200, "text/plain", "OK - rebooting...");

    // Give the response time to send, then reboot
    delay(1500);
    ESP.restart();
}

// ─── Portal Functions ─────────────────────────────────────────────────

void startCaptivePortal() {
    portalActive = true;
    portalRunning = true;

    // Build AP name: MUSH_XXXX (last 4 chars of license key)
    String apName = "MUSH_SETUP";
    if (strlen(licenseKey) >= 4) {
        apName = "MUSH_" + String(licenseKey + strlen(licenseKey) - 4);
    }

    // Fixed AP password for easy setup
    String apPass = "123456";

    Serial.println("Starting captive portal...");
    Serial.println("AP Name: " + apName);
    Serial.println("AP Pass: " + apPass);

    // Start in AP+STA mode (AP for portal, STA for scanning nearby networks)
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(apName.c_str(), apPass.c_str());
    delay(500);

    Serial.print("AP IP: ");
    Serial.println(WiFi.softAPIP());

    // DNS server: redirect ALL domains to our AP IP (captive portal detection)
    dnsServer.start(53, "*", WiFi.softAPIP());

    // Register portal web endpoints on the existing AsyncWebServer
    server.on("/", HTTP_GET, handlePortalRoot);
    server.on("/scan", HTTP_GET, handlePortalScan);
    server.on("/connect", HTTP_POST, handlePortalConnect);

    server.begin();
    Serial.println("Captive portal web server started");

    // LCD feedback
    lcd.setCursor(0, 3);
    lcd.print("IP: 192.168.4.1     ");

    // Block here processing DNS while portal is active
    // (the device has no WiFi credentials -- nothing else to do)
    while (portalRunning) {
        esp_task_wdt_reset();  // Risk 2: Feed watchdog in portal loop
        dnsServer.processNextRequest();
        delay(10);
    }
}

void stopCaptivePortal() {
    portalRunning = false;
    portalActive = false;
    dnsServer.stop();
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    Serial.println("Captive portal stopped");
}
