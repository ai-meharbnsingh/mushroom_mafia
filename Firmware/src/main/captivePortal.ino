// captivePortal.ino
//
// WiFi captive portal for first-time WiFi setup.
// Starts an AP + DNS redirect so any device connecting to the AP
// is automatically redirected to the WiFi configuration page.

#include "portal_html.h"

DNSServer dnsServer;
bool portalRunning = false;
bool scanInProgress = false;
bool scanResultsReady = false;

// ─── Helper functions for portal endpoints ────────────────────────────

void handlePortalRoot(AsyncWebServerRequest *request) {
    request->send_P(200, "text/html", PORTAL_HTML);
}

// Captive portal detection endpoints — redirect to portal root
// Android, iOS, Windows, etc. all check different URLs to detect captive portals
void handleCaptiveRedirect(AsyncWebServerRequest *request) {
    request->redirect("http://192.168.4.1/");
}

void handlePortalScan(AsyncWebServerRequest *request) {
    if (scanInProgress) {
        // Check if async scan has completed
        int n = WiFi.scanComplete();
        if (n == WIFI_SCAN_RUNNING) {
            request->send(200, "application/json", "{\"scanning\":true}");
            return;
        }
        scanInProgress = false;
        if (n == WIFI_SCAN_FAILED || n < 0) {
            Serial.println("WiFi scan failed");
            WiFi.scanDelete();
            request->send(200, "application/json", "[]");
            return;
        }
        // Build results from completed scan
        String json = "[";
        for (int i = 0; i < n; i++) {
            if (i > 0) json += ",";
            // Escape quotes in SSID names
            String ssid = WiFi.SSID(i);
            ssid.replace("\"", "\\\"");
            json += "{\"ssid\":\"" + ssid + "\",";
            json += "\"rssi\":" + String(WiFi.RSSI(i)) + ",";
            json += "\"secure\":" + String(WiFi.encryptionType(i) != WIFI_AUTH_OPEN ? "true" : "false") + "}";
        }
        json += "]";
        Serial.printf("Scan complete: %d networks found\n", n);
        WiFi.scanDelete();
        request->send(200, "application/json", json);
        return;
    }

    // Start async scan (non-blocking — returns immediately)
    Serial.println("Starting async WiFi scan...");
    WiFi.scanNetworks(true);  // true = async
    scanInProgress = true;
    request->send(200, "application/json", "{\"scanning\":true}");
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

    // Fixed AP password for easy setup (min 8 chars for ESP32 softAP)
    String apPass = "12345678";

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

    // Captive portal detection URLs — phones/OS check these to detect portals
    // Android
    server.on("/generate_204", HTTP_GET, handleCaptiveRedirect);
    server.on("/gen_204", HTTP_GET, handleCaptiveRedirect);
    server.on("/connecttest.txt", HTTP_GET, handleCaptiveRedirect);
    // Apple
    server.on("/hotspot-detect.html", HTTP_GET, handleCaptiveRedirect);
    server.on("/library/test/success.html", HTTP_GET, handleCaptiveRedirect);
    // Windows
    server.on("/ncsi.txt", HTTP_GET, handleCaptiveRedirect);
    server.on("/connecttest.txt", HTTP_GET, handleCaptiveRedirect);
    // Firefox
    server.on("/canonical.html", HTTP_GET, handleCaptiveRedirect);
    // Catch-all: any unknown path → redirect to portal
    server.onNotFound(handleCaptiveRedirect);

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
