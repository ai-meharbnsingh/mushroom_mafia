# DaC: Mushroom Farm IoT & ERP Platform
# Version: 2.0.0
# Format: Design as Code v1.0
# Generated: 2026-03-08

================================================================================
METADATA
================================================================================

project:
  name: "Mushroom Farm IoT & ERP Platform"
  type: "Multi-Tenant SaaS"
  domain: ["Agricultural IoT", "ERP System"]
  target_market: "Commercial Mushroom Farms (India & Global)"
  blueprint_version: "2.0"
  status: "Pre-development"

document:
  generated: "2026-03-08"
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
      method: "real-time monitoring"
    
    - metric: "annual_savings"
      value: "4-6 lakhs"
      target: "per 100-room farm"
      method: "automated efficiency"
    
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
      features: ["monitoring", "automation", "inventory"]
    
    - name: "Enterprise"
      price_per_room: 3000
      currency: "INR"
      period: "monthly"
      condition: "at scale"
      features: ["full ERP", "AI"]

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
    language: "Python"
    features:
      - "Auto-generates OpenAPI/Swagger"
      - "Pydantic validation"
      - "Native async support"
    
  database:
    primary: "PostgreSQL"
    multitenancy: "Row-Level Security (RLS)"
    
  cache:
    technology: "Redis"
    purpose: ["live sensor data", "relay command queue"]
    
  frontend:
    framework: "React 18"
    language: "TypeScript"
    styling: "TailwindCSS"
    components: "shadcn/ui"
    features: ["Progressive Web App"]
    port: 3000
    
  realtime:
    protocol: "WebSocket"
    direction: "backend to frontend"
    
  edge_device:
    platform: "ESP32"
    framework: "Arduino C++"
    sync_interval:
      current: "5 min"
      target: "30 sec"
    protocol: "HTTP POST"
    
  orm:
    technology: "SQLAlchemy"
    migrations: "Alembic"
    
  infrastructure:
    phase_1_2:
      provider: "Render"
      services: ["Web Service", "Managed PostgreSQL", "Managed Redis", "Static Site"]
    phase_3:
      provider: "Render"
      tier: "Standard/Pro"
      features: ["auto-scaling", "zero-downtime deploys"]

================================================================================
SYSTEM ARCHITECTURE
================================================================================

architecture:
  layers:
    - name: "EDGE_LAYER"
      location: "on-farm"
      phase_1:
        devices: ["ESP32"]
        sensors:
          - { model: "SCD4x", interface: "I2C", purpose: "CO2, Room Temp, Room Humidity" }
          - { model: "DHT11", interface: "GPIO", purpose: "Outdoor Temp & Humidity" }
          - { model: "DS18B20", interface: "OneWire", quantity: 10, purpose: "Bag Temperature" }
        actuators:
          - { type: "3-Channel Relay", controls: ["CO2", "Humidity", "Temperature"] }
        display: { type: "LCD 20x4", interface: "I2C", address: "0x27" }
        input: { type: "Analog Joystick", interface: "ADC+GPIO" }
        sync: { protocol: "HTTP REST", format: "JSON", interval: "30s target / 5min current" }
        
      phase_2:
        addition: "Raspberry Pi Gateway"
        docker_services: ["PostgreSQL", "Redis", "MQTT Broker"]
        capabilities: ["offline buffering", "local analytics"]
        
    - name: "CLOUD_LAYER"
      location: "Render Platform"
      phase_1_2:
        backend: { type: "FastAPI Web Service", scaling: "manual" }
        database: { type: "PostgreSQL Managed", security: "RLS" }
        cache: { type: "Redis Managed", purpose: "live sensor cache" }
        frontend: { type: "Static Site", tier: "free" }
        storage: 
          - { type: "Render Disk", use: "photos, archives" }
          - { type: "Cloudflare R2", use: "backups" }
          
      phase_3:
        backend: { scaling: "auto", tier: "Standard/Pro" }
        
    - name: "CLIENT_LAYER"
      technology: "React 18 + TypeScript + TailwindCSS"
      port: 3000
      capabilities:
        - { name: "dashboard", realtime: true, protocol: "WebSocket" }
        - { name: "alerts", push: "WebSocket + optional SMS" }
        - { name: "crud", entities: ["Plants", "Rooms", "Devices", "Users", "Thresholds"] }
        - { name: "reports", formats: ["historical charts"] }
        - { name: "pwa", offline: true, installable: true }

  data_flow:
    device_to_cloud:
      direction: "ESP32 -> Cloud"
      protocol: "HTTP POST"
      interval: "30s/5min"
      headers: ["X-Device-ID", "X-Device-Key"]
      body: ["co2_ppm", "room_temp", "room_humidity", "bag_temps[]", "outdoor_temp", "outdoor_humidity", "relay_states"]
      
    cloud_processing:
      steps:
        - { order: 1, action: "validate device key" }
        - { order: 2, action: "write Redis (live cache)" }
        - { order: 3, action: "write PostgreSQL (history)" }
        - { order: 4, action: "check thresholds" }
        - { order: 5, action: "create alert if exceeded" }
        - { order: 6, action: "push via WebSocket" }
        
    device_polling:
      direction: "ESP32 <- Cloud"
      protocol: "HTTP GET"
      interval: "30s"
      endpoint: "/api/v1/device/{id}/commands"
      response: "relay commands queue"
      
    frontend_realtime:
      direction: "Cloud -> Dashboard"
      protocol: "WebSocket"
      url: "ws://api.domain.com/ws?token={jwt_token}"
      events:
        - { name: "sensor_update", trigger: "new reading", payload: ["device_id", "room_id", "co2_ppm", "room_temp", "room_humidity", "bag_temps[]", "timestamp"] }
        - { name: "relay_state_change", trigger: "relay toggled", payload: ["device_id", "relay_type", "state", "trigger_type", "triggered_by"] }
        - { name: "alert_created", trigger: "threshold violation", payload: ["alert_id", "device_id", "room_id", "alert_type", "severity", "message", "value", "threshold"] }
        - { name: "alert_acknowledged", trigger: "user action", payload: ["alert_id", "acknowledged_by", "acknowledged_at"] }
        - { name: "device_status_change", trigger: "online/offline", payload: ["device_id", "is_online", "last_seen"] }

================================================================================
HARDWARE SPECIFICATION (ESP32)
================================================================================

device:
  platform: "ESP32"
  variant: "ESP32DA"
  framework: "Arduino (C/C++)"
  firmware_size: "965 KB"
  architecture: "polling-based"
  status: "production"
  location: "Uttarakhand (real farm)"
  
  bill_of_materials:
    - { component: "Microcontroller", model: "ESP32 (ESP32DA)", interface: "-", qty: 1 }
    - { component: "CO2 Sensor", model: "SCD4x (Sensirion)", interface: "I2C", qty: 1 }
    - { component: "Outdoor Sensor", model: "DHT11", interface: "Digital GPIO", qty: 1 }
    - { component: "Temperature Array", model: "DS18B20", interface: "OneWire", qty: 10 }
    - { component: "Display", model: "LCD 20x4", interface: "I2C (0x27)", qty: 1 }
    - { component: "Relay Module", model: "3-Channel", interface: "GPIO", qty: 1 }
    - { component: "Input Device", model: "Analog Joystick", interface: "ADC + GPIO", qty: 1 }
    - { component: "Enclosure", model: "Custom", interface: "-", qty: 1 }
    
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
    root: "pcb_code/"
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
    - "eepromConfig.ino: Load saved thresholds & device key"
    - "initWifi.ino: Connect to WiFi, start OTA server"
    - "MAIN LOOP: Read sensors -> calibration -> threshold checks -> relay control -> LCD update -> HTTP POST"
    
  sensor_data:
    reading_interval: "continuous"
    post_interval: "30s (target) / 5min (current)"
    calibration: "offsets applied"
    local_automation: "threshold-based relay control"
    
  json_payload:
    endpoint: "POST /api/v1/device/readings"
    headers:
      X-Device-ID: "5"
      X-Device-Key: "A3F7K9M2P5X8"
      Content-Type: "application/json"
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
        
  command_polling:
    endpoint: "GET /api/v1/device/{id}/commands"
    interval: "30s"
    response_format:
      commands:
        - relay_type: "enum[co2, humidity, temperature]"
          state: "boolean"
          triggered_by: "string"
          
  local_automation:
    type: "threshold-based with hysteresis"
    thresholds:
      - parameter: "CO2"
        relay_on: "< 1200 ppm"
        relay_off: "> 1300 ppm"
        hysteresis: "100 ppm"
      - parameter: "Humidity"
        relay_on: ">= 90%"
        relay_off: "< 87.5%"
        hysteresis: "2.5%"
      - parameter: "Temperature"
        relay_on: "<= 16 C"
        relay_off: "> 17 C"
        hysteresis: "1 C"
    config_sources: ["LCD menu (joystick)", "Cloud dashboard"]
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
      - { address: "14-29", size: "16 bytes", data: "Device authentication key" }
      
  device_registration:
    flow:
      - "Boot: Check EEPROM for key"
      - "If no key: User enters 12-char secret via joystick virtual keyboard"
      - "Store key in EEPROM"
      - "POST /api/v1/device/register with MAC + firmware version"
      - "Backend validates key, links to owner, returns device_id"
      - "Subsequent requests: X-Device-ID + X-Device-Key headers"
    key_format: "XXXX-XXXX-XXXX (12 alphanumeric)"
    example: "A3F7-K9M2-P5X8"
    key_source: "Pre-generated by backend, provided during purchase"
    
  performance:
    system_uptime: "99%+"
    sensor_read_latency: "< 100 ms"
    json_serialization: "< 50 ms"
    http_post_latency: "500-2000 ms"
    menu_response_time: "200 ms"
    lcd_update_rate: "real-time"
    max_bag_sensors: "10+"
    wifi_reconnect_timeout: "60 seconds"
    
  limitations_current:
    - "Sync interval: 5 min (not real-time to cloud)"
    - "Relay control: local-only (no cloud control yet)"
    - "No offline buffering (data lost if WiFi down)"
    - "HTTP only (no HTTPS/TLS)"
    - "Single device per room"
    - "No IP filtering"
    
  roadmap:
    phase_1:
      - { feature: "30-second sync interval", priority: "high" }
      - { feature: "HTTPS (TLS encryption)", priority: "critical" }
      - { feature: "Remote relay control", priority: "high" }
      - { feature: "Push notifications", priority: "high" }
    phase_2:
      - { feature: "Offline data buffering", priority: "high" }
      - { feature: "MQTT protocol via RPi", priority: "medium" }
      - { feature: "Watchdog timer", priority: "medium" }
      - { feature: "FreeRTOS migration", priority: "low" }

================================================================================
DATABASE ARCHITECTURE
================================================================================

database:
  engine: "PostgreSQL"
  multitenancy:
    strategy: "Row-Level Security (RLS)"
    isolation: "single database, owner_id based"
    migration_decision_point: "Month 10"
    migration_trigger:
      - "Enterprise customers demand physical isolation"
      - "Query latency > 500ms p95"
      - "Backup/restore > 30 min"
      
  rls_implementation:
    enable: "ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"
    policy: |
      CREATE POLICY tenant_isolation ON {table}
        FOR ALL
        USING (owner_id = current_setting('app.current_owner_id')::INT);
    session_setup: "SET app.current_owner_id = {owner_id_from_jwt}"
    
  core_tables:
    - id: 1
      name: "owners"
      purpose: "Company/owner data"
      records: "10-100"
      columns_added: ["pincode", "gst_number"]
      
    - id: 2
      name: "users"
      purpose: "System users with roles"
      records: "50-1000"
      columns_added: ["login_attempts", "locked_until", "assigned_plants (JSON)"]
      
    - id: 3
      name: "plants"
      purpose: "Farm locations"
      records: "10-500"
      columns_added: ["plant_type (OYSTER/BUTTON/SHIITAKE/MIXED)"]
      
    - id: 4
      name: "rooms"
      purpose: "Growing rooms"
      records: "100-5000"
      columns_added: ["room_code", "no_of_racks", "no_of_bags", "bags_per_rack", "floor_number"]
      
    - id: 5
      name: "devices"
      purpose: "IoT devices (ESP32)"
      records: "100-10000"
      columns_added: ["hardware_version", "device_type", "registered_at"]
      
    - id: 6
      name: "thresholds"
      purpose: "Control thresholds per room"
      records: "1000-50000"
      
    - id: 7
      name: "room_readings"
      purpose: "Sensor data (time-series)"
      records: "millions"
      columns_added: ["outdoor_temp", "outdoor_humidity"]
      
    - id: 8
      name: "relay_status"
      purpose: "Relay state change history"
      records: "millions"
      
    - id: 9
      name: "alerts"
      purpose: "Threshold violation alerts"
      records: "10K-500K"
      
    - id: 10
      name: "reports"
      purpose: "Generated report metadata"
      records: "1K-50K"
      
    - id: 11
      name: "audit_log"
      purpose: "User action audit trail"
      records: "millions"
      
  hierarchy: |
    OWNER (Company)
      +-- USERS (Admin, Manager, Operator, Viewer)
      +-- PLANTS (Farm locations)
           +-- ROOMS (Growing rooms)
                +-- THRESHOLDS (1 set per room)
                +-- DEVICES (ESP32 controllers)
                     +-- ROOM_READINGS (sensor data)
                     +-- RELAY_STATUS (relay history)
                     +-- ALERTS (threshold violations)
                     
  user_roles:
    SUPER_ADMIN:
      plants: "all"
      rooms: "all"
      devices: "all"
      thresholds: "all"
      alerts: "all"
      users: "all"
      reports: "all"
      
    ADMIN:
      plants: "own"
      rooms: "own"
      devices: "own"
      thresholds: "CRUD"
      alerts: "CRUD"
      users: "CRUD"
      reports: "CRUD"
      
    MANAGER:
      plants: "assigned"
      rooms: "assigned"
      devices: "assigned"
      thresholds: "read/update"
      alerts: "read/ack"
      users: "read"
      reports: "generate"
      
    OPERATOR:
      plants: "assigned"
      rooms: "assigned"
      devices: "read"
      thresholds: "read"
      alerts: "read/ack"
      users: "none"
      reports: "read"
      
    VIEWER:
      plants: "assigned"
      rooms: "assigned"
      devices: "read"
      thresholds: "read"
      alerts: "read"
      users: "none"
      reports: "read"

================================================================================
SECURITY ARCHITECTURE
================================================================================

security:
  authentication:
    web_users:
      method: "JWT"
      token_types: ["access", "refresh"]
      access_ttl: "15 minutes"
      refresh_ttl: "7 days"
      storage: "httpOnly cookies"
      
    esp32_devices:
      method: "Secret Key + Device ID"
      headers: ["X-Device-ID", "X-Device-Key"]
      key_format: "12-char alphanumeric"
      storage: "EEPROM"
      
    websocket:
      method: "JWT in query param"
      url: "ws://api/ws?token={jwt}"
      validation: "on connection, reject if expired"
      
  authorization:
    rbac_matrix:
      SUPER_ADMIN: { plants: "all", rooms: "all", devices: "all", thresholds: "all", alerts: "all", users: "all", reports: "all" }
      ADMIN: { plants: "own", rooms: "own", devices: "own", thresholds: "CRUD", alerts: "CRUD", users: "CRUD", reports: "CRUD" }
      MANAGER: { plants: "assigned", rooms: "assigned", devices: "assigned", thresholds: "read/update", alerts: "read/ack", users: "read", reports: "generate" }
      OPERATOR: { plants: "assigned", rooms: "assigned", devices: "read", thresholds: "read", alerts: "read/ack", users: "none", reports: "read" }
      VIEWER: { plants: "assigned", rooms: "assigned", devices: "read", thresholds: "read", alerts: "read", users: "none", reports: "read" }
      
  tenant_isolation:
    method: "PostgreSQL RLS + owner_id filtering"
    implementation:
      - "RLS enabled on all tenant-scoped tables"
      - "app.current_owner_id set per request from JWT"
      - "WebSocket filtered by owner_id"
      - "Device readings validated against owner hierarchy"
      
  roadmap:
    phase_1:
      - { feature: "JWT authentication (web)", status: "to build" }
      - { feature: "Secret key auth (device)", status: "partial (firmware ready, backend pending)" }
      - { feature: "HTTPS / TLS", status: "to add (currently HTTP)" }
      - { feature: "CORS policy", status: "to configure" }
      - { feature: "Rate limiting (API)", status: "to add" }
      - { feature: "Input validation (Pydantic)", status: "built into FastAPI" }
      - { feature: "RLS (multi-tenancy)", status: "to configure" }
      - { feature: "Password hashing (bcrypt)", status: "to build" }
      - { feature: "Account lockout", status: "to build (fields ready)" }
    phase_2:
      - { feature: "HMAC request signing (device)", status: "planned" }
      - { feature: "IP allowlisting (device)", status: "planned" }
      - { feature: "Audit logging", status: "to build (table ready)" }

================================================================================
DEVELOPMENT PHASES
================================================================================

phases:
  - id: 1
    name: "Core IoT Monitoring"
    duration: "Months 1-7.5"
    goal: "One pilot farm live by Month 4. Full monitoring + alerting + relay control."
    deliverables:
      - "FastAPI backend with all CRUD endpoints"
      - "PostgreSQL database with 11 core tables + RLS"
      - "Redis integration for live sensor cache"
      - "WebSocket server for real-time dashboard"
      - "React dashboard: live readings, charts, alerts"
      - "React management: CRUD for all entities"
      - "Device API: readings, heartbeat, commands, register"
      - "ESP32 firmware: 30s sync + relay polling"
      - "HTTPS/TLS for all API communication"
      - "Demo simulator (Python ESP32 mimic)"
      - "Relay toggle: dashboard -> Redis -> ESP32 poll -> relay"
      - "Alert system: violation -> create -> WebSocket -> ack"
      - "Report generation (PDF/CSV)"
      - "JWT authentication"
      - "Device authentication via headers"
    milestone: "1 pilot farm live with real ESP32 by Month 4"
    buffer: "+1.5 months (25% for field debugging)"
    
  - id: 2
    name: "HVAC Automation + Mobile"
    duration: "Months 8-15"
    goal: "5 beta farms live by Month 11. Advanced automation and mobile."
    deliverables:
      - "Raspberry Pi Gateway: Docker Compose (PG + Redis + MQTT)"
      - "Offline buffering on RPi (weeks of storage)"
      - "MQTT protocol between ESP32 and RPi"
      - "Advanced automation rules (schedules, multi-sensor logic)"
      - "PWA mobile optimization"
      - "Push notifications (FCM)"
      - "SMS alerts (Twilio/MSG91)"
      - "TimescaleDB for time-series"
      - "User activity audit log"
      - "Data export (CSV, Excel)"
      - "Multi-device aggregation per room"
    milestone: "5 beta farms live by Month 11"
    buffer: "+1 month (hardware surprises)"
    
  - id: 3
    name: "ERP Modules"
    duration: "Months 16-22"
    goal: "20 paying farms by Month 22. Full ERP platform."
    deliverables:
      - "Batch/production tracking (lifecycle management)"
      - "Inventory management (substrate, spawn, packaging, chemicals)"
      - "Harvest recording and yield analytics"
      - "Contamination incident tracking and pattern analysis"
      - "Cost analysis and profitability per room/batch"
      - "Industry benchmarking (anonymous cross-farm)"
      - "AI/ML yield predictions"
      - "Billing and subscription management"
      - "Render Standard/Pro upgrade (auto-scaling)"
      - "Evaluate dedicated infrastructure (if >= 500 users or compliance)"
    milestone: "20 paying farms by Month 22"
    buffer: "+1 month (UAT, feedback)"

================================================================================
INFRASTRUCTURE & COSTS
================================================================================

infrastructure:
  phase_1_2:
    timeline: "Months 1-12"
    scale: "0-100 farms"
    services:
      - { name: "Web Service (FastAPI)", provider: "Render", plan: "Starter → Standard", cost_usd: "7-25", cost_inr: "600-2,100" }
      - { name: "PostgreSQL", provider: "Render", plan: "Starter (1GB) → Standard (10GB)", cost_usd: "7-20", cost_inr: "600-1,700" }
      - { name: "Redis", provider: "Render", plan: "Starter (25MB) → Standard (100MB)", cost_usd: "10-20", cost_inr: "850-1,700" }
      - { name: "Static Site (React)", provider: "Render", plan: "Free", cost_usd: "0", cost_inr: "0" }
      - { name: "Render Disk", provider: "Render", plan: "1GB → 10GB", cost_usd: "0-10", cost_inr: "0-850" }
    total_monthly: { usd: "24-75", inr: "2,000-6,300" }
    note: "Render Free tier available for dev (spins down after 15min)"
    
  phase_3:
    timeline: "Months 13-18"
    scale: "100-200 farms"
    services:
      - { name: "Web Service (FastAPI)", provider: "Render", plan: "Standard → Pro", cost_usd: "25-85", cost_inr: "2,100-7,200" }
      - { name: "PostgreSQL", provider: "Render", plan: "Standard (10GB) → Pro (50GB)", cost_usd: "20-50", cost_inr: "1,700-4,200" }
      - { name: "Redis", provider: "Render", plan: "Standard (100MB) → Pro (500MB)", cost_usd: "20-40", cost_inr: "1,700-3,400" }
      - { name: "Static Site (React)", provider: "Render", plan: "Free", cost_usd: "0", cost_inr: "0" }
      - { name: "Cloudflare R2 (backups)", provider: "Cloudflare", plan: "10GB free + $0.015/GB", cost_usd: "0-5", cost_inr: "0-400" }
    total_monthly: { usd: "65-180", inr: "5,500-15,200" }
    
  phase_4:
    timeline: "Month 19+"
    scale: "200+ farms"
    condition: "Move to AWS/GCP/Hetzner ONLY IF:"
    triggers:
      - "Render latency > 500ms p95"
      - ">= 500 concurrent WebSocket connections"
      - "Compliance requires VPC/private networking"
      - "Cost exceeds self-managed"
    estimated_cost: { self_managed_inr: "15-25K", aws_managed_inr: "35-60K" }
    
hardware_per_farm:
  components:
    - { item: "ESP32 module", cost_inr: 600 }
    - { item: "SCD4x CO2 sensor", cost_inr: 2500 }
    - { item: "DHT11", cost_inr: 250 }
    - { item: "DS18B20 x10", cost_inr: 1500 }
    - { item: "LCD 20x4", cost_inr: 400 }
    - { item: "3-Channel relay", cost_inr: 300 }
    - { item: "Joystick", cost_inr: 150 }
    - { item: "3D printed enclosure", cost_inr: 500 }
    - { item: "PCB + wiring", cost_inr: 500 }
  total_per_device: "~6,700 INR"
  per_room: "~6,700 INR (1 device/room)"
  
total_investment:
  categories:
    - { item: "Development (4 devs x 22 months)", amount_cr: "1.44-1.79" }
    - { item: "Infrastructure (22 months, Render)", amount_cr: "0.015-0.025" }
    - { item: "Contingency (20%)", amount_cr: "0.30-0.36" }
  total: { amount_cr: "1.76-2.18", recommended_funding: "2.50 Cr" }

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
    
  quantified_pain_points:
    - id: 1
      name: "Environmental Monitoring Gaps"
      affected: "73% of farms"
      symptoms: ["Manual checks 3-4x daily", "4-hour detection delay"]
      impact: "12-18% crop loss, 8K-12K per 100-bag batch"
      
    - id: 2
      name: "Contamination Crisis"
      rate: "40-60% batch infection"
      detection_delay: "7-10 days after infection"
      economic_impact: "1.2L-1.8L annual loss (10-room farm)"
      
    - id: 3
      name: "Operational Chaos"
      affected: "100% of multi-room farms"
      symptoms: ["Paper logs or Excel", "2-3 hours daily data entry", "15-20% inventory discrepancy"]
      cost: "15K monthly labor + 25K-40K inventory shrinkage"
      
    - id: 4
      name: "Scalability Bottleneck"
      ceiling: "20 rooms manually"
      result: "Growth-oriented farms hit ceiling at 2-3 Cr revenue"
      
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
      
  competitive_landscape:
    comparison:
      - feature: "Mushroom-Specific"
        generic_iot: false
        ag_platforms: false
        custom_dev: true
        our_platform: true
      - feature: "Time to Value"
        generic_iot: "3-6 months"
        ag_platforms: "N/A"
        custom_dev: "12-18 months"
        our_platform: "2-4 weeks"
      - feature: "Total Cost (Year 1)"
        generic_iot: "3-5L"
        ag_platforms: "4-12L"
        custom_dev: "15-25L"
        our_platform: "50K-2L"
      - feature: "Edge Computing"
        generic_iot: false
        ag_platforms: false
        custom_dev: true
        our_platform: true
      - feature: "Indian Market Fit"
        generic_iot: false
        ag_platforms: false
        custom_dev: true
        our_platform: true
      - feature: "Scalability"
        generic_iot: true
        ag_platforms: true
        custom_dev: "Limited"
        our_platform: true

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
    - metric: "Inventory Accuracy"
      before: "80-85%"
      after: ">95%"
      timeline: "Phase 3"
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
  master: "This Blueprint_DaC.md (converted from MUSHROOM_FARM_BLUEPRINT.md)"
  implementation_details: "SYSTEM_INTEGRATION_DOCUMENT.md"
  integration_contains:
    - "SQLAlchemy model definitions for all 11 tables"
    - "Complete API endpoint list with request/response formats"
    - "Redis key patterns and TTL values"
    - "Data flow diagrams with code examples"
    - "Frontend and backend implementation patterns"
    - "Verification checklist"

================================================================================
END OF DESIGN AS CODE SPECIFICATION
================================================================================
# DaC Version: 1.0.0
# Total Sections: 11
# Status: Production Ready
# Precision: Absolute
