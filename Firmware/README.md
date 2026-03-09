# Mushroom Farming IoT Project

The Mushroom Farming IoT Project is an automated system that controls temperature, humidity, and CO2 levels in mushroom farms. It allows users to monitor and control their farms remotely using mobile devices and web portals. The project aims to optimize growth conditions, minimize crop losses caused by human error, and address agricultural challenges.

## Hardware Requirements

- Microcontroller: ESP32 WROOM
- CO2 Sensor: SCD41
- Bag Sensor: DS18B20 Temperature Sensor (2 buses)
- Outside Room Monitoring: DHT11 Sensor
- Wi-Fi Connection
- DC (5V, 2A) Adapter or AC Supply

**Note**: For setup inside rooms, it is crucial to heat seal the wiring to prevent any shorting due to high moisture. Please ensure proper heat sealing to maintain the integrity of the system.

## Software Dependencies

No software or libraries are required for operating the PCB. For software maintenance, you will need:

- Arduino IDE
- ESP32 boards installed in Arduino IDE

## Installation and Setup

1. Install the Arduino IDE.
2. Install the ESP32 boards in the Arduino IDE.
3. Copy the libraries available in the `/libs` directory of this repository to your `/Documents/Arduino/Libraries/` folder.
4. Connect the sensors to the correct ports as mentioned on the PCB.
5. Ensure the wiring inside the rooms is heat-sealed to prevent shorting due to high moisture.
6. Connect your computer to a Wi-Fi network.
7. You are now ready to begin the development process.

#### To upload code wirelessly:

1. Make sure the device is online.
2. Export a compiled binary file by going to `Tools > Get Compiled Binary`. This will export the compiled binary to your code directory.
3. Ping the IP address of your ESP32 (shown on the LCD screen when the device connects to the internet) in your browser.
4. If it displays a "Hello" message, you are good to go.
5. Next, ping the following URL: `yourIP/update`, for example, `192.168.0.178/update`.
6. A page will open from where you can remotely upload your bin file.

## Backend API

The firmware communicates with a FastAPI backend server (default: `http://localhost:3800/api/v1`). The API base URL is configured in `configuration.h`.

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/device/register` | POST | One-time device registration (MAC, firmware version, secret key) |
| `/device/readings` | POST | Unified sensor data upload (all sensors in one payload) |
| `/device/heartbeat` | POST | Device health report (IP, RSSI, free heap, uptime) |
| `/device/{id}/commands` | GET | Poll for relay commands from the server |

### Unified Sensor Payload

The device sends all sensor data in a single JSON POST every **30 seconds**:

```json
{
  "co2_ppm": 1250,
  "room_temp": 18.5,
  "room_humidity": 85.2,
  "bag_temps": [16.2, 16.5, 16.3, 16.8],
  "outdoor_temp": 22.3,
  "outdoor_humidity": 65.0,
  "relay_states": {
    "co2": true,
    "humidity": false,
    "temperature": true
  }
}
```

### Device Authentication

- All HTTP requests include `X-Device-ID` and `X-Device-Key` headers.
- The device ID is stored in EEPROM after first registration.
- The device key is authenticated every 30 minutes. If the subscription has expired, the device stops functioning.

### Relay Command Polling

After each sensor POST, the device polls `GET /device/{id}/commands` for relay control commands from the server. Commands are one-time (deleted after read). Relay states are confirmed back to the server in the next sensor POST via `relay_states`.

### Heartbeat

Every 30 minutes, the device sends a heartbeat with: device IP, Wi-Fi RSSI, free heap memory, and uptime.

## Usage Instructions

1. Connect all sensors to the correct ports as mentioned on the PCB.
2. If it's the first-time setup, a "Connecting to Wi-Fi" message will appear. After some time, a hotspot named "Mushroom Farming" will start with the password "password". Connect your mobile or computer device to that hotspot.
3. A login page will open where you can enter the credentials of your Wi-Fi network. The ESP32 will connect to that Wi-Fi and save the credentials.
4. On the next screen, it will ask for a device key (only on the first-time booting). Enter the device key using the joystick. If the device key is valid in the database, it will proceed to the device boot-up. Otherwise, it will ask for the device key again.
5. The device automatically sends data to the backend server every 30 seconds. This data includes all sensor readings in a unified JSON payload.
6. The device key is authenticated every 30 minutes since this is a subscription-based model. If the device subscription has expired, it will stop functioning.
7. Relay automation (`checkForRelay()`) is active — the device automatically controls relays based on threshold settings.

## License

This is a private repository for the company, and only maintainers and owners of this repository can view it.
