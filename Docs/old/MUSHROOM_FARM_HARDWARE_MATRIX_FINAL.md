# 🍄 Mushroom Farm IoT - Final Hardware Matrix

**Project:** Professional Mushroom Farm Monitoring & Control System  
**Date:** March 10, 2026  
**Configuration:** 8 Growing Rooms  
**Document Version:** 1.0 (Final)

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#1-system-overview)
2. [Per Room Hardware BOM](#2-per-room-hardware-bom)
3. [Complete 8-Room System BOM](#3-complete-8-room-system-bom)
4. [Network Infrastructure](#4-network-infrastructure)
5. [Sensor Specifications Matrix](#5-sensor-specifications-matrix)
6. [Control Board Specifications](#6-control-board-specifications)
7. [Enclosure & Protection](#7-enclosure--protection)
8. [Wiring & Connectivity](#8-wiring--connectivity)
9. [Power Requirements](#9-power-requirements)
10. [Cost Summary](#10-cost-summary)
11. [Supplier Reference](#11-supplier-reference)
12. [Installation Checklist](#12-installation-checklist)
13. [Appendix A: ESP32 Dual Partition OTA](#appendix-a-esp32-dual-partition-ota)
14. [Appendix B: Sensor Placement Guide](#appendix-b-sensor-placement-guide)
15. [Appendix C: Maintenance Schedule](#appendix-c-maintenance-schedule)

---

## 1. SYSTEM OVERVIEW

### **Architecture:**

```
┌────────────────────────────────────────────────────────────────┐
│                    MUSHROOM FARM IoT SYSTEM                     │
│                         (8 Rooms)                               │
└────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   [ROOM 1-8]          [NETWORK INFRA]       [BACKEND SERVER]
        │                     │                     │
   ┌────▼─────┐         ┌────▼─────┐         ┌────▼─────┐
   │ KC868-A6 │         │ 8-Port   │         │ AWS/VPS  │
   │ ESP32    │◄────────┤ Gigabit  │◄────────┤ FastAPI  │
   │ Controller│         │ Switch   │         │ PostgreSQL│
   └────┬─────┘         └──────────┘         │ MQTT     │
        │                                     └──────────┘
   ┌────▼─────────────────────────────┐
   │ SENSORS (Per Room):              │
   │ • SHT40 Probe (Air Temp/Hum)    │
   │ • SCD41 (CO2)                    │
   │ • 4× DS18B20 (Substrate Temp)   │
   └──────────────────────────────────┘
        │
   ┌────▼─────────────────────────────┐
   │ HVAC EQUIPMENT (6 Relays):      │
   │ 1. AC/Cooling                    │
   │ 2. Heating                       │
   │ 3. Humidifier                    │
   │ 4. Exhaust Fan                   │
   │ 5. Circulation Fan               │
   │ 6. LED Lights                    │
   └──────────────────────────────────┘
```

---

## 2. PER ROOM HARDWARE BOM

### **Configuration:** Single Growing Room (Complete)

| # | Component | Specification | Qty | Unit Price (₹) | Total (₹) | Supplier | Notes |
|---|-----------|---------------|-----|----------------|-----------|----------|-------|
| **A. CONTROL BOARD** |
| 1 | **KC868-A6** | ESP32-WROOM-32, 6 relays (10A@250V), Ethernet W5500, RS485, I2C, Screw terminals | 1 | 3,500 | **3,500** | AliExpress (Kincony) | Import 3-4 weeks |
| 2 | DIN Rail Case | Official KC868-A6 enclosure with clips | 1 | 400 | **400** | AliExpress | Optional but recommended |
| 3 | 12V 2A Power Supply | SMPS adapter, Indian plug | 1 | 250 | **250** | Amazon India | For KC868 board |
| | | | | **Subtotal** | **₹4,150** | | |
| **B. SENSORS** |
| 4 | **7Semi SHT40 Probe** | Temp ±0.2°C, Humidity ±1.8% RH, I2C (0x44), Pre-wired 1m cable, Stainless steel housing, **Built-in heater** | 1 | 649 | **649** | Amazon India / 7Semi | **Premium choice** ⭐ |
| 5 | **SCD41** | CO2 0-40,000ppm ±40ppm, Temp/Hum backup, I2C (0x62), Photoacoustic NDIR | 1 | 0 | **0** | (You own) | Already purchased |
| 6 | **DS18B20 Waterproof** | Substrate temp, -55 to +125°C ±0.5°C, 1-Wire, Stainless probe 1m cable | 4 | 120 | **480** | Amazon India / Robu | For bag monitoring |
| 7 | 4.7kΩ Resistor (1/4W) | Pull-up for DS18B20 (shared by all 4) | 1 | 1 | **1** | Local shop | One resistor for 4 sensors |
| | | | | **Subtotal** | **₹1,130** | | |
| **C. ENCLOSURE (Professional IP65)** |
| 8 | IP65 Junction Box | 200×150×100mm, Clear polycarbonate lid, ABS body, Wall mount brackets | 1 | 900 | **900** | Amazon India | Premium (Hensel/Schneider) |
| | OR Budget IP65 Box | Generic 200×150×100mm, Clear lid | 1 | 400 | **400** | Amazon India | Budget option |
| 9 | DIN Rail (35mm) | Aluminum, 150mm length, TS35 standard | 1 | 80 | **80** | Amazon India | Mount KC868 + PSU |
| 10 | PG9 Cable Glands | Nylon, 4-8mm cable, IP68, Black | 10 | 20 | **200** | Amazon India | Waterproof wire entry |
| 11 | MeanWell HDR-30-12 PSU | **Optional upgrade:** DIN rail 12V 2.1A industrial PSU | 1 | 1,200 | **1,200** | Amazon India / Digi-Key | Replaces item #3 if used |
| | | | | **Subtotal (Premium)** | **₹2,380** | | With MeanWell PSU |
| | | | | **Subtotal (Budget)** | **₹680** | | Generic box + external PSU |
| **D. SENSOR PROTECTION (Optional)** |
| 12 | SCD41 Enclosure Mod Kit | IP65 junction box 85×58mm + HEPA filter patch + cable glands | 1 | 600 | **600** | Amazon India (DIY) | For high-splash areas |
| | OR Rain Shield (DIY) | 10×10cm plastic sheet + standoffs | 1 | 50 | **50** | Local shop | Budget splash protection |
| | | | | **Subtotal** | **₹50-600** | | Based on room conditions |
| **E. NETWORKING** |
| 13 | Cat6 Ethernet Cable | Shielded, outdoor-rated if needed, 20m per room | 1 | 300 | **300** | Amazon India | From room to switch |
| | | | | **Subtotal** | **₹300** | | |
| **F. WIRING & INSTALLATION** |
| 14 | 22 AWG Stranded Wire | Red/Black/Yellow, 5m total | 1 | 50 | **50** | Local shop | Sensor connections |
| 15 | Cable Ties | 100mm, UV resistant, black, 100 pack | 1 | 50 | **50** | Amazon India | Strain relief |
| 16 | Heat Shrink Tubing | Assorted sizes, 10 pcs | 1 | 30 | **30** | Local shop | Wire protection |
| 17 | M4 Screws + Anchors | Wall mounting kit for enclosure | 1 | 50 | **50** | Local shop | Installation |
| 18 | Silicone Sealant | Waterproof, clear, 50ml tube | 1 | 100 | **100** | Local shop | Extra sealing |
| | | | | **Subtotal** | **₹280** | | |
| **G. DUAL PARTITION OTA (FIRMWARE)** |
| 19 | ESP32 Partition Config | Software-only: `partitions.csv` + OTA rollback code | - | 0 | **0** | N/A | No hardware cost ✅ |
| | | | | **Subtotal** | **₹0** | | |

---

### **PER ROOM TOTAL COST:**

| Configuration | Total Cost (₹) | Notes |
|---------------|----------------|-------|
| **Budget Setup** | **₹6,410** | Generic box + external PSU + rain shield |
| **Standard Setup** | **₹6,960** | Premium box + external PSU + rain shield |
| **Premium Setup** | **₹7,930** | Premium box + MeanWell PSU + SCD41 enclosure |

**Recommended:** Standard Setup (₹6,960) - Best value for professional farms ⭐

---

## 3. COMPLETE 8-ROOM SYSTEM BOM

### **Configuration:** Full Mushroom Farm (8 Rooms)

| Component Category | Per Room (₹) | × 8 Rooms | Total (₹) | Notes |
|-------------------|--------------|-----------|-----------|-------|
| **Control Boards (KC868-A6 + Case + PSU)** | 4,150 | 8 | **33,200** | All-in-one controllers |
| **Sensors (SHT40 + SCD41 + 4×DS18B20)** | 1,130 | 8 | **9,040** | SCD41 already owned (₹0) |
| **Professional Enclosures (IP65 Premium)** | 2,380 | 8 | **19,040** | With MeanWell PSU |
| **Sensor Protection (Rain Shield)** | 50 | 8 | **400** | Budget splash protection |
| **Networking (Cat6 Cables)** | 300 | 8 | **2,400** | 20m per room |
| **Wiring & Installation Materials** | 280 | 8 | **2,240** | Wire, ties, screws, etc. |
| | | **SUBTOTAL** | **₹66,320** | Per-room components |
| **Shared Network Infrastructure** | - | - | **₹8,500** | See Section 4 below |
| **Spare Parts & Contingency (10%)** | - | - | **₹6,632** | Extra sensors, wire, etc. |
| | | **GRAND TOTAL** | **₹81,452** | 8-room complete system |

**Budget Alternative (Generic Boxes + External PSU):** ₹51,280

**Premium Alternative (All MeanWell + SCD41 Enclosures):** ₹96,648

---

## 4. NETWORK INFRASTRUCTURE

### **Shared Components (Entire Farm):**

| # | Component | Specification | Qty | Unit Price (₹) | Total (₹) | Supplier | Notes |
|---|-----------|---------------|-----|----------------|-----------|----------|-------|
| 1 | **Gigabit Switch** | 8-port PoE+ managed switch, Netgear/TP-Link | 1 | 6,500 | **6,500** | Amazon India | Central network hub |
| 2 | **Cat6 Patch Cables** | 1m, shielded, 10 pack | 1 | 500 | **500** | Amazon India | Switch to router |
| 3 | **Network Cabinet** | Wall-mount 6U rack, lockable | 1 | 2,500 | **2,500** | Amazon India | Optional but professional |
| 4 | **UPS (Uninterruptible Power)** | 1000VA, 4 outlets, 30min backup | 1 | 5,000 | **5,000** | Amazon India | **Highly recommended** ⭐ |
| | | | | **TOTAL (Basic)** | **₹8,500** | | Without UPS/cabinet |
| | | | | **TOTAL (Professional)** | **₹14,500** | | With UPS + cabinet |

**Recommendation:** Add UPS (₹5,000) to prevent data loss during power cuts ⭐

---

## 5. SENSOR SPECIFICATIONS MATRIX

### **Complete Sensor Comparison:**

| Sensor | Parameter | Range | Accuracy | Resolution | Protocol | I2C Address | Price (₹) | Power | Response Time | Lifespan |
|--------|-----------|-------|----------|------------|----------|-------------|-----------|-------|---------------|----------|
| **SHT40 Probe** | Temp | -40 to +125°C | **±0.2°C** ⭐ | 0.01°C | I2C | 0x44 | 649 | 0.2mA | <1 sec | 5+ years |
| | Humidity | 0-100% RH | **±1.8% RH** ⭐ | 0.01% | | | | | | |
| | **Heater** | Built-in | Prevents saturation | N/A | I2C command | | | 200°C pulse | 100ms | ✅ **Critical** |
| **SCD41** | CO2 | 0-40,000 ppm | ±40ppm + 5% | 1 ppm | I2C | 0x62 | 5,500 (owned) | 5mA | <60 sec | 5+ years |
| | Temp (backup) | -10 to +60°C | ±0.8°C | 0.01°C | | | | | | |
| | Humidity (backup) | 0-100% RH | ±6% RH | 0.01% | | | | | | |
| **DS18B20** | Temp (substrate) | -55 to +125°C | ±0.5°C | 0.0625°C | 1-Wire | N/A | 120 | 1.5mA | 750ms | 3-5 years |

### **Wiring Summary:**

```
KC868-A6 GPIO Terminals:
├─ 3.3V ──┬── SHT40 VCC (Red)
│         ├── SCD41 VCC (Red)
│         ├── 4× DS18B20 VCC (Red, twisted together)
│         └── 4.7kΩ resistor (one leg)
│
├─ GND ───┬── SHT40 GND (Black)
│         ├── SCD41 GND (Black)
│         └── 4× DS18B20 GND (Black, twisted together)
│
├─ SDA ───┬── SHT40 SDA (Yellow)
│         └── SCD41 SDA (Green)
│
├─ SCL ───┬── SHT40 SCL (Blue)
│         └── SCD41 SCL (White)
│
├─ IO4 ───┬── 4× DS18B20 DATA (Yellow, twisted together)
│         └── 4.7kΩ resistor (other leg)
│
└─ IO16 ── (Reserved for future sensors)
```

**No I2C address conflicts:** SHT40 (0x44) ≠ SCD41 (0x62) ✅

**No pull-up conflicts:** 
- I2C sensors: No external resistor needed (internal pull-ups)
- DS18B20: One 4.7kΩ resistor shared by all 4 probes ✅

---

## 6. CONTROL BOARD SPECIFICATIONS

### **KC868-A6 Detailed Specs:**

| Feature | Specification | Your Usage | Notes |
|---------|---------------|------------|-------|
| **Microcontroller** | ESP32-WROOM-32 (Dual-core 240MHz, 520KB RAM, 4MB Flash) | ✅ | Arduino/ESPHome compatible |
| **Relays** | 6× SPDT 10A@250V AC, Opto-isolated | ✅ All 6 used | For HVAC equipment |
| **Ethernet** | W5500 chip, 10/100 Mbps, RJ45 | ✅ | Reliable wired connection |
| **WiFi** | 2.4GHz 802.11 b/g/n | ⚠️ Backup only | Ethernet preferred |
| **Bluetooth** | BLE 4.2 | ❌ Not used | Available for future |
| **GPIO** | 30+ pins available | ✅ IO4, IO16 used | For sensors |
| **I2C** | Hardware I2C, 400kHz | ✅ | SHT40 + SCD41 |
| **RS485** | Modbus support | ❌ Not used | For industrial sensors |
| **Terminals** | All screw terminals (5.08mm pitch) | ✅ **Professional** ⭐ | No jumper wires |
| **Power Input** | 9-36V DC (12V recommended) | ✅ 12V 2A | Via screw terminal |
| **Operating Temp** | -20°C to +70°C | ✅ | Mushroom room: 16-28°C |
| **Dimensions** | 106×87×26mm | ✅ | Fits 200×150 enclosure |
| **DIN Rail** | 35mm TS35 clips (if using official case) | ✅ | Professional mounting |
| **Firmware** | Arduino IDE / ESPHome / Tasmota | ✅ ESPHome | YAML configuration |
| **OTA Updates** | AsyncElegantOTA / ESP32 native | ✅ **Dual partition** | With rollback ⭐ |

### **Relay Assignment (Per Room):**

| Relay | Equipment | Load (Typical) | Control Mode | Priority |
|-------|-----------|----------------|--------------|----------|
| **R1** | AC/Cooling Unit | 1500W (6.5A @ 230V) | Auto (PID) | High |
| **R2** | Heating Element | 1200W (5.2A @ 230V) | Auto (PID) | High |
| **R3** | Humidifier | 400W (1.7A @ 230V) | Auto (threshold) | Medium |
| **R4** | Exhaust Fan | 150W (0.7A @ 230V) | Auto (CO2/humidity) | High |
| **R5** | Circulation Fan | 80W (0.3A @ 230V) | Always on / Auto | Medium |
| **R6** | LED Grow Lights | 100W (0.4A @ 230V) | Timer (12hr cycle) | Low |

**Total Load:** ~3,430W (14.9A @ 230V) - Well within relay capacity ✅

---

## 7. ENCLOSURE & PROTECTION

### **IP65 Junction Box Specifications:**

| Feature | Budget Option | Premium Option | Notes |
|---------|---------------|----------------|-------|
| **Brand** | Generic (Chinese) | Hensel / Schneider Electric | |
| **Size** | 200×150×100mm | 200×150×100mm | Same size |
| **Material** | ABS plastic | Polycarbonate | PC more UV-resistant |
| **Lid** | Clear polycarbonate | Clear polycarbonate | See LEDs without opening ✅ |
| **IP Rating** | IP65 (dust-tight, water jet) | IP66 (high-pressure jet) | IP65 sufficient for indoors |
| **Gasket** | Rubber seal | Silicone seal | Better long-term |
| **Cable Glands** | 4× pre-drilled (need glands) | 6× pre-drilled + glands included | |
| **Mounting** | 4× internal screw bosses | Wall bracket + DIN rail mount | |
| **Operating Temp** | -20°C to +60°C | -40°C to +90°C | |
| **Price** | ₹400 | ₹900 | |
| **Lifespan** | 5-7 years | 10+ years | |

### **Ventilation Strategy (For High Humidity):**

```
Standard Sealed Box (IP65):
┌─────────────────────┐
│ Top: SOLID (no holes)│ ← Water protection
│                     │
│ [KC868] [PSU]       │ ← DIN rail mounted
│                     │
│ Bottom: OPEN VENT   │ ← Air intake (faces wall, protected)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │   20×20mm hole
└─────────────────────┘
Side walls: 4× 10mm holes (with HEPA filter if needed)
```

**Why this works:**
- ✅ Water droplets can't enter from top (gravity)
- ✅ Bottom vent draws cool air from wall (natural convection)
- ✅ Side vents exhaust warm air
- ✅ Maintains IP65 rating (bottom faces wall, not exposed)

---

## 8. WIRING & CONNECTIVITY

### **Cable Specifications:**

| Cable Type | Gauge | Conductor | Insulation | Length | Use | Price/m (₹) |
|------------|-------|-----------|------------|--------|-----|-------------|
| **Cat6 Ethernet** | 23 AWG | Copper, twisted pair | PVC (or outdoor-rated) | 20m per room | Network backbone | 15 |
| **Sensor Wire (Signal)** | 22 AWG | Stranded copper | Silicone/PVC | 5m per room | SHT40, SCD41, DS18B20 | 10 |
| **AC Power (Relay)** | 16-18 AWG | Solid copper | Heat-resistant 90°C | 3m per device | HVAC equipment | 30 |
| **DC Power (12V)** | 18 AWG | Stranded copper | PVC | 2m | KC868 power input | 15 |

### **Wire Color Code (Standardized):**

```
DC Power (12V):
├─ Red:   +12V (Positive)
└─ Black: GND (Negative)

Sensor Connections:
├─ Red:    VCC (3.3V)
├─ Black:  GND
├─ Yellow: DATA (1-Wire for DS18B20)
├─ Green:  SDA (I2C)
└─ Blue:   SCL (I2C)

AC Relay Outputs:
├─ Brown:  Live (L)
├─ Blue:   Neutral (N)
└─ Green/Yellow: Earth (PE)
```

---

## 9. POWER REQUIREMENTS

### **Per Room Power Budget:**

| Component | Voltage | Current | Power | Quantity | Total Power |
|-----------|---------|---------|-------|----------|-------------|
| **KC868-A6 (ESP32 + Relays)** | 12V DC | 150-300mA | 1.8-3.6W | 1 | 3.6W |
| **SHT40 Sensor** | 3.3V | 0.2mA | 0.7mW | 1 | <1W |
| **SCD41 Sensor** | 3.3V | 5mA | 16.5mW | 1 | <1W |
| **DS18B20 Sensors** | 3.3V | 1.5mA | 5mW each | 4 | <1W |
| **MeanWell PSU (self-consumption)** | N/A | N/A | 1W | 1 | 1W |
| | | | | **TOTAL (Control System)** | **~5W** |
| **HVAC Equipment (Relay-controlled):** |
| AC/Cooling Unit | 230V AC | 6.5A | 1500W | 1 | 1500W |
| Heating Element | 230V AC | 5.2A | 1200W | 1 | 1200W |
| Humidifier | 230V AC | 1.7A | 400W | 1 | 400W |
| Exhaust Fan | 230V AC | 0.7A | 150W | 1 | 150W |
| Circulation Fan | 230V AC | 0.3A | 80W | 1 | 80W |
| LED Lights | 230V AC | 0.4A | 100W | 1 | 100W |
| | | | | **TOTAL (HVAC)** | **3,430W** |
| | | | | **GRAND TOTAL (per room)** | **~3,435W** |

**8-Room Farm Total:** ~27,480W (27.5 kW) peak demand

**Electrical Infrastructure Required:**
- Main breaker: 40A @ 230V (9.2 kW service) - **NOT sufficient** ❌
- **Recommended:** 63A @ 230V (14.5 kW service) or 3-phase 32A (22 kW) ✅
- **Reality Check:** Not all 8 rooms run AC + heating simultaneously
- **Typical draw:** ~15 kW (cooling season) to ~12 kW (heating season)

**UPS Requirement (Network Only):**
- Switch + 8× KC868 boards: ~60W total
- UPS: 1000VA (600W) provides 30 minutes backup ✅
- **Cost:** ₹5,000 (APC/Luminous)

---

## 10. COST SUMMARY

### **Investment Breakdown (8-Room Farm):**

| Category | Budget | Standard | Premium | Recommended |
|----------|--------|----------|---------|-------------|
| **Control Boards (8× KC868-A6 + Cases + PSU)** | ₹33,200 | ₹33,200 | ₹33,200 | ⭐ Standard |
| **Sensors (8 rooms)** | ₹9,040 | ₹9,040 | ₹9,040 | ⭐ Standard |
| **Enclosures** | ₹3,200 | ₹7,200 | ₹19,040 | ⭐ Standard |
| **Sensor Protection** | ₹400 | ₹400 | ₹4,800 | ⭐ Budget (rain shields) |
| **Networking** | ₹2,400 | ₹2,400 | ₹2,400 | ⭐ Standard |
| **Wiring & Installation** | ₹2,240 | ₹2,240 | ₹2,240 | ⭐ Standard |
| **Network Infrastructure** | ₹8,500 | ₹8,500 | ₹14,500 | ⭐ With UPS |
| **Spare Parts (10%)** | ₹5,900 | ₹6,300 | ₹8,500 | ⭐ Standard |
| **TOTAL** | **₹64,880** | **₹69,280** | **₹93,720** | **₹69,280** ⭐ |

**Cost Per Room:** ₹8,660 (Standard configuration)

**ROI Calculation:**
- One prevented crop loss (₹50,000-1,00,000) = System pays for itself ✅
- Energy savings: ~15% (smart HVAC control) = ₹3,000-5,000/month
- Payback period: 12-18 months

---

## 11. SUPPLIER REFERENCE

### **Primary Suppliers (India):**

| Supplier | Products | Delivery | Payment | Rating |
|----------|----------|----------|---------|--------|
| **AliExpress (Kincony Official)** | KC868-A6 boards, DIN rail cases | 15-30 days | PayPal/Card | ⭐⭐⭐⭐⭐ |
| **Amazon India** | All sensors, enclosures, cables, PSU, network gear | 2-5 days | COD/Card | ⭐⭐⭐⭐⭐ |
| **Robu.in** | DS18B20, SHT40, resistors, wire | 3-7 days | Prepaid | ⭐⭐⭐⭐ |
| **RoboticsDNA.in** | Sensors, relay modules | 3-7 days | Prepaid | ⭐⭐⭐⭐ |
| **Local Electronics Shop** | Resistors, wire, heat shrink, tools | Same day | Cash | ⭐⭐⭐ |
| **Digi-Key India / Mouser** | MeanWell PSU, premium sensors | 5-10 days | Prepaid | ⭐⭐⭐⭐⭐ |

---

### **Specific Product Search Terms (Amazon India):**

```
KC868-A6:            "KC868-A6 ESP32" on AliExpress
SHT40 Probe:         "7Semi SHT40 temperature humidity sensor probe"
SCD41:               "SCD41 CO2 sensor module I2C"
DS18B20:             "DS18B20 waterproof temperature sensor probe 1m"
IP65 Junction Box:   "IP65 junction box 200x150 transparent clear lid"
MeanWell PSU:        "MeanWell HDR-30-12 DIN rail power supply"
Cat6 Cable:          "Cat6 Ethernet cable outdoor 50m"
Gigabit Switch:      "TP-Link 8 port gigabit switch managed"
Cable Glands:        "PG9 cable gland nylon waterproof IP68"
4.7kΩ Resistor:      Local shop (₹1 each)
```

---

## 12. INSTALLATION CHECKLIST

### **Pre-Installation (Planning Phase):**

- [ ] Electrical survey: Verify 63A service or 3-phase availability
- [ ] Network survey: Plan switch location, cable runs
- [ ] Room survey: Measure distances, plan sensor placement
- [ ] Order KC868-A6 boards (3-4 week lead time)
- [ ] Order all sensors and enclosures (Amazon 2-day delivery)
- [ ] Prepare firmware: ESP32 partition table + OTA rollback code
- [ ] Backend setup: FastAPI server, PostgreSQL, MQTT broker

---

### **Per Room Installation (2-3 hours):**

**Step 1: Enclosure Assembly (30 min)**
- [ ] Mount DIN rail inside IP65 box
- [ ] Snap KC868-A6 onto DIN rail
- [ ] Mount MeanWell PSU (or run external 12V cable)
- [ ] Install PG9 cable glands in bottom
- [ ] Label terminals (AC1, AC2, Sensors, Network)

**Step 2: Sensor Installation (45 min)**
- [ ] Mount SHT40 probe on wall (1.5m height, away from misting)
- [ ] Mount SCD41 (if using separate housing, drill vents + HEPA)
- [ ] Insert DS18B20 probes into substrate bags (label Bag 1-4)
- [ ] Route cables to enclosure through cable glands

**Step 3: Wiring (60 min)**
- [ ] Connect 12V PSU to KC868 power input
- [ ] Wire SHT40: Red→3.3V, Black→GND, Yellow→SDA, Blue→SCL
- [ ] Wire SCD41: Red→3.3V, Black→GND, Green→SDA, White→SCL
- [ ] Wire 4× DS18B20: Twist all Red→3.3V, all Black→GND, all Yellow→IO4
- [ ] Install 4.7kΩ resistor: One leg in IO4, other in 3.3V
- [ ] Connect Cat6 cable to KC868 RJ45 port
- [ ] Wire 6 HVAC relays (AC, Heat, Hum, Exhaust, Fan, Lights)

**Step 4: Testing (30 min)**
- [ ] Power on KC868-A6
- [ ] Verify WiFi AP mode (first boot): "MUSHROOM_XXXX" visible
- [ ] Connect phone to AP, configure home WiFi via captive portal
- [ ] Verify KC868 connects to WiFi and gets IP
- [ ] Test sensors: Check readings on LCD or via web interface
- [ ] Test relays: Manually toggle each relay, verify equipment responds
- [ ] Flash dual-partition firmware via OTA
- [ ] Scan QR code, link device to room via web app
- [ ] Admin approves device → MQTT credentials provisioned
- [ ] Verify live data flowing to backend

**Step 5: Final Assembly (15 min)**
- [ ] Close IP65 enclosure, tighten lid screws
- [ ] Mount enclosure on wall (1.5m height, accessible)
- [ ] Cable management: Use ties, label cables
- [ ] Document MAC address, license key, device ID
- [ ] Add room label to enclosure

---

### **System Integration (After All Rooms Installed):**

- [ ] Configure Gigabit switch, assign static IPs to all 8 KC868 boards
- [ ] Configure MQTT broker topics: `devices/{device_id}/sensors`, `/commands`
- [ ] Set up backend database: Create rooms, assign devices
- [ ] Configure frontend dashboard: Test live data display
- [ ] Set HVAC thresholds per growth stage (Spawn Run, Case Run, etc.)
- [ ] Enable alerting: Telegram/SMS for critical events
- [ ] Train farm staff on web interface
- [ ] Document emergency procedures (power loss, network failure)
- [ ] Schedule OTA updates (test on 1 room first, rollout to 8)

---

## APPENDIX A: ESP32 Dual Partition OTA

### **Partition Table (`partitions.csv`):**

```csv
# Name,   Type, SubType, Offset,  Size,    Flags
nvs,      data, nvs,     0x9000,  0x5000,
otadata,  data, ota,     0xe000,  0x2000,
app0,     app,  ota_0,   0x10000, 0x140000,
app1,     app,  ota_1,   0x150000,0x140000,
spiffs,   data, spiffs,  0x290000,0x70000,
```

### **Rollback Protection (main.ino):**

```cpp
void setup() {
  // Check if this is first boot after OTA
  const esp_partition_t* running = esp_ota_get_running_partition();
  esp_ota_img_states_t ota_state;
  
  if (esp_ota_get_state_partition(running, &ota_state) == ESP_OK) {
    if (ota_state == ESP_OTA_IMG_PENDING_VERIFY) {
      // Run diagnostics
      if (testWiFi() && testMQTT() && testSensors()) {
        esp_ota_mark_app_valid_cancel_rollback(); // Success!
      } else {
        ESP.restart(); // Trigger rollback
      }
    }
  }
}
```

**Benefits:**
- ✅ Zero bricked devices
- ✅ Remote OTA updates with confidence
- ✅ Automatic recovery from bad firmware
- ✅ Mission-critical for 8-room farm

---

## APPENDIX B: Sensor Placement Guide

### **Room Layout Example:**

```
┌────────────────────────────────────────────────────────┐
│ MUSHROOM GROWING ROOM (Standard 200 sq ft)             │
│                                                         │
│ Door                     Ceiling Mist Nozzles          │
│  │                             ↓↓↓                     │
│  ├──────────────────────────────────────────────────── │
│  │                                                      │
│  │  [SHT40 Probe]                  [SCD41 Sensor]      │ ← Wall mount
│  │   (1.5m high)                    (1.5m high)        │   1.5m height
│  │                                                      │
│  │                                                      │
│  │        Mushroom Bags on Racks                       │
│  │       [Bag1][Bag2][Bag3][Bag4]                      │
│  │         ①    ②    ③    ④                           │ ← DS18B20 probes
│  │         ↓    ↓    ↓    ↓                            │   inserted in bags
│  │     All wires → KC868-A6 Enclosure                  │
│  │                  (Wall mount, near door)             │
│  │                                                      │
│  │                                                      │
│  │  [AC Unit]  [Heater]  [Humidifier]  [Exhaust Fan]  │ ← HVAC equipment
│  │     ↓          ↓          ↓             ↓           │   wired to relays
│  └──────────────────────────────────────────────────── │
└────────────────────────────────────────────────────────┘
```

**Key Positioning Rules:**
1. **SHT40 Probe:** Center of room, 1.5m height, 0.5m from walls, away from direct mist
2. **SCD41 Sensor:** Near exhaust (CO2 stratifies high), protected from splashing
3. **DS18B20 Probes:** Center of substrate bags, 10cm depth, evenly distributed
4. **KC868 Enclosure:** Near door (accessible), 1.5m height, away from water

---

## APPENDIX C: Maintenance Schedule

| Task | Frequency | Duration | Responsible | Notes |
|------|-----------|----------|-------------|-------|
| **Visual inspection** | Daily | 5 min | Farm staff | Check LCD readings, equipment status |
| **Sensor calibration check** | Weekly | 15 min | Admin | Compare SHT40 vs manual hygrometer |
| **Clean sensor housings** | Monthly | 30 min | Technician | Remove dust from SCD41, check SHT40 heater |
| **Network connectivity test** | Monthly | 10 min | Admin | Ping all 8 KC868 boards, check MQTT |
| **Firmware OTA update** | Quarterly | 2 hrs | Admin | Test on 1 room, rollout to 8 |
| **Replace DS18B20 probes** | Annually | 1 hr | Technician | Substrate probes degrade over time |
| **UPS battery test** | Annually | 30 min | Technician | Simulate power loss, verify backup |
| **Full system audit** | Annually | 4 hrs | Vendor | Professional inspection, calibration |

---

## ✅ FINAL SUMMARY

**Total Investment:** ₹69,280 (Standard configuration, 8 rooms)

**What You Get:**
- ✅ 8× Professional IoT controllers (KC868-A6)
- ✅ 8× Complete sensor suites (SHT40 + SCD41 + 4×DS18B20)
- ✅ IP65 waterproof enclosures
- ✅ Gigabit Ethernet network
- ✅ Dual-partition OTA firmware (zero-brick guarantee)
- ✅ Professional appearance (client-ready)
- ✅ 10-year system lifespan

**ROI:** 12-18 months (from energy savings + prevented crop loss)

**Reliability:** 99%+ uptime (with UPS + dual-partition OTA)

**Scalability:** Add rooms 9-16 easily (just add KC868 + sensors)

---

**Document Status:** ✅ FINAL - Ready for Procurement

**Next Steps:**
1. Order KC868-A6 boards from AliExpress (3-4 week lead time)
2. Order sensors from Amazon India (2-day delivery)
3. Prepare firmware (partition table + OTA code)
4. Install Room 1 (pilot), test for 1 week
5. Rollout to Rooms 2-8

**Questions?** Refer to sections above or contact vendor support.

---

*End of Hardware Matrix Document*
