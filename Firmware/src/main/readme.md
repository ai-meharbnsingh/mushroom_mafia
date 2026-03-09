# Main.ino Documentation

This file contains the main code for the project. It initializes the necessary components, handles the device's functionality, and controls the flow of operations.

## Functions

### `setup()`

This function is executed once when the device starts up. It performs the following tasks:
- Initializes the serial communication.
- Initializes the LCD display.
- Sets up the WiFi connection.
- Initializes other connected devices.
- Displays a welcome screen on the LCD.
- Clears the LCD screen.

### `loop()`

This function is executed repeatedly in a continuous loop. It performs the following tasks:
- Checks if a button press event occurred to trigger a specific action.
- Tracks the current time.
- Authenticates the device key every 30 minutes (`keyAuthenticationTimer`).
- Reads sensor data from all sensors (DS18B20 bag temps, SCD41 CO2, DHT11 outdoor).
- Sends a unified JSON POST to the FastAPI backend (`POST /device/readings`) every 30 seconds.
- Polls for relay commands from the server (`GET /device/{id}/commands`) after each sensor POST.
- Executes `checkForRelay()` to apply local relay automation based on thresholds.
- Sends device heartbeat (`POST /device/heartbeat`) every 30 minutes.
- Updates the last time value for sending data.
- Handles the display of status messages on the LCD.
- Commits changes to the EEPROM.

## Data Flow

1. Sensors are read every 30 seconds.
2. All sensor data is sent in a single unified JSON POST to `/device/readings`.
3. After each POST, the device polls `/device/{id}/commands` for relay commands.
4. Relay states are applied locally and confirmed in the next sensor POST.
5. Device heartbeat (IP, RSSI, heap, uptime) is sent every 30 minutes.

## Usage

1. The `setup()` function is called once at the beginning of the program execution. It initializes the necessary components and sets up the environment for the device.
2. The `loop()` function is executed repeatedly in a continuous loop. It controls the main operations of the device, including sensor reading, data transmission, relay control, and LCD display updates.

## Important Considerations

- The device key is authenticated every 30 minutes via `keyAuthenticationTimer`.
- `checkForRelay()` is active and handles local relay automation.
- All HTTP requests include `X-Device-ID` and `X-Device-Key` headers for authentication.
- Proper WiFi connection is required for successful data transmission. Check the WiFi status and reconnect if necessary.

---

*Note: Refer to the `configuration.h` file for configuration settings, API URLs, and included libraries.*
