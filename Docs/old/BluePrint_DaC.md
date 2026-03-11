# DaC: Mushroom Farm IoT & ERP Platform
# Version: 3.0.0
# Format: Design as Code v1.0
# Updated: 2026-03-11

================================================================================
METADATA
================================================================================

project:
  name: "Mushroom Farm IoT & ERP Platform"
  type: "Multi-Tenant SaaS"
  domain: ["Agricultural IoT", "ERP System"]
  target_market: "Commercial Mushroom Farms (India & Global)"
  blueprint_version: "3.0"
  status: "Production (Phase 1 Complete)"

document:
  generated: "2026-03-08"
  updated: "2026-03-11"
  source: "MUSHROOM_FARM_BLUEPRINT.md"
  format: "DaC v1.0"
  precision: "absolute"

================================================================================
VISION & METRICS
================================================================================

vision:
  statement: "India's first comprehensive IoT + ERP platform for commercial mushroom farming"
  goals:
    - metric: "contamination_loss_reduction"
      from: "12-18%"
      to: "<7%"
      method: "real-time monitoring + climate advisory"

    - metric: "annual_savings"
      value: "4-6 lakhs"
      target: "per 100-room farm"
      method: "automated efficiency + phase-aware automation"

    - metric: "scalability"
      min: 2
      max: 500
      unit: "rooms"
      method: "consistent architecture"

    - metric: "offline_operation"
      duration: "weeks"
      phase: 2
      method: "edge computing"

business_model:
  type: "SaaS Subscription"
  tiers:
    - name: "Basic"
      price_per_room: 2000
      currency: "INR"
      period: "monthly"
      features: ["monitoring only"]

    - name: "Pro"
      price_per_room: 4000
      currency: "INR"
      period: "monthly"
      features: ["monitoring", "automation", "inventory", "climate advisory"]

    - name: "Enterprise"
      price_per_room: 3000
      currency: "INR"
      period: "monthly"
      condition: "at scale"
      features: ["full ERP", "AI", "OTA firmware"]

revenue_projections:
  year_1: { farms: 27, arr_cr: 1.16 }
  year_2: { farms: 152, arr_cr: 9.12 }
  year_3: { farms: 412, arr_cr: 24.7 }

unit_economics:
  gross_margin: "78-95%"
  break_even: { farms: 16, month: 9 }
  payback_period: "18 months"

success_metrics_y1:
  farms_onboarded: { target: 50, source: "subscription database" }
  platform_uptime: { target: "99.5%", source: "monitoring" }
  contamination_reduction: { target: "12% to <7%", source: "batch tracking" }
  customer_nps: { target: ">40", source: "quarterly surveys" }
  churn_rate: { target: "<12% annually", source: "cancellations" }
  mrr: { target: "7.5L", source: "revenue dashboard" }

================================================================================
TECHNOLOGY STACK
================================================================================

stack:
  backend:
    technology: "FastAPI"
    language: "Python 3.12"
    features:
      - "Auto-generates OpenAPI/Swagger"
      - "Pydantic v2 validation"
      - "Native async support"
      - "Background task scheduling (relay automation, relay scheduler)"
      - "MQTT client (aiomqtt) for device communication"
    port: 3800

  database:
    primary: "PostgreSQL (Docker)"
    port: 5432
    multitenancy: "Row-Level Security (RLS)"
    tables: 17
    migrations: "Alembic (7 migrations)"

  cache:
    technology: "Redis (Docker)"
    port: 6379
    purpose: ["live sensor data (60s TTL)", "relay command queue", "WebSocket state"]

  frontend:
    framework: "React 18"
    language: "TypeScript"
    styling: "TailwindCSS"
    components: "shadcn/ui (60+ components)"
    animation: "GSAP"
    charts: "Recharts"
    icons: "Lucide React"
    features: ["Progressive Web App", "Dark IoT Theme"]
    port: 3801

  realtime:
    protocol: "WebSocket"
    direction: "bidirectional"
    events: ["sensor_update", "relay_state_change", "alert_created", "alert_acknowledged", "device_status_change"]

  messaging:
    protocol: "MQTT (aiomqtt)"
    broker: "EMQX / Mosquitto"
    topics:
      - "device/+/telemetry"
      - "device/+/status"
      - "device/{licenseKey}/control"
      - "device/{licenseKey}/commands"
      - "device/{licenseKey}/config"
      - "farm/broadcast/control"
    authentication: "EMQX HTTP auth plugin -> backend /emqx/auth"

  edge_device:
    platform: "ESP32 WROOM"
    framework: "Arduino C++"
    sync_interval: "30 seconds"
    protocol: "MQTT (primary) / HTTP POST (fallback)"
    features: ["OTA firmware update", "EEPROM config storage", "threshold sync via MQTT"]

  orm:
    technology: "SQLAlchemy 2.0 (async)"
    migrations: "Alembic"

  testing:
    e2e: "Playwright (headless:false, slowMo:500)"
    test_count: 28
    coverage: "19 admin tests + 9 user tests"
    screenshots: "56 captured (37 admin + 19 user)"

  infrastructure:
    development:
      docker: "PostgreSQL + Redis via Docker Compose"
      backend: "uvicorn on port 3800"
      frontend: "Vite dev server on port 3801"
    production:
      provider: "Render"
      services: ["Web Service", "Managed PostgreSQL", "Managed Redis", "Static Site"]

================================================================================
SYSTEM ARCHITECTURE
================================================================================

architecture:
  layers:
    - name: "EDGE_LAYER"
      location: "on-farm"
      devices: ["ESP32 WROOM"]
      sensors:
        - { model: "SCD4x (Sensirion)", interface: "I2C", purpose: "CO2, Room Temp, Room Humidity" }
        - { model: "DHT11", interface: "GPIO", purpose: "Outdoor Temp & Humidity" }
        - { model: "DS18B20", interface: "OneWire", quantity: 10, purpose: "Bag Temperature" }
      actuators:
        - type: "7-Channel Relay Module"
          relays:
            - { type: "CO2", gpio: 16, purpose: "CO2 ventilation fan" }
            - { type: "HUMIDITY", gpio: 23, purpose: "Humidifier" }
            - { type: "TEMPERATURE", gpio: 4, purpose: "AHU / Air conditioner" }
            - { type: "AHU", purpose: "Air handling unit" }
            - { type: "HUMIDIFIER", purpose: "Dedicated humidifier" }
            - { type: "DUCT_FAN", purpose: "Duct ventilation fan" }
            - { type: "EXTRA", purpose: "Spare relay channel" }
      display: { type: "LCD 20x4", interface: "I2C", address: "0x27" }
      input: { type: "Analog Joystick", interface: "ADC+GPIO" }
      communication:
        primary: "MQTT (aiomqtt)"
        fallback: "HTTP POST"
        interval: "30 seconds"
        topics:
          telemetry: "device/{licenseKey}/telemetry"
          status: "device/{licenseKey}/status"
          commands: "device/{licenseKey}/commands"
          config: "device/{licenseKey}/config"
          control: "device/{licenseKey}/control"
      firmware_update: "OTA (Over-The-Air) via backend"

    - name: "CLOUD_LAYER"
      location: "Render Platform / Local Docker"
      components:
        backend:
          type: "FastAPI async"
          port: 3800
          api_prefix: "/api/v1"
          routers: 17
          endpoints: 80+
          services: ["auth", "reading_service", "relay_automation", "relay_scheduler", "mqtt_client", "climate_advisory", "ws_manager", "report_generator"]
        database:
          type: "PostgreSQL"
          tables: 17
          security: "RLS (owner_id isolation)"
        cache:
          type: "Redis"
          purpose: "live sensor cache (60s TTL)"
        mqtt_broker:
          type: "EMQX / Mosquitto"
          auth: "HTTP auth plugin"

    - name: "CLIENT_LAYER"
      technology: "React 18 + TypeScript + TailwindCSS + shadcn/ui"
      port: 3801
      pages: 14
      components: 100+
      capabilities:
        - { name: "dashboard", realtime: true, protocol: "WebSocket", views: ["admin", "user"] }
        - { name: "live_monitoring", features: ["circular gauges", "bag temp strip", "historical charts"] }
        - { name: "relay_control", modes: ["MANUAL", "AUTO", "SCHEDULE"], relays: 7 }
        - { name: "growth_management", features: ["stage timeline", "climate advisory", "auto-adjust thresholds"] }
        - { name: "harvest_tracking", features: ["log harvest", "grade (A/B/C)", "yield summary", "pie charts"] }
        - { name: "alerts", features: ["severity filtering", "acknowledge", "resolve", "WebSocket push"] }
        - { name: "device_management", features: ["provision", "link", "QR code", "kill switch", "OTA firmware"] }
        - { name: "reports", features: ["generate", "download CSV/Excel/PDF", "delete"] }
        - { name: "user_management", features: ["CRUD", "role assignment", "plant assignment", "account unlock"] }
        - { name: "settings", features: ["threshold adjustment", "hysteresis config", "live gauge preview"] }
        - { name: "climate_advisory", features: ["recommendations", "deviations", "stage reminders", "auto-adjust"] }

  data_flow:
    device_to_cloud:
      direction: "ESP32 -> MQTT Broker -> Backend"
      protocol: "MQTT"
      topic: "device/{licenseKey}/telemetry"
      interval: "30s"
      payload: ["co2_ppm", "room_temp", "room_humidity", "bag_temps[]", "outdoor_temp", "outdoor_humidity", "relay_states", "wifi_rssi", "free_heap", "device_ip"]

    cloud_processing:
      steps:
        - { order: 1, action: "MQTT handler receives telemetry" }
        - { order: 2, action: "validate device by license_key" }
        - { order: 3, action: "update device status (online, last_seen, wifi_rssi)" }
        - { order: 4, action: "write Redis (live cache, 60s TTL)" }
        - { order: 5, action: "write PostgreSQL (room_readings table)" }
        - { order: 6, action: "check thresholds -> create alert if exceeded" }
        - { order: 7, action: "evaluate relay automation (AUTO mode)" }
        - { order: 8, action: "push via WebSocket to connected clients" }

    cloud_to_device:
      relay_commands:
        direction: "Backend -> MQTT -> ESP32"
        topic: "device/{licenseKey}/commands"
        payload: { relay_type: "string", state: "string" }
      config_updates:
        direction: "Backend -> MQTT -> ESP32"
        topic: "device/{licenseKey}/config"
        payload: { co2_min: "float", co2_max: "float", temperature_min: "float", humidity_max: "float", ... }
        trigger: "threshold update or stage advance with auto-adjust"
      control:
        direction: "Backend -> MQTT -> ESP32"
        topic: "device/{licenseKey}/control"
        payload: { action: "kill_switch | restart | ..." }
      broadcast:
        direction: "Backend -> MQTT -> ALL ESP32"
        topic: "farm/broadcast/control"
        payload: { action: "string" }

    frontend_realtime:
      direction: "Cloud -> Dashboard"
      protocol: "WebSocket"
      url: "ws://localhost:3800/api/v1/ws/{owner_id}?token={jwt}"
      events:
        - { name: "sensor_update", trigger: "new reading", payload: "full sensor reading" }
        - { name: "relay_state_change", trigger: "relay toggled", payload: "relay state + trigger" }
        - { name: "alert_created", trigger: "threshold violation", payload: "alert details" }
        - { name: "alert_acknowledged", trigger: "user action", payload: "alert + user" }
        - { name: "device_status_change", trigger: "online/offline", payload: "device status" }

================================================================================
HARDWARE SPECIFICATION (ESP32)
================================================================================

device:
  platform: "ESP32"
  variant: "ESP32 WROOM"
  framework: "Arduino (C/C++)"
  firmware_size: "~965 KB"
  architecture: "polling-based + MQTT event-driven"
  status: "production"
  location: "Uttarakhand (real farm)"

  bill_of_materials:
    - { component: "Microcontroller", model: "ESP32 WROOM", interface: "-", qty: 1 }
    - { component: "CO2 Sensor", model: "SCD4x (Sensirion)", interface: "I2C", qty: 1 }
    - { component: "Outdoor Sensor", model: "DHT11", interface: "Digital GPIO", qty: 1 }
    - { component: "Temperature Array", model: "DS18B20", interface: "OneWire", qty: 10 }
    - { component: "Display", model: "LCD 20x4", interface: "I2C (0x27)", qty: 1 }
    - { component: "Relay Module", model: "7-Channel", interface: "GPIO", qty: 1 }
    - { component: "Input Device", model: "Analog Joystick", interface: "ADC + GPIO", qty: 1 }
    - { component: "Enclosure", model: "Custom 3D Printed", interface: "-", qty: 1 }

  pin_configuration:
    - { gpio: "21, 22", function: "I2C (SDA, SCL)", component: "SCD4x, LCD" }
    - { gpio: "4", function: "Digital Output", component: "Temperature/AC Relay" }
    - { gpio: "16", function: "Digital Output", component: "CO2 Relay" }
    - { gpio: "23", function: "Digital Output", component: "Humidity Relay" }
    - { gpio: "26", function: "Interrupt", component: "Joystick Button" }
    - { gpio: "32, 33", function: "ADC", component: "Joystick X, Y" }
    - { gpio: "0, 17", function: "OneWire", component: "DS18B20 Bus 1, Bus 2" }
    - { gpio: "5", function: "Digital Input", component: "DHT11 Outdoor Sensor" }

  firmware_structure:
    root: "Firmware/"
    files:
      - "src/main/main.ino"
      - "src/main/configuration.h"
      - "src/main/CO2Sensor.ino"
      - "src/main/dhtSensor.ino"
      - "src/main/bagSensor.ino"
      - "src/main/relayControl.ino"
      - "src/main/sendingJsonRequest.ino"
      - "src/main/menuControl.ino"
      - "src/main/joyStick.ino"
      - "src/main/initWifi.ino"
      - "src/main/initializeDevices.ino"
      - "src/main/eepromConfig.ino"
      - "src/main/getKey.ino"
      - "src/main/welcomeScreen.ino"

  boot_sequence:
    - "welcomeScreen.ino: Display logo & version"
    - "initializeDevices.ino: Init I2C, LCD, Sensors, Relays, Joystick"
    - "eepromConfig.ino: Load saved thresholds & device key from EEPROM"
    - "initWifi.ino: Connect to WiFi, start OTA server"
    - "MQTT connect: Subscribe to commands + config topics"
    - "MAIN LOOP: Read sensors -> calibration -> threshold checks -> relay control -> LCD update -> MQTT publish telemetry"

  communication:
    primary: "MQTT"
    fallback: "HTTP POST"
    interval: "30 seconds"
    mqtt_topics:
      publish:
        - "device/{licenseKey}/telemetry"
        - "device/{licenseKey}/status"
      subscribe:
        - "device/{licenseKey}/commands"
        - "device/{licenseKey}/config"
        - "device/{licenseKey}/control"
        - "farm/broadcast/control"

  json_payload:
    mqtt_topic: "device/{licenseKey}/telemetry"
    body:
      co2_ppm: "integer (400-5000)"
      room_temp: "float (celsius)"
      room_humidity: "float (percent)"
      bag_temps: "array[10] of float"
      outdoor_temp: "float"
      outdoor_humidity: "float"
      relay_states:
        co2: "boolean"
        humidity: "boolean"
        temperature: "boolean"
      wifi_rssi: "integer (dBm)"
      free_heap: "integer (bytes)"
      device_ip: "string"

  relay_control:
    modes:
      MANUAL: "User directly toggles relay ON/OFF from dashboard"
      AUTO: "Backend evaluates sensor vs threshold with hysteresis, toggles automatically"
      SCHEDULE: "Backend runs 60s scheduler, checks day-of-week bitmask + time windows"
    relay_types: ["CO2", "HUMIDITY", "TEMPERATURE", "AHU", "HUMIDIFIER", "DUCT_FAN", "EXTRA"]
    hysteresis: "prevents rapid ON/OFF cycling"
    config_sync: "MQTT config topic pushes threshold changes to EEPROM"

  local_automation:
    type: "threshold-based with hysteresis"
    thresholds:
      - parameter: "CO2"
        relay_on: "< min_value"
        relay_off: "> max_value"
        hysteresis: "configurable (default 100 ppm)"
      - parameter: "Humidity"
        relay_on: ">= max_value"
        relay_off: "< min_value"
        hysteresis: "configurable (default 2.5%)"
      - parameter: "Temperature"
        relay_on: "<= min_value"
        relay_off: "> max_value"
        hysteresis: "configurable (default 1 C)"
    config_sources: ["LCD menu (joystick)", "Cloud dashboard", "MQTT config topic", "Climate advisory auto-adjust"]
    storage: "EEPROM"

  eeprom_map:
    total_size: "32 bytes"
    allocation:
      - { address: "0", size: "1 byte", data: "CO2 relay status" }
      - { address: "1", size: "1 byte", data: "Humidity relay status" }
      - { address: "2", size: "1 byte", data: "AC relay status" }
      - { address: "3-4", size: "2 bytes", data: "CO2 threshold" }
      - { address: "5-8", size: "4 bytes", data: "Temperature threshold" }
      - { address: "9-12", size: "4 bytes", data: "Humidity threshold" }
      - { address: "13", size: "1 byte", data: "Device key init flag" }
      - { address: "14-29", size: "16 bytes", data: "Device authentication key (license_key)" }

  device_registration:
    flow:
      - "Boot: Check EEPROM for license key"
      - "If no key: User enters 18-char license key via joystick virtual keyboard"
      - "Store key in EEPROM"
      - "Connect to MQTT broker with license_key as client ID"
      - "POST /api/v1/device/register with MAC + firmware version"
      - "Backend validates key, links to owner, returns device_id"
      - "Alternatively: Scan QR code from dashboard to link device"
    key_format: "LIC-XXXX-XXXX-XXXX (18 alphanumeric with dashes)"
    example: "LIC-A3F7-K9M2-P5X8"
    key_source: "Pre-generated by backend via /devices/provision endpoint"

  ota_firmware:
    method: "HTTP download from backend"
    trigger: "Admin triggers rollout from Firmware Management page"
    flow:
      - "Admin uploads firmware binary to backend"
      - "Admin selects firmware version and triggers OTA rollout"
      - "Backend publishes OTA command to device via MQTT"
      - "Device downloads firmware binary via HTTP"
      - "Device validates checksum (SHA256)"
      - "Device applies update and reboots"
    status_tracking: "ota_status field on device (pending/downloading/applying/success/failed)"

  performance:
    system_uptime: "99%+"
    sensor_read_latency: "< 100 ms"
    json_serialization: "< 50 ms"
    mqtt_publish_latency: "< 100 ms"
    menu_response_time: "200 ms"
    lcd_update_rate: "real-time"
    max_bag_sensors: "10+"
    wifi_reconnect_timeout: "60 seconds"

================================================================================
DATABASE ARCHITECTURE
================================================================================

database:
  engine: "PostgreSQL (Docker, port 5432)"
  multitenancy:
    strategy: "Row-Level Security (RLS)"
    isolation: "single database, owner_id based"

  tables:
    - id: 1
      name: "owners"
      purpose: "Company/owner data"
      records: "10-100"
      key_columns: ["owner_id (PK)", "company_name", "email", "mobile", "city", "state", "pincode", "gst_number"]

    - id: 2
      name: "users"
      purpose: "System users with roles"
      records: "50-1000"
      key_columns: ["user_id (PK)", "owner_id (FK)", "username", "email", "password_hash", "role (enum)", "assigned_plants (JSON)", "login_attempts", "locked_until"]

    - id: 3
      name: "plants"
      purpose: "Farm locations"
      records: "10-500"
      key_columns: ["plant_id (PK)", "owner_id (FK)", "plant_name", "plant_code (unique)", "plant_type (OYSTER/BUTTON/SHIITAKE/MIXED)", "location", "city", "state"]

    - id: 4
      name: "rooms"
      purpose: "Growing rooms"
      records: "100-5000"
      key_columns: ["room_id (PK)", "plant_id (FK)", "room_name", "room_code (unique)", "room_type (SPAWN_RUN/FRUITING/INCUBATION/STORAGE)", "no_of_racks", "no_of_bags", "bags_per_rack", "floor_number"]

    - id: 5
      name: "devices"
      purpose: "IoT devices (ESP32)"
      records: "100-10000"
      key_columns: ["device_id (PK)", "room_id (FK)", "mac_address (unique)", "license_key (unique)", "device_name", "device_type", "firmware_version", "hardware_version", "is_online", "last_seen", "wifi_rssi", "free_heap", "subscription_status", "communication_mode (HTTP/MQTT)", "qr_code_image", "ota_status", "last_ota_at"]

    - id: 6
      name: "thresholds"
      purpose: "Control thresholds per room per parameter"
      records: "1000-50000"
      key_columns: ["threshold_id (PK)", "room_id (FK)", "parameter (CO2/HUMIDITY/TEMPERATURE)", "min_value", "max_value", "hysteresis", "is_active", "updated_by (FK)"]
      unique: "room_id + parameter"

    - id: 7
      name: "room_readings"
      purpose: "Sensor data (time-series)"
      records: "millions"
      key_columns: ["reading_id (PK, BigInteger)", "device_id (FK)", "room_id (FK)", "co2_ppm", "room_temp", "room_humidity", "outdoor_temp", "outdoor_humidity", "bag_temp_1..10", "recorded_at"]

    - id: 8
      name: "relay_config"
      purpose: "Relay mode configuration per device per relay type"
      records: "10K-100K"
      key_columns: ["config_id (PK)", "device_id (FK)", "relay_type (7 types)", "mode (MANUAL/AUTO/SCHEDULE)", "threshold_param", "action_on_high", "action_on_low", "updated_by (FK)"]
      unique: "device_id + relay_type"

    - id: 9
      name: "relay_status"
      purpose: "Relay state change history"
      records: "millions"
      key_columns: ["status_id (PK, BigInteger)", "device_id (FK)", "relay_type", "state (bool)", "trigger_type (MANUAL/AUTO/SCHEDULE)", "trigger_value", "triggered_by (FK)", "changed_at"]

    - id: 10
      name: "relay_schedule"
      purpose: "Scheduled relay ON/OFF time windows"
      records: "10K-100K"
      key_columns: ["schedule_id (PK)", "device_id (FK)", "relay_type", "days_of_week (bitmask int)", "time_on (HH:MM)", "time_off (HH:MM)", "is_active", "created_by (FK)"]

    - id: 11
      name: "alerts"
      purpose: "Threshold violation alerts"
      records: "10K-500K"
      key_columns: ["alert_id (PK, BigInteger)", "device_id (FK)", "room_id (FK)", "alert_type (8 types)", "severity (INFO/WARNING/CRITICAL)", "parameter", "current_value", "threshold_value", "message", "is_read", "acknowledged_by", "is_resolved", "resolved_at"]

    - id: 12
      name: "harvests"
      purpose: "Harvest weight and grade records"
      records: "10K-500K"
      key_columns: ["harvest_id (PK)", "room_id (FK)", "harvested_at", "weight_kg", "grade (A/B/C)", "notes", "recorded_by (FK)"]

    - id: 13
      name: "growth_cycles"
      purpose: "Growth stage lifecycle tracking per room"
      records: "10K-100K"
      key_columns: ["cycle_id (PK)", "room_id (FK)", "started_at", "current_stage (6 stages)", "stage_changed_at", "expected_harvest_date", "target_yield_kg", "auto_adjust_thresholds (bool)", "is_active"]
      stages: ["INOCULATION", "SPAWN_RUN", "INCUBATION", "FRUITING", "HARVEST", "IDLE"]

    - id: 14
      name: "climate_guidelines"
      purpose: "Optimal environmental ranges per mushroom type per growth stage"
      records: "24 (4 plant types x 6 stages)"
      key_columns: ["guideline_id (PK)", "plant_type", "growth_stage", "temp_min/max", "humidity_min/max", "co2_min/max", "hysteresis values", "duration_days_min/max", "notes"]
      unique: "plant_type + growth_stage"

    - id: 15
      name: "firmware"
      purpose: "Firmware binary versions for OTA"
      records: "100-1000"
      key_columns: ["firmware_id (PK)", "version (unique)", "checksum_sha256", "file_path", "file_size", "release_notes", "is_active"]

    - id: 16
      name: "reports"
      purpose: "Generated report metadata"
      records: "1K-50K"
      key_columns: ["report_id (PK)", "plant_id (FK)", "report_type (DAILY/WEEKLY/MONTHLY/CUSTOM)", "report_name", "file_path", "format (CSV/EXCEL/PDF)", "date_from", "date_to", "generated_by (FK)"]

    - id: 17
      name: "audit_log"
      purpose: "User action audit trail"
      records: "millions"
      key_columns: ["log_id (PK, BigInteger)", "user_id (FK)", "action (enum)", "table_name", "record_id", "old_value (JSON)", "new_value (JSON)", "ip_address"]

  alembic_migrations:
    - { id: "67a248623c99", name: "initial_tables", tables: "owners, users, plants, rooms, devices, thresholds, room_readings, alerts, audit_log" }
    - { id: "4770d3122eab", name: "relay_config_and_schedule", tables: "relay_config, relay_schedule, relay_status" }
    - { id: "d6969b656e15", name: "firmware_ota_tables", tables: "firmware + OTA fields on devices" }
    - { id: "8ed3cd187f87", name: "harvest_and_growth_cycle", tables: "harvests, growth_cycles" }
    - { id: "4c676c310f90", name: "climate_guidelines_and_auto_adjust", tables: "climate_guidelines + auto_adjust_thresholds on growth_cycles" }
    - { id: "b3ddedb254b2", name: "onboarding_relay_expansion", tables: "device onboarding fields" }
    - { id: "10477b6ee802", name: "device_lifecycle_mqtt_fields", tables: "communication_mode, qr_code_image on devices" }

  hierarchy: |
    OWNER (Company)
      +-- USERS (Super Admin, Admin, Manager, Operator, Viewer)
      +-- PLANTS (Farm locations)
           +-- ROOMS (Growing rooms)
                +-- THRESHOLDS (3 per room: CO2, Humidity, Temperature)
                +-- GROWTH_CYCLES (active lifecycle per room)
                +-- HARVESTS (harvest records)
                +-- DEVICES (ESP32 controllers)
                     +-- RELAY_CONFIG (7 relay configs per device)
                     +-- RELAY_SCHEDULE (time-based schedules)
                     +-- ROOM_READINGS (sensor data)
                     +-- RELAY_STATUS (relay history)
                     +-- ALERTS (threshold violations)
    CLIMATE_GUIDELINES (global: 4 plant types x 6 stages)
    FIRMWARE (global: OTA binary versions)
    REPORTS (per plant)
    AUDIT_LOG (per user)

  enums:
    UserRole: ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR", "VIEWER"]
    RoomType: ["SPAWN_RUN", "FRUITING", "INCUBATION", "STORAGE"]
    PlantType: ["OYSTER", "BUTTON", "SHIITAKE", "MIXED"]
    DeviceType: ["ESP32", "ESP8266", "ARDUINO", "PLC"]
    RelayType: ["CO2", "HUMIDITY", "TEMPERATURE", "AHU", "HUMIDIFIER", "DUCT_FAN", "EXTRA"]
    TriggerType: ["MANUAL", "AUTO", "SCHEDULE"]
    ThresholdParameter: ["CO2", "HUMIDITY", "TEMPERATURE"]
    AlertType: ["CO2_HIGH", "CO2_LOW", "TEMP_HIGH", "TEMP_LOW", "HUMIDITY_HIGH", "HUMIDITY_LOW", "DEVICE_OFFLINE", "SENSOR_ERROR"]
    Severity: ["INFO", "WARNING", "CRITICAL"]
    ReportType: ["DAILY", "WEEKLY", "MONTHLY", "CUSTOM"]
    ReportFormat: ["PDF", "EXCEL", "CSV"]
    SubscriptionStatus: ["PENDING", "PENDING_APPROVAL", "ACTIVE", "SUSPENDED", "EXPIRED"]
    CommunicationMode: ["HTTP", "MQTT"]
    AuditAction: ["CREATE", "READ", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "EXPORT", "CONFIG_CHANGE"]
    HarvestGrade: ["A", "B", "C"]
    GrowthStage: ["INOCULATION", "SPAWN_RUN", "INCUBATION", "FRUITING", "HARVEST", "IDLE"]

  user_roles:
    SUPER_ADMIN:
      plants: "all"
      rooms: "all"
      devices: "all"
      thresholds: "all"
      alerts: "all"
      users: "all"
      reports: "all"
      firmware: "all"
      climate_guidelines: "all"

    ADMIN:
      plants: "own"
      rooms: "own"
      devices: "own"
      thresholds: "CRUD"
      alerts: "CRUD"
      users: "CRUD"
      reports: "CRUD"
      firmware: "all"
      climate_guidelines: "read/update"

    MANAGER:
      plants: "assigned"
      rooms: "assigned"
      devices: "assigned"
      thresholds: "read/update"
      alerts: "read/ack"
      users: "read"
      reports: "generate"
      relay_control: "yes"
      growth_cycles: "manage"

    OPERATOR:
      plants: "assigned"
      rooms: "assigned"
      devices: "read"
      thresholds: "read"
      alerts: "read/ack"
      users: "none"
      reports: "read"
      relay_control: "manual only"

    VIEWER:
      plants: "assigned"
      rooms: "assigned"
      devices: "read"
      thresholds: "read"
      alerts: "read"
      users: "none"
      reports: "read"
      relay_control: "none"

================================================================================
API ARCHITECTURE
================================================================================

api:
  base_url: "/api/v1"
  authentication: "JWT (httpOnly cookies)"
  csrf: "X-CSRF-Token header"
  rate_limiting: "30 requests/60s on login"

  routers:
    - name: "auth"
      prefix: "/auth"
      endpoints:
        - { method: "POST", path: "/login", access: "public", description: "Login with username/password, returns JWT cookies" }
        - { method: "POST", path: "/logout", access: "authenticated", description: "Clear JWT cookies" }
        - { method: "POST", path: "/refresh", access: "authenticated", description: "Refresh access token" }
        - { method: "GET", path: "/me", access: "authenticated", description: "Get current user profile" }
        - { method: "POST", path: "/change-password", access: "authenticated", description: "Change password" }

    - name: "owners"
      prefix: "/owners"
      endpoints:
        - { method: "GET", path: "/", access: "SUPER_ADMIN", description: "List all owners" }
        - { method: "GET", path: "/{id}", access: "ADMIN+", description: "Get owner by ID" }
        - { method: "POST", path: "/", access: "SUPER_ADMIN", description: "Create new owner" }
        - { method: "PUT", path: "/{id}", access: "ADMIN+", description: "Update owner" }

    - name: "users"
      prefix: "/users"
      endpoints:
        - { method: "GET", path: "/", access: "ADMIN+", description: "List users (filtered by owner)" }
        - { method: "GET", path: "/{id}", access: "ADMIN+", description: "Get user by ID" }
        - { method: "POST", path: "/", access: "ADMIN+", description: "Create new user" }
        - { method: "PUT", path: "/{id}", access: "ADMIN+", description: "Update user (role, plants, status)" }
        - { method: "DELETE", path: "/{id}", access: "ADMIN+", description: "Delete user (soft delete)" }

    - name: "plants"
      prefix: "/plants"
      endpoints:
        - { method: "GET", path: "/", access: "authenticated", description: "List plants (filtered by owner + assigned)" }
        - { method: "GET", path: "/{id}", access: "authenticated", description: "Get plant by ID" }
        - { method: "POST", path: "/", access: "ADMIN+", description: "Create new plant" }
        - { method: "PUT", path: "/{id}", access: "ADMIN+", description: "Update plant" }
        - { method: "DELETE", path: "/{id}", access: "ADMIN+", description: "Delete plant" }
        - { method: "GET", path: "/{id}/rooms", access: "authenticated", description: "List rooms for a plant" }

    - name: "rooms"
      prefix: "/rooms"
      endpoints:
        - { method: "GET", path: "/", access: "authenticated", description: "List all rooms" }
        - { method: "GET", path: "/{id}", access: "authenticated", description: "Get room by ID" }
        - { method: "POST", path: "/", access: "ADMIN+", description: "Create new room" }
        - { method: "PUT", path: "/{id}", access: "ADMIN+", description: "Update room" }
        - { method: "DELETE", path: "/{id}", access: "ADMIN+", description: "Delete room" }

    - name: "devices"
      prefix: "/devices"
      endpoints:
        - { method: "GET", path: "/", access: "authenticated", description: "List all devices" }
        - { method: "GET", path: "/{id}", access: "authenticated", description: "Get device by ID" }
        - { method: "PUT", path: "/{id}", access: "ADMIN+", description: "Update device" }
        - { method: "DELETE", path: "/{id}", access: "ADMIN+", description: "Delete device" }
        - { method: "POST", path: "/provision", access: "ADMIN+", description: "Provision new device (generate license_key)" }
        - { method: "POST", path: "/{id}/assign", access: "ADMIN+", description: "Assign device to room" }
        - { method: "POST", path: "/{id}/kill-switch", access: "ADMIN+", description: "Kill switch (disable device)" }
        - { method: "POST", path: "/{id}/revoke", access: "ADMIN+", description: "Revoke device access" }
        - { method: "POST", path: "/link", access: "ADMIN+", description: "Link device to room via license key" }
        - { method: "GET", path: "/pending-approval", access: "ADMIN+", description: "List devices pending approval" }
        - { method: "POST", path: "/{id}/approve", access: "ADMIN+", description: "Approve pending device" }
        - { method: "POST", path: "/{id}/qr-image", access: "ADMIN+", description: "Upload QR code image" }
        - { method: "GET", path: "/{id}/qr-image", access: "authenticated", description: "Get QR code image" }
        - { method: "GET", path: "/pending", access: "ADMIN+", description: "Get pending devices count" }

    - name: "device_api"
      prefix: "/device"
      endpoints:
        - { method: "POST", path: "/register", access: "device", description: "Register new device (MAC + firmware)" }
        - { method: "GET", path: "/provision/{license_key}", access: "device", description: "Provision device by license key" }
        - { method: "POST", path: "/readings", access: "device", description: "Submit sensor readings" }
        - { method: "POST", path: "/heartbeat", access: "device", description: "Device heartbeat" }
        - { method: "GET", path: "/{id}/commands", access: "device", description: "Poll for relay commands" }

    - name: "thresholds"
      prefix: "/thresholds"
      endpoints:
        - { method: "GET", path: "/room/{id}", access: "authenticated", description: "Get thresholds for a room (CO2, HUMIDITY, TEMPERATURE)" }
        - { method: "PUT", path: "/room/{id}", access: "ADMIN/MANAGER", description: "Update thresholds + MQTT sync to devices" }

    - name: "alerts"
      prefix: "/alerts"
      endpoints:
        - { method: "GET", path: "/", access: "authenticated", description: "List alerts (with filters)" }
        - { method: "GET", path: "/active", access: "authenticated", description: "Get active (unresolved) alerts" }
        - { method: "GET", path: "/{id}", access: "authenticated", description: "Get alert by ID" }
        - { method: "POST", path: "/{id}/acknowledge", access: "authenticated", description: "Acknowledge alert" }
        - { method: "POST", path: "/{id}/resolve", access: "ADMIN/MANAGER", description: "Resolve alert" }

    - name: "live"
      prefix: "/live"
      description: "Real-time data & relay control"
      endpoints:
        - { method: "GET", path: "/readings", access: "authenticated", description: "Get all live readings (from Redis)" }
        - { method: "GET", path: "/readings/device/{id}", access: "authenticated", description: "Get live reading for device" }
        - { method: "GET", path: "/readings/room/{id}", access: "authenticated", description: "Get live reading for room" }
        - { method: "GET", path: "/relay/{device_id}", access: "authenticated", description: "Get relay states for device" }
        - { method: "POST", path: "/relay/{device_id}", access: "ADMIN/MANAGER", description: "Set relay command (type + state)" }
        - { method: "GET", path: "/relay-config/{device_id}", access: "authenticated", description: "Get relay config (mode per relay)" }
        - { method: "PUT", path: "/relay-config/{device_id}", access: "ADMIN/MANAGER", description: "Update relay config (mode, params)" }
        - { method: "POST", path: "/relay-config/{device_id}/all-auto", access: "ADMIN/MANAGER", description: "Set all relays to AUTO mode" }
        - { method: "POST", path: "/relay-config/{device_id}/all-manual", access: "ADMIN/MANAGER", description: "Set all relays to MANUAL mode" }
        - { method: "GET", path: "/relay-schedule/{device_id}", access: "authenticated", description: "Get relay schedules" }
        - { method: "POST", path: "/relay-schedule/{device_id}", access: "ADMIN/MANAGER", description: "Create relay schedule" }
        - { method: "PUT", path: "/relay-schedule/{id}", access: "ADMIN/MANAGER", description: "Update relay schedule" }
        - { method: "DELETE", path: "/relay-schedule/{id}", access: "ADMIN/MANAGER", description: "Delete relay schedule" }

    - name: "dashboard"
      prefix: "/dashboard"
      endpoints:
        - { method: "GET", path: "/summary", access: "authenticated", description: "Get dashboard summary (counts)" }
        - { method: "GET", path: "/current-readings", access: "authenticated", description: "Get current sensor readings" }
        - { method: "GET", path: "/admin-summary", access: "ADMIN+", description: "Full admin dashboard (plants, devices, subscriptions, alerts)" }

    - name: "readings"
      prefix: "/readings"
      endpoints:
        - { method: "GET", path: "/room/{id}", access: "authenticated", description: "Get historical readings for room" }
        - { method: "GET", path: "/device/{id}", access: "authenticated", description: "Get historical readings for device" }
        - { method: "GET", path: "/export", access: "authenticated", description: "Export readings as CSV" }

    - name: "harvests"
      prefix: "/harvests"
      endpoints:
        - { method: "POST", path: "/", access: "ADMIN/MANAGER", description: "Log new harvest (room, weight, grade)" }
        - { method: "GET", path: "/room/{id}", access: "authenticated", description: "Get harvests for a room" }
        - { method: "GET", path: "/summary", access: "authenticated", description: "Get overall harvest summary" }
        - { method: "GET", path: "/summary/room/{id}", access: "authenticated", description: "Get harvest summary for a room" }

    - name: "growth_cycles"
      prefix: "/growth-cycles"
      endpoints:
        - { method: "POST", path: "/", access: "ADMIN/MANAGER", description: "Start new growth cycle" }
        - { method: "PUT", path: "/{id}/advance", access: "ADMIN/MANAGER", description: "Advance to next growth stage (+ auto-adjust thresholds)" }
        - { method: "GET", path: "/room/{id}/current", access: "authenticated", description: "Get active growth cycle for room" }
        - { method: "GET", path: "/room/{id}", access: "authenticated", description: "Get all growth cycles for room" }

    - name: "climate_advisory"
      prefix: "/advisory"
      endpoints:
        - { method: "GET", path: "/room/{id}", access: "authenticated", description: "Get climate advisory (recommendations, deviations, reminders)" }
        - { method: "GET", path: "/guidelines", access: "authenticated", description: "List all climate guidelines" }
        - { method: "GET", path: "/plant/{type}/stage/{stage}", access: "authenticated", description: "Get specific guideline" }
        - { method: "PUT", path: "/room/{id}/thresholds", access: "ADMIN", description: "Edit guideline values" }
        - { method: "POST", path: "/room/{id}/apply", access: "ADMIN/MANAGER", description: "Apply recommended thresholds to room" }

    - name: "reports"
      prefix: "/reports"
      endpoints:
        - { method: "GET", path: "/", access: "authenticated", description: "List all reports" }
        - { method: "GET", path: "/{id}", access: "authenticated", description: "Get report by ID" }
        - { method: "POST", path: "/", access: "ADMIN/MANAGER", description: "Generate new report" }
        - { method: "GET", path: "/{id}/download", access: "authenticated", description: "Download report file" }
        - { method: "DELETE", path: "/{id}", access: "ADMIN+", description: "Delete report" }

    - name: "firmware"
      prefix: "/firmware"
      endpoints:
        - { method: "POST", path: "/upload", access: "ADMIN+", description: "Upload firmware binary" }
        - { method: "GET", path: "/", access: "ADMIN+", description: "List firmware versions" }
        - { method: "GET", path: "/{id}", access: "ADMIN+", description: "Get firmware details" }
        - { method: "POST", path: "/{id}/rollout", access: "ADMIN+", description: "Trigger OTA rollout" }
        - { method: "GET", path: "/{device_id}/status", access: "ADMIN+", description: "Get OTA status for device" }
        - { method: "GET", path: "/{id}/download", access: "device", description: "Download firmware binary" }

    - name: "emqx_auth"
      prefix: "/emqx"
      endpoints:
        - { method: "POST", path: "/auth", access: "internal", description: "MQTT broker authentication webhook" }

    - name: "websocket"
      prefix: "/ws"
      endpoints:
        - { method: "WebSocket", path: "/{owner_id}", access: "JWT query param", description: "Real-time push (sensor, relay, alert events)" }

================================================================================
IMPLEMENTED FEATURES (Phase 1 Complete)
================================================================================

features:
  core_monitoring:
    status: "COMPLETE"
    description: "Full IoT monitoring pipeline"
    components:
      - "ESP32 sensor reading (CO2, temp, humidity, 10 bag temps, outdoor)"
      - "MQTT telemetry ingestion (30s interval)"
      - "Redis live cache (60s TTL)"
      - "PostgreSQL historical storage"
      - "WebSocket real-time push to dashboard"
      - "Live circular gauges + bag temperature strip"
      - "Historical data charts (Recharts line charts)"

  relay_automation:
    status: "COMPLETE"
    description: "7-relay control with 3 operating modes"
    modes:
      MANUAL: "Direct ON/OFF toggle from dashboard"
      AUTO: "Threshold-based with hysteresis (backend evaluates each reading)"
      SCHEDULE: "Day-of-week bitmask + time-on/time-off windows (60s evaluation loop)"
    relay_types: ["CO2", "HUMIDITY", "TEMPERATURE", "AHU", "HUMIDIFIER", "DUCT_FAN", "EXTRA"]
    features:
      - "Per-relay mode configuration (MANUAL/AUTO/SCHEDULE)"
      - "Auto mode: compares sensor value vs threshold min/max with hysteresis"
      - "Schedule mode: 60-second background task, day-of-week bitmask, time windows"
      - "Bulk mode: Set all relays to AUTO or MANUAL with one click"
      - "MQTT command publishing to devices"
      - "Relay state history logging"

  threshold_management:
    status: "COMPLETE"
    description: "Per-room threshold configuration with MQTT sync"
    features:
      - "3 parameters per room: CO2, Humidity, Temperature"
      - "Min/max values + hysteresis"
      - "Settings page with live gauge preview"
      - "MQTT config sync: threshold changes published to device/{licenseKey}/config"
      - "Device updates EEPROM values in real-time"

  harvest_tracking:
    status: "COMPLETE"
    description: "Harvest weight and grade recording per room"
    features:
      - "Log harvest: date, weight_kg, grade (A/B/C), notes"
      - "Room-specific harvest history"
      - "Harvest summary: total weight, total count, grade breakdown"
      - "Yield summary cards on dashboard"
      - "Room yield pie chart (grade distribution)"

  growth_cycle_management:
    status: "COMPLETE"
    description: "Growth stage lifecycle tracking per room"
    stages: ["INOCULATION", "SPAWN_RUN", "INCUBATION", "FRUITING", "HARVEST", "IDLE"]
    features:
      - "Start new growth cycle with target yield and expected harvest date"
      - "Advance through stages (sequential order enforced)"
      - "Stage timeline visualization with day counter"
      - "Auto-adjust thresholds on stage advance (opt-in per cycle)"
      - "Integration with climate advisory for recommended ranges"

  climate_advisory:
    status: "COMPLETE"
    description: "Smart climate guidance per mushroom type per growth stage"
    features:
      - "24 seeded guidelines (4 plant types x 6 growth stages)"
      - "Optimal ranges: temp, humidity, CO2 with hysteresis values"
      - "Duration estimates per stage (min/max days)"
      - "Farming tips/notes per stage"
      - "Advisory API computes per room:"
      - "  - Current thresholds vs recommended ranges"
      - "  - Deviations with severity (minor/significant)"
      - "  - Days in current stage vs expected duration"
      - "  - Transition reminders (phase ending soon)"
      - "  - Next stage preview (what values will change)"
      - "  - Actionable suggestions"
      - "Apply recommended thresholds (one-click)"
      - "Auto-adjust toggle: ON = thresholds auto-update on stage advance"
      - "MQTT sync: threshold changes propagated to ESP32 devices"
    seed_data:
      oyster:
        INOCULATION: { temp: "20-24", humidity: "60-70", co2: "n/a", days: "2-3" }
        SPAWN_RUN: { temp: "24-28", humidity: "80-85", co2: "n/a-5000", days: "14-21" }
        INCUBATION: { temp: "20-24", humidity: "85-90", co2: "n/a-2000", days: "7-14" }
        FRUITING: { temp: "13-18", humidity: "85-95", co2: "400-1000", days: "5-10" }
        HARVEST: { temp: "15-20", humidity: "70-80", co2: "n/a", days: "1-3" }
        IDLE: { temp: "n/a", humidity: "n/a", co2: "n/a", days: "n/a" }
      button: "Similar ranges optimized for Agaricus bisporus"
      shiitake: "Similar ranges optimized for Lentinula edodes"
      mixed: "Conservative ranges suitable for mixed cultivation"

  alert_system:
    status: "COMPLETE"
    description: "Threshold violation detection and notification"
    alert_types: ["CO2_HIGH", "CO2_LOW", "TEMP_HIGH", "TEMP_LOW", "HUMIDITY_HIGH", "HUMIDITY_LOW", "DEVICE_OFFLINE", "SENSOR_ERROR"]
    severity_levels: ["INFO", "WARNING", "CRITICAL"]
    features:
      - "Auto-created on threshold violation during reading ingestion"
      - "WebSocket push to connected clients"
      - "Severity-based filtering"
      - "Acknowledge and resolve workflow"
      - "Active alert badge on sidebar navigation"
      - "Alert history with room/device filtering"

  device_management:
    status: "COMPLETE"
    description: "Full device lifecycle management"
    features:
      - "Provision new devices (generate license_key)"
      - "Device linking: assign device to room via license key"
      - "QR code generation and scanning"
      - "Pending approval workflow"
      - "Subscription status tracking (PENDING/ACTIVE/SUSPENDED/EXPIRED)"
      - "Kill switch (disable device remotely)"
      - "Revoke access"
      - "Device status monitoring (online/offline, WiFi signal, free heap)"
      - "Communication mode tracking (HTTP/MQTT)"

  firmware_ota:
    status: "COMPLETE"
    description: "Over-The-Air firmware update management"
    features:
      - "Upload firmware binary with version and release notes"
      - "Firmware version history"
      - "Trigger OTA rollout to selected devices"
      - "OTA status tracking per device"
      - "SHA256 checksum validation"

  reports:
    status: "COMPLETE"
    description: "Report generation and export"
    report_types: ["DAILY_SUMMARY", "WEEKLY_SUMMARY", "ALERT_REPORT", "HARVEST_REPORT"]
    formats: ["CSV", "EXCEL", "PDF"]
    features:
      - "Generate reports with date range"
      - "Download generated reports"
      - "Delete old reports"
      - "Export raw readings as CSV"

  user_management:
    status: "COMPLETE"
    description: "Role-based user administration"
    roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATOR", "VIEWER"]
    features:
      - "CRUD operations on users"
      - "Role assignment"
      - "Plant assignment (restrict access to specific plants)"
      - "Account lockout after 5 failed login attempts (15 min lock)"
      - "Unlock locked accounts"

  authentication:
    status: "COMPLETE"
    description: "JWT cookie-based authentication"
    features:
      - "Login with username/password"
      - "JWT access + refresh tokens in httpOnly cookies"
      - "CSRF protection (X-CSRF-Token header)"
      - "Auto-refresh on 401"
      - "Account lockout (5 failed attempts = 15 min lock)"
      - "Password change"
      - "Rate limiting (30 req/60s on login)"

  dashboard:
    status: "COMPLETE"
    description: "Role-specific dashboard views"
    admin_dashboard:
      - "Plant overview cards (rooms, devices per plant)"
      - "Device status summary (online/offline/unassigned)"
      - "Subscription stats (active/pending/suspended/expired)"
      - "Room type breakdown"
      - "Alert metrics (critical/warning/info/total active)"
      - "Recent device events"
    user_dashboard:
      - "Summary metric cards (plants, rooms, devices, alerts)"
      - "Room cards with live sensor gauges"
      - "Yield summary (total harvests, grade breakdown)"
      - "Active alert widget"
      - "Equipment matrix (rooms x relay types)"
      - "Historical data chart"

================================================================================
FRONTEND PAGES
================================================================================

pages:
  - name: "Login"
    route: "/login"
    access: "public"
    features: ["username/password form", "validation errors", "lockout timer", "GSAP animations"]

  - name: "Dashboard"
    route: "/dashboard"
    access: "authenticated"
    features: ["admin view (ADMIN/SUPER_ADMIN)", "user view (MANAGER/OPERATOR/VIEWER)", "real-time WebSocket updates"]

  - name: "Plants"
    route: "/plants"
    access: "authenticated"
    features: ["CRUD", "filter by type/status", "search", "navigate to rooms"]

  - name: "Rooms"
    route: "/rooms"
    access: "authenticated"
    features: ["grid view with room cards", "live sensor gauges", "filter by plant/type", "navigate to room detail"]

  - name: "Room Detail"
    route: "/rooms/:roomId"
    access: "authenticated"
    features:
      - "Live sensor gauges (CO2, temp, humidity)"
      - "Bag temperature strip (10 sensors)"
      - "Historical data chart"
      - "Relay controls (MANUAL/AUTO/SCHEDULE toggles)"
      - "Schedule editor (day-of-week + time windows)"
      - "Growth cycle management (start cycle, advance stage)"
      - "Stage timeline with day counter"
      - "Climate advisory card (recommendations, deviations, suggestions)"
      - "Harvest logging (weight, grade, notes)"
      - "Room yield summary with pie chart"
      - "Threshold display"
      - "Device info"
      - "Export readings as CSV"

  - name: "Devices"
    route: "/devices"
    access: "authenticated"
    features: ["device table", "pending approval section", "link device dialog", "QR code view/scan", "kill switch", "revoke", "subscription status"]

  - name: "Settings"
    route: "/settings"
    access: "authenticated"
    features: ["select room", "adjust CO2/temp/humidity thresholds", "hysteresis config", "live gauge preview"]

  - name: "Alerts"
    route: "/alerts"
    access: "authenticated"
    features: ["filter by severity/room/status", "acknowledge/resolve", "alert detail modal"]

  - name: "Reports"
    route: "/reports"
    access: "authenticated"
    features: ["generate reports (daily/weekly/alert/harvest)", "download CSV/Excel/PDF", "delete"]

  - name: "Profile"
    route: "/profile"
    access: "authenticated"
    features: ["user info display", "change password"]

  - name: "Users"
    route: "/users"
    access: "ADMIN+"
    features: ["CRUD users", "assign plants", "change roles", "unlock accounts", "filter by role"]

  - name: "Firmware Management"
    route: "/firmware"
    access: "ADMIN+"
    features: ["upload firmware", "version history", "trigger OTA rollout", "monitor OTA status"]

================================================================================
BACKEND SERVICES
================================================================================

services:
  - name: "auth_service"
    file: "backend/app/services/auth_service.py"
    purpose: "User authentication, password verification, JWT token creation, login lockout"

  - name: "reading_service"
    file: "backend/app/services/reading_service.py"
    purpose: "Process sensor readings: Redis cache + PostgreSQL storage + threshold check + alert creation + auto relay evaluation + WebSocket push"

  - name: "relay_automation"
    file: "backend/app/services/relay_automation.py"
    purpose: "AUTO mode relay evaluation: compares sensor value vs threshold with hysteresis, toggles relay via MQTT"

  - name: "relay_scheduler"
    file: "backend/app/services/relay_scheduler.py"
    purpose: "SCHEDULE mode: 60-second background task, checks day-of-week bitmask + time_on/time_off, toggles relays"

  - name: "mqtt_client"
    file: "backend/app/services/mqtt_client.py"
    purpose: "MQTT client manager: subscribe to telemetry/status, publish commands/config/control, handle LWT"
    methods:
      - "start() - connect to MQTT broker, subscribe to topics"
      - "stop() - disconnect"
      - "_handle_telemetry() - process readings from device"
      - "_handle_status() - handle device online/offline"
      - "publish_control() - kill switch / restart"
      - "publish_relay_command() - relay ON/OFF"
      - "publish_config_update() - threshold config sync to device EEPROM"
      - "publish_broadcast_control() - broadcast to all devices"

  - name: "climate_advisory"
    file: "backend/app/services/climate_advisory.py"
    purpose: "Climate guideline recommendations, deviation computation, stage reminders, auto-adjust thresholds"
    methods:
      - "get_advisory_for_room() - compute recommendations, deviations, day count, reminders"
      - "apply_guideline_thresholds() - overwrite threshold rows with guideline values"
      - "on_stage_advanced() - auto-apply hook called after stage change (if auto_adjust=true)"

  - name: "ws_manager"
    file: "backend/app/services/ws_manager.py"
    purpose: "WebSocket connection manager for real-time push to frontend clients"

  - name: "report_generator"
    file: "backend/app/services/report_generator.py"
    purpose: "Generate CSV/Excel/PDF reports from sensor readings and harvest data"

================================================================================
SECURITY ARCHITECTURE
================================================================================

security:
  authentication:
    web_users:
      method: "JWT (httpOnly cookies)"
      token_types: ["access_token", "refresh_token"]
      access_ttl: "15 minutes"
      refresh_ttl: "7 days"
      storage: "httpOnly, Secure, SameSite=Lax cookies"
      csrf: "X-CSRF-Token header"
      rate_limiting: "30 requests/60s on login endpoint"
      lockout: "5 failed attempts = 15 minute lock"

    esp32_devices:
      method: "License Key + MQTT client ID"
      key_format: "LIC-XXXX-XXXX-XXXX (18 chars)"
      storage: "EEPROM"
      mqtt_auth: "EMQX HTTP auth plugin -> backend /emqx/auth"

    websocket:
      method: "JWT in query param"
      url: "ws://api/ws/{owner_id}?token={jwt}"
      validation: "on connection, reject if expired"

  authorization:
    rbac_matrix:
      SUPER_ADMIN: { plants: "all", rooms: "all", devices: "all", thresholds: "all", alerts: "all", users: "all", reports: "all", firmware: "all", advisory: "all" }
      ADMIN: { plants: "own", rooms: "own", devices: "own", thresholds: "CRUD", alerts: "CRUD", users: "CRUD", reports: "CRUD", firmware: "all", advisory: "read/update" }
      MANAGER: { plants: "assigned", rooms: "assigned", devices: "assigned", thresholds: "read/update", alerts: "read/ack", users: "read", reports: "generate", relay: "control", growth: "manage" }
      OPERATOR: { plants: "assigned", rooms: "assigned", devices: "read", thresholds: "read", alerts: "read/ack", users: "none", reports: "read" }
      VIEWER: { plants: "assigned", rooms: "assigned", devices: "read", thresholds: "read", alerts: "read", users: "none", reports: "read" }

  tenant_isolation:
    method: "PostgreSQL RLS + owner_id filtering in all queries"

  implemented:
    - { feature: "JWT authentication (cookies)", status: "COMPLETE" }
    - { feature: "CSRF protection", status: "COMPLETE" }
    - { feature: "License key auth (device)", status: "COMPLETE" }
    - { feature: "MQTT auth (EMQX plugin)", status: "COMPLETE" }
    - { feature: "CORS policy", status: "COMPLETE" }
    - { feature: "Rate limiting (login)", status: "COMPLETE" }
    - { feature: "Input validation (Pydantic)", status: "COMPLETE" }
    - { feature: "Password hashing (bcrypt)", status: "COMPLETE" }
    - { feature: "Account lockout", status: "COMPLETE" }
    - { feature: "Role-based access control", status: "COMPLETE" }
    - { feature: "Owner-scoped data isolation", status: "COMPLETE" }

================================================================================
DEVELOPMENT PHASES
================================================================================

phases:
  - id: 1
    name: "Core IoT Monitoring + Automation"
    duration: "Completed"
    status: "COMPLETE"
    goal: "Full monitoring + automation + harvest + advisory platform"
    deliverables_completed:
      - "FastAPI async backend with 80+ endpoints across 17 routers"
      - "PostgreSQL database with 17 tables + 7 Alembic migrations"
      - "Redis integration for live sensor cache (60s TTL)"
      - "MQTT client (aiomqtt) for device communication"
      - "WebSocket server for real-time dashboard"
      - "React 18 + TypeScript dashboard with 14 pages + 100+ components"
      - "Dark IoT theme with TailwindCSS + shadcn/ui"
      - "7-relay automation with MANUAL/AUTO/SCHEDULE modes"
      - "Relay scheduler (60s background task, day-of-week bitmask)"
      - "Threshold management with MQTT config sync to devices"
      - "Harvest tracking (weight, grade A/B/C, yield summary)"
      - "Growth cycle management (6-stage lifecycle)"
      - "Climate advisory system (24 guidelines, deviations, reminders, auto-adjust)"
      - "Alert system (8 types, 3 severities, acknowledge/resolve)"
      - "Device management (provision, link, QR code, kill switch, OTA)"
      - "Firmware OTA management (upload, rollout, status tracking)"
      - "Report generation (CSV/Excel/PDF) and download"
      - "User management (RBAC, 5 roles, plant assignment)"
      - "JWT cookie authentication with CSRF + rate limiting"
      - "EMQX MQTT authentication integration"
      - "Admin + User role-specific dashboards"
      - "E2E Playwright test suite (28 tests, 56 screenshots)"
      - "Data mapping layer (snake_case <-> camelCase, 14 mapper functions)"

  - id: 2
    name: "HVAC Automation + Mobile"
    duration: "Months 8-15"
    status: "PLANNED"
    goal: "5 beta farms live by Month 11. Advanced automation and mobile."
    deliverables:
      - "Raspberry Pi Gateway: Docker Compose (PG + Redis + MQTT)"
      - "Offline buffering on RPi (weeks of storage)"
      - "Advanced multi-sensor automation rules"
      - "PWA mobile optimization"
      - "Push notifications (FCM)"
      - "SMS alerts (Twilio/MSG91)"
      - "TimescaleDB for time-series optimization"
      - "Multi-device aggregation per room"

  - id: 3
    name: "ERP Modules"
    duration: "Months 16-22"
    status: "PLANNED"
    goal: "20 paying farms by Month 22. Full ERP platform."
    deliverables:
      - "Inventory management (substrate, spawn, packaging, chemicals)"
      - "Contamination incident tracking and pattern analysis"
      - "Cost analysis and profitability per room/batch"
      - "Industry benchmarking (anonymous cross-farm)"
      - "AI/ML yield predictions"
      - "Billing and subscription management"

================================================================================
INFRASTRUCTURE & COSTS
================================================================================

infrastructure:
  development:
    docker_compose:
      services:
        - { name: "PostgreSQL", port: 5432, version: "15+" }
        - { name: "Redis", port: 6379, version: "7+" }
    backend: { command: "uvicorn app.main:app --port 3800 --reload", venv: "backend/venv" }
    frontend: { command: "npm run dev -- --port 3801", dir: "frontend/" }

  production:
    phase_1_2:
      timeline: "Months 1-12"
      scale: "0-100 farms"
      services:
        - { name: "Web Service (FastAPI)", provider: "Render", plan: "Starter -> Standard", cost_usd: "7-25" }
        - { name: "PostgreSQL", provider: "Render", plan: "Starter (1GB) -> Standard (10GB)", cost_usd: "7-20" }
        - { name: "Redis", provider: "Render", plan: "Starter (25MB) -> Standard (100MB)", cost_usd: "10-20" }
        - { name: "Static Site (React)", provider: "Render", plan: "Free", cost_usd: "0" }
        - { name: "MQTT Broker (EMQX)", provider: "EMQX Cloud / self-hosted", cost_usd: "0-15" }
      total_monthly: { usd: "24-80", inr: "2,000-6,700" }

hardware_per_farm:
  components:
    - { item: "ESP32 WROOM module", cost_inr: 600 }
    - { item: "SCD4x CO2 sensor", cost_inr: 2500 }
    - { item: "DHT11", cost_inr: 250 }
    - { item: "DS18B20 x10", cost_inr: 1500 }
    - { item: "LCD 20x4", cost_inr: 400 }
    - { item: "7-Channel relay module", cost_inr: 500 }
    - { item: "Joystick", cost_inr: 150 }
    - { item: "3D printed enclosure", cost_inr: 500 }
    - { item: "PCB + wiring", cost_inr: 500 }
  total_per_device: "~6,900 INR"
  per_room: "~6,900 INR (1 device/room)"

================================================================================
MARKET ANALYSIS
================================================================================

market:
  industry:
    segment: "Indian mushroom market"
    cagr: "12%"
    size: "2,500+ Cr"
    target_customers: "1,000+ commercial farms (10+ rooms)"
    pain_points: ["Manual monitoring", "15-20% crop losses", "No standardization"]
    competition: "Zero India-focused mushroom IoT platforms"
    addressable_market: "200-300 Cr opportunity"

  total_addressable_problem: "4-6 lakhs annually lost per 100-room farm"

  segmentation:
    - tier: "Small"
      size: "2-10 rooms"
      count: "~500 farms"
      arpu_annual: "2.4L"
      tam: "120 Cr"
    - tier: "Medium"
      size: "10-30 rooms"
      count: "~400 farms"
      arpu_annual: "12L"
      tam: "480 Cr"
    - tier: "Large"
      size: "30+ rooms"
      count: "~100 farms"
      arpu_annual: "36L"
      tam: "360 Cr"
    total:
      farms: "1,000"
      tam: "960 Cr"
      addressable: "20-30% = 200-300 Cr"

================================================================================
TESTING
================================================================================

testing:
  e2e:
    framework: "Playwright"
    config:
      headless: false
      slowMo: 500
      screenshot: "on"
      trace: "on-first-retry"
    test_suites:
      admin:
        file: "frontend/e2e/full-walkthrough.spec.ts"
        tests: 19
        coverage: ["login", "dashboard", "plants", "rooms", "room detail", "devices", "alerts", "reports", "users", "settings", "profile", "firmware", "sidebar", "logout"]
      user:
        file: "frontend/e2e/user-walkthrough.spec.ts"
        tests: 9
        coverage: ["dashboard (user view)", "plants (filtered)", "rooms (filtered)", "room detail", "devices", "alerts", "settings", "sidebar (no admin links)", "blocked pages (users/firmware)"]
    screenshots:
      admin: 37
      user: 19
      total: 56
      directory: "screenshots/"

================================================================================
SEED DATA
================================================================================

seed:
  owner: { company: "Demo Farm", email: "admin@mushroomfarm.com" }
  admin_user: { username: "admin", password: "admin123", role: "ADMIN" }
  plant: { name: "North Valley Farm", type: "OYSTER", city: "Uttarakhand" }
  rooms:
    - { name: "Fruiting Room 1", type: "FRUITING", racks: 10, bags: 500 }
    - { name: "Spawn Run Room 2", type: "SPAWN_RUN", racks: 8, bags: 400 }
  device: { name: "ESP32-Sensor-01", license_key: "LIC-A3F7-K9M2-P5X8", status: "ACTIVE" }
  thresholds_per_room:
    - { parameter: "CO2", min: 1200, max: 1300, hysteresis: 100 }
    - { parameter: "HUMIDITY", min: 87.5, max: 90, hysteresis: 2.5 }
    - { parameter: "TEMPERATURE", min: 16, max: 17, hysteresis: 1 }
  climate_guidelines: "24 entries (4 plant types x 6 growth stages)"

================================================================================
PERSONA
================================================================================

persona:
  name: "Rajesh Kumar"
  age: 42
  location: "Ludhiana, Punjab"
  farm_size: "25 growing rooms, 500 bags/room"
  mushroom_type: "Button mushrooms (Agaricus bisporus)"
  monthly_revenue: "4-5 lakhs"
  current_tech: ["Excel", "WhatsApp", "manual thermometers"]
  pain_points:
    - "Spends 4-5 hours daily monitoring personally"
    - "Lost 80K last month to contamination (3 rooms)"
    - "Cannot hire trustworthy manager"
    - "Wants to expand to 50 rooms but fears losing control"
  willingness_to_pay: "2K-5K per room/month if proven ROI"

================================================================================
SUCCESS METRICS
================================================================================

metrics:
  platform_level_y1:
    farms_onboarded: { target: 50, source: "subscription database" }
    platform_uptime: { target: "99.5%", source: "Render Metrics + UptimeRobot" }
    api_latency_p95: { target: "<500ms", source: "monitoring" }
    websocket_latency: { target: "<1s", source: "monitoring" }
    monthly_recurring_revenue: { target: "7.5L", source: "revenue dashboard" }
    customer_acquisition_cost: { target: "<15K per farm", source: "marketing / farms" }
    daily_active_user_rate: { target: "60%", source: "analytics" }
    churn_rate: { target: "<12% annually", source: "cancellations" }

  farm_level_roi:
    - metric: "Contamination Loss"
      before: "12-18%"
      after: "<7%"
      timeline: "Within 6 months"
    - metric: "Deviation Detection Time"
      before: "4 hours"
      after: "<15 minutes"
      timeline: "Immediate"
    - metric: "Manual Data Entry"
      before: "2-3 hours/day"
      after: "<30 min/day"
      timeline: "Within 1 month"
    - metric: "Net Annual Savings"
      before: "-"
      after: "2-3L per farm"
      timeline: "Year 1"

  long_term_vision_y3_5:
    - "500+ farms across India (5% market penetration)"
    - "2Cr+ MRR from platform + marketplace"
    - "Reduce national contamination losses by 30% (150Cr+ saved annually)"
    - "10,000+ cultivation cycles documented"
    - "AI insights improving yields by 25%"

================================================================================
DOCUMENT CROSS-REFERENCE
================================================================================

references:
  master: "This Blueprint_DaC.md"
  implementation: "SYSTEM_INTEGRATION_DOCUMENT.md"
  user_manual: "Docs/Mushroom_Farm_User_Manual.docx"
  screenshots: "screenshots/ (admin-view/ + user-view/)"
  e2e_tests: "frontend/e2e/ (full-walkthrough.spec.ts + user-walkthrough.spec.ts)"

================================================================================
END OF DESIGN AS CODE SPECIFICATION
================================================================================
# DaC Version: 3.0.0
# Total Sections: 15
# Status: Phase 1 Complete — Production Ready
# Precision: Absolute
# Tables: 17 | Endpoints: 80+ | Pages: 14 | Components: 100+ | Tests: 28
