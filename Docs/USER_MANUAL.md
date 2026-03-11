# Mushroom Farm IoT -- User Manual

**Last Updated:** 2026-03-11

**Dashboard URL:** [dashboard.mushroomkimandi.com](https://dashboard.mushroomkimandi.com)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Navigation](#3-navigation)
4. [Plants Management](#4-plants-management)
5. [Rooms](#5-rooms)
6. [Devices](#6-devices)
7. [Equipment Control (Relays)](#7-equipment-control-relays)
8. [Alerts](#8-alerts)
9. [Reports](#9-reports)
10. [Harvest Tracking](#10-harvest-tracking)
11. [Growth Cycles](#11-growth-cycles)
12. [User Management (Admin Only)](#12-user-management-admin-only)
13. [Settings](#13-settings)
14. [Profile](#14-profile)
15. [Device Onboarding (Admin Only)](#15-device-onboarding-admin-only)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Getting Started

### Accessing the Dashboard

Open your web browser (Chrome, Edge, Firefox, or Safari) and go to:

**https://dashboard.mushroomkimandi.com**

You will see the login screen with the MushroomIoT logo.

### Logging In

1. Enter your **Username** in the first field.
2. Enter your **Password** in the second field.
3. Click **Sign In**.

If your credentials are correct, you will be taken directly to the Dashboard. If you see an error message, double-check your username and password.

**Tip:** You can click the eye icon next to the password field to show or hide your password while typing.

### Account Lockout

For security, your account will be **locked after 5 failed login attempts**. If this happens, you will see a message telling you how many minutes to wait before trying again. If you believe your account was locked by mistake, contact your farm administrator.

### First-Time Setup

When you log in for the first time, your administrator has already created your account. Here is what you should do:

1. **Go to your Profile** (click your name at the bottom of the sidebar, or navigate to the Profile page).
2. **Change your password** to something only you know. Your new password must be at least 8 characters.
3. **Familiarize yourself with the sidebar** to understand which pages are available to you.

---

## 2. Dashboard Overview

The Dashboard is the first page you see after logging in. It gives you a quick snapshot of your entire mushroom farm operation.

### What Admins See (Admin Dashboard)

If you are an Admin, your dashboard shows a **fleet and infrastructure overview**:

- **Fleet Summary Cards** -- Four cards at the top showing:
  - **Total Plants** -- How many farm locations you manage.
  - **Total Rooms** -- How many growing rooms are set up across all plants.
  - **Total Devices** -- How many ESP32 sensor devices are registered.
  - **Total Users** -- How many team members have accounts.

- **Device Fleet Status** -- A donut chart showing how many devices are Online (green), Offline (red), or Unassigned (gray).

- **License Key Status** -- Progress bars showing how many device license keys are Active, Pending, Suspended, or Expired.

- **Plant Overview Table** -- A table listing each plant with its rooms, devices, online count, active alerts, and a health indicator dot:
  - Green dot = all devices online, healthy.
  - Yellow dot = some devices offline.
  - Red dot = all devices offline.
  - Gray dot = no devices assigned.

- **Room Type Distribution** -- A horizontal bar chart showing how many rooms are Fruiting, Spawn Run, Incubation, or Storage.

- **Alert Summary** -- Four tiles showing Active alerts, Critical alerts, Warning alerts, and how many were Resolved Today.

- **Recent Activity** -- A feed showing the latest device events (came online, went offline, was registered) with timestamps.

- **Quick Actions** -- Four shortcut buttons to jump to Manage Plants, Manage Devices, View Alerts, or User Management.

### What Operators/Managers See (User Dashboard)

If you are an Operator or Manager, your dashboard focuses on **day-to-day monitoring**:

- **Yield Summary** -- A card showing your current harvest yield, grade distribution, and recent harvest entries. This pulls real data from your harvest logs.

- **Alert Widget** -- Shows the 5 most recent active alerts. You can acknowledge them directly from here.

- **Summary Cards** -- Four metric cards:
  - **Total Plants** -- Number of farm locations.
  - **Total Rooms** -- Number of growing rooms.
  - **Active Devices** -- Devices currently online and sending data.
  - **Active Alerts** -- Number of unresolved alerts (turns red if any exist).

- **Live Room Sensors** -- Cards for each room showing real-time CO2, temperature, and humidity readings with circular gauges. The gauge color changes based on how the reading compares to the threshold:
  - Green = within the ideal range.
  - Yellow = slightly outside the range.
  - Red = significantly outside the range.

- **Equipment Status Matrix** -- A grid showing the on/off/offline status of all 7 relays (equipment) across all rooms at a glance:
  - Green dot = equipment is ON.
  - Red dot = equipment is OFF.
  - Gray dot = device is offline (no data).

- **Historical Charts** -- Three line charts showing CO2 (ppm), Temperature (degrees C), and Humidity (%) over the last 24 hours. A green shaded area shows the ideal range for each parameter.

---

## 3. Navigation

### Sidebar Menu

The sidebar is on the left side of the screen. It contains all the pages you can visit:

| Menu Item | Description |
|---|---|
| **Dashboard** | Main overview page |
| **Plants** | Manage farm locations |
| **Rooms** | Manage growing rooms |
| **Devices** | View and manage sensor devices |
| **Settings** | Configure sensor thresholds |
| **Alerts** | View and manage alerts |
| **Reports** | Generate and download reports |
| **Users** | Manage team members (Admin only) |
| **Firmware** | Manage firmware versions (Admin only) |
| **Flash Device** | Flash and register new devices (Admin only) |

The **Alerts** menu item shows a red badge with the number of active alerts, so you can always see at a glance if something needs attention.

### Collapsing the Sidebar

Click the **Collapse** button at the bottom of the sidebar to shrink it to icons only. This gives you more screen space. Click the arrow icon again to expand it back.

### Logging Out

Click the **Logout** button at the bottom of the sidebar. You will be returned to the login screen.

### Your Account Info

At the bottom of the sidebar (when expanded), you can see your name and email. Click on **Profile** in the sidebar to view your full account details.

### Role-Based Menu Differences

Not everyone sees the same menu items:

- **Admin / Super Admin:** Sees everything, including Users, Firmware, and Flash Device.
- **Manager:** Sees Dashboard, Plants, Rooms, Devices, Settings, Alerts, Reports, and Profile. Does NOT see Users, Firmware, or Flash Device.
- **Operator:** Same as Manager.
- **Viewer:** Same as Manager but with limited actions (cannot acknowledge or resolve alerts, cannot modify data).

---

## 4. Plants Management

A "Plant" in this system represents a **physical farm location** -- a building or facility where you grow mushrooms.

### Viewing Plants

Go to **Plants** in the sidebar. You will see a table listing all your plants with these columns:

- **Plant Name** -- The name you gave this location.
- **Code** -- A short code (e.g., "NVF" for Navi Farm).
- **Type** -- The type of mushroom grown: Oyster, Button, Shiitake, or Mixed.
- **City** and **State** -- Where the plant is located.
- **Rooms** -- How many growing rooms are at this plant.
- **Status** -- Active or Inactive.
- **Created** -- When this plant record was created.

You can **search** by plant name, code, or city using the search box. You can also **filter** by mushroom type or status using the dropdown menus.

### Adding a New Plant

1. Click the **New Plant** button in the top right.
2. A panel slides in from the right side. Fill in the details:
   - **Plant Name** (required) -- e.g., "Navi Valley Farm"
   - **Plant Code** (required) -- A short identifier, e.g., "NVF"
   - **Type** (required) -- Select the mushroom type: Oyster, Button, Shiitake, or Mixed
   - **Location** -- A description of where the plant is (optional)
   - **Address** -- The street address (optional)
   - **City** (required) -- The city
   - **State** (required) -- The state
   - **Latitude / Longitude** -- GPS coordinates (optional, useful for multi-location operations)
   - **Size (sq ft)** -- The total facility size in square feet (optional)
3. Click **Create Plant**.

### Editing a Plant

1. Find the plant in the table.
2. Click the **pencil icon** in the Actions column.
3. The edit panel will open with the current details pre-filled.
4. Make your changes and click **Save Changes**.

### Deleting a Plant

1. Click the **trash icon** in the Actions column next to the plant you want to remove.
2. The plant will be deleted immediately.

**Warning:** Deleting a plant will not automatically delete its rooms or devices, but those rooms will no longer be associated with a plant.

---

## 5. Rooms

A "Room" is a **growing room** within a plant. Each room typically has its own climate control and sensor device.

### Room List View

Go to **Rooms** in the sidebar. The table shows:

- **Room Name** -- e.g., "Fruiting Room A1"
- **Code** -- A short identifier, e.g., "NVF-A1"
- **Plant** -- Which farm location this room belongs to.
- **Type** -- The room type:
  - **Spawn Run** -- Where mycelium colonizes the substrate.
  - **Incubation** -- Where bags are kept warm for mycelium growth.
  - **Fruiting** -- Where mushrooms grow and are harvested (the most actively monitored room type).
  - **Storage** -- For storing harvested mushrooms or supplies.
- **Size** -- Room size in square feet.
- **Racks** -- Number of growing racks.
- **Bags** -- Total number of substrate bags.
- **Floor** -- Which floor the room is on.
- **Device** -- Which sensor device is assigned. Shows "Unassigned" (orange badge) if no device is linked.
- **Status** -- Active, Inactive, or Maintenance.

You can search by room name or code, and filter by plant or room type.

**Clicking on a room row** takes you to the Room Detail page (see below).

### Creating a New Room

1. Click the **New Room** button.
2. Fill in the details:
   - **Room Name** (required)
   - **Room Code** (required)
   - **Plant** (required) -- Select which farm location this room belongs to
   - **Room Type** (required) -- Spawn Run, Incubation, Fruiting, or Storage
   - **Size (sq ft)** -- Optional
   - **Number of Racks** and **Bags per Rack** -- Helps track growing capacity
   - **Total Bags** -- The total number of substrate bags in this room
   - **Floor Number** -- Which floor the room is on
3. Click **Create Room**.

### Room Detail Page

When you click on a room in the list, you are taken to a detailed view with everything about that room. This is the most feature-rich page in the system. Here is what you will find:

#### Header
- Room name, code, and online/offline status badge.
- **Log Harvest** button -- Opens a dialog to record a new harvest.
- **Link Device** button (Admin only) -- Lets you scan a QR code or select a device to assign to this room.

#### Growth Stage Timeline
A visual timeline showing the 6 stages of mushroom growing:
1. **Inoculation** -- Substrate is inoculated with mushroom spawn.
2. **Spawn Run** -- Mycelium colonizes the substrate.
3. **Incubation** -- Bags are incubated in warm, dark conditions.
4. **Fruiting** -- Conditions are changed to trigger mushroom growth.
5. **Harvest** -- Mushrooms are picked.
6. **Idle** -- Room is resting between cycles.

The current stage is highlighted and glowing. You will see how many days the room has been in the current stage, and the expected duration range.

Next to the timeline, you will find controls to **Start Growth Cycle** or **Advance** to the next stage (see Section 11 for details).

#### Climate Advisory Card
This card compares your current climate settings to the **recommended ranges** for the current mushroom type and growth stage. It shows:

- A table with Temperature, Humidity, and CO2 columns showing Recommended vs. Current values.
- A status indicator for each parameter: OK (green checkmark), Warning (yellow triangle), or Critical (red X).
- Actionable suggestions if something is off, for example: "CO2 is too high -- consider increasing ventilation."
- An **Apply Recommended Thresholds** button that sets your thresholds to the recommended values in one click.
- An **Auto-Adjust** toggle: when ON, thresholds will automatically update when you advance to a new growth stage.

#### Sensor Gauges
Three circular gauges showing real-time values:
- **CO2** (in ppm) -- Mushrooms need specific CO2 levels. During fruiting, CO2 is typically kept between 800-1500 ppm depending on the species. Too much CO2 means the mushrooms are not getting enough fresh air.
- **Temperature** (in degrees C) -- Different species and stages need different temperatures. Oyster mushrooms typically fruit at 15-18 degrees C.
- **Humidity** (in %) -- Mushrooms need high humidity (typically 85-95%). If humidity drops, the mushrooms will dry out and not grow properly.

The gauge color tells you the status:
- **Green** = Reading is within your set thresholds (ideal range).
- **Yellow** = Reading is slightly outside the range (needs attention soon).
- **Red** = Reading is significantly outside the range (act now).

#### Bag Temperature Strip
A row of colored temperature indicators for up to 6 individual substrate bags monitored by DS18B20 sensors. Each bag shows its temperature. This helps you spot bags that are running hotter (which could indicate contamination) or cooler than expected.

#### Relay Controls
Seven relay control cards, one for each piece of equipment (see Section 7 for full details on relay modes).

#### Historical Chart
An area chart showing sensor data over the last 24 hours. You can switch between CO2, Temperature, and Humidity views. A green shaded band shows the ideal range.

#### Export CSV
A **Download** button that lets you export sensor readings for this room as a CSV file. You choose the date range and the system generates the file for download.

#### Yield Tracker
Shows harvest progress for this room including:
- A circular progress chart showing how much of the target yield has been harvested.
- A grade distribution pie chart (Grade A, B, C).
- A list of the 5 most recent harvests with weight, grade, and date.

---

## 6. Devices

Each sensor device is an **ESP32 microcontroller** installed in a growing room. It measures CO2, temperature, and humidity, and controls 7 equipment relays.

### Device List

Go to **Devices** in the sidebar. The table shows:

- **Device Name** -- e.g., "ESP32-Sensor-01"
- **MAC Address** -- The unique hardware identifier of the device.
- **License Key** -- Click to copy the device's license key to your clipboard.
- **Room** -- Which room the device is assigned to.
- **Status** -- Online (green) or Offline (red).
- **Subscription** -- License status: Active, Pending, Pending Approval, Suspended, or Expired.
- **Communication** -- HTTP or MQTT (the protocol the device uses to send data).
- **Firmware** -- The firmware version running on the device.
- **Last Seen** -- When the device last sent data.

You can filter by online/offline status and subscription status, and search by name, MAC address, or license key.

### Device Status Indicators

- **Online** (green dot + "Online" badge) -- The device is connected and sending data normally.
- **Offline** (red dot + "Offline" badge) -- The device has stopped sending data. This could mean it lost power, lost WiFi, or has a hardware issue.

### Pending Device Approvals (Admin Only)

When a new device is linked to a room via QR code scanning (see Section 15), it appears in the **Pending Approval** section at the top of the Devices page. Admins can:

- **Approve** -- Accept the device into the system. It will start receiving data.
- **Reject** -- Decline the device. It will not be activated.

### Device Actions (Admin Only)

Admins have additional options by clicking on a device row:

- **Assign to Room** -- Link the device to a specific growing room.
- **View QR Code** -- Display a QR code for this device that can be scanned during field setup.
- **OTA Update** -- Send a firmware update to the device over-the-air.
- **Kill Switch** -- Enable or disable a device remotely (useful if a device is misbehaving).
- **Revoke License** -- Permanently deactivate a device's license key.

---

## 7. Equipment Control (Relays)

Each sensor device controls **7 relays** (electronic switches) that turn farm equipment on and off. This is the heart of your climate control system.

### The 7 Relays

| Relay | Equipment | What It Does |
|---|---|---|
| **CO2** | CO2 Controller/Ventilation Fan | Controls CO2 levels by bringing in fresh air. When CO2 goes too high (mushrooms produce CO2), the fan turns on to bring levels down. |
| **Humidity** | Humidifier | Adds moisture to the air. Mushrooms need high humidity (85-95%) to grow properly. If humidity drops, the humidifier turns on. |
| **Temperature** | AC / Cooler | Controls room temperature. Keeps the room cool enough for mushroom growth (typically 15-18 degrees C for oyster mushrooms). |
| **AHU** | Air Handling Unit | Circulates and conditions the air in the room. Helps distribute temperature and humidity evenly. |
| **Humidifier** | Humidifier 2 | A secondary humidifier for larger rooms or backup. |
| **Duct/Fan** | Duct Fan | Moves air through ducts. Helps with ventilation and air distribution. |
| **Extra** | Extra (configurable) | A spare relay for any additional equipment you want to control. |

### Equipment Matrix Overview

On the User Dashboard, the **Equipment Status Matrix** gives you a grid view of all relay statuses across all rooms:

- Rows = Equipment types (CO2, Humidity, Temperature, AHU, etc.)
- Columns = Rooms
- Each cell shows a colored dot: green (ON), red (OFF), or gray (device offline)

This lets you see at a glance which equipment is running in which room.

### Three Relay Modes

Each relay can operate in one of three modes. You switch modes using the tab buttons at the top of each relay card on the Room Detail page:

#### MANUAL Mode (purple)

You directly control the relay by toggling it on or off.

**How to use:**
1. Make sure the relay is set to **MANUAL** mode (click the MANUAL tab).
2. Click the toggle switch to turn the equipment ON or OFF.
3. You will see a brief animation while the command is sent.
4. The status indicator will update: green dot + "ON" or gray dot + "OFF".

Use Manual mode when you need direct, immediate control -- for example, during maintenance or when testing equipment.

#### AUTO Mode (cyan/blue)

The system automatically controls the relay based on **sensor thresholds**. This is the recommended mode for normal operation.

**How it works:**
- Each relay in AUTO mode is linked to a sensor parameter (e.g., the CO2 relay is linked to the CO2 sensor).
- When the sensor reading goes **above the maximum threshold**, the relay turns ON (e.g., the ventilation fan starts to bring CO2 levels down).
- When the reading drops **below the minimum threshold** (with hysteresis), the relay turns OFF.
- The hysteresis value prevents the equipment from rapidly switching on and off when the reading is near the threshold. For example, if the CO2 max is 1300 ppm with a hysteresis of 100, the relay turns on at 1300 but does not turn off until the reading drops to 1200.

When a relay is in AUTO mode, the card shows:
- "Auto Control" label
- Which parameter it is linked to (e.g., "Linked: CO2")
- "High -> ON / Low -> OFF" indicating the logic

**You cannot manually toggle the relay while it is in AUTO mode.** The system handles it for you.

#### SCHEDULE Mode (yellow)

The relay follows a **time-based schedule** that you define.

**How to set a schedule:**
1. Switch the relay to **SCHEDULE** mode by clicking the SCHED tab.
2. Click the **Edit Schedule** link that appears.
3. A dialog opens where you can set:
   - **Days of Week** -- Click on the day buttons (Mon, Tue, Wed, etc.) to select which days the schedule runs. Selected days are highlighted in yellow.
   - **Time ON** -- What time the equipment should turn on (24-hour format).
   - **Time OFF** -- What time the equipment should turn off.
   - **Active** toggle -- Enable or disable this schedule without deleting it.
4. Click **Create Schedule** (or **Update Schedule** if editing).

The relay card will show the schedule summary, for example: "Mon-Fri 08:00-18:00".

Use Schedule mode for equipment that should run on a predictable schedule, like running the AHU during work hours.

### Bulk Mode Controls

On the Room Detail page, you can set all relays to AUTO or MANUAL at once using the bulk control buttons. This is useful when you want to quickly switch the entire room to automatic control or take full manual control.

### Understanding the Relay Status Indicator

Each relay card shows:
- A **colored dot** (green = ON, gray = OFF)
- The word **ON** or **OFF**
- A **trigger type badge** at the bottom showing what triggered the current state: AUTO, MANUAL, or SCHEDULE

---

## 8. Alerts

Alerts notify you when something goes wrong in your growing rooms -- like a sensor reading exceeding a threshold or a device going offline.

### What Triggers an Alert

| Alert Type | What It Means |
|---|---|
| **CO2_HIGH** | CO2 level has risen above the maximum threshold. Your mushrooms may not be getting enough fresh air. |
| **CO2_LOW** | CO2 level has dropped below the minimum threshold. |
| **TEMP_HIGH** | Room temperature has risen above the maximum. Too much heat can stall mushroom growth or cause contamination. |
| **TEMP_LOW** | Room temperature has dropped below the minimum. Cold rooms slow down growth. |
| **HUMIDITY_HIGH** | Humidity is above the maximum threshold. Excess moisture can promote bacterial contamination. |
| **HUMIDITY_LOW** | Humidity has dropped below the minimum. Dry conditions cause mushrooms to crack, dry out, and stop growing. |
| **DEVICE_OFFLINE** | A sensor device has stopped communicating. You are flying blind without sensor data. |
| **SENSOR_ERROR** | A sensor on the device is reporting errors or invalid readings. |

### Viewing Alerts

Go to **Alerts** in the sidebar. You will see tabs at the top:

- **Active** -- Alerts that have not been addressed yet. These need your attention.
- **Acknowledged** -- Alerts that someone has seen and marked as acknowledged, but the issue has not been resolved yet.
- **Resolved** -- Alerts where the issue has been fixed.
- **All** -- Shows every alert regardless of status.

Each tab shows its count in parentheses, for example: "Active (3)".

The alert table shows:
- **Severity** -- A colored badge:
  - **Critical** (red) -- Immediate action required. A critical threshold has been exceeded.
  - **Warning** (yellow) -- Something needs attention soon but is not yet critical.
  - **Info** (blue) -- Informational, no immediate action needed.
- **Type** -- The specific alert type (e.g., CO2_HIGH).
- **Room** -- Which room the alert is for.
- **Message** -- A description of what happened.
- **Current / Threshold** -- The actual sensor reading vs. the threshold value. If the current value exceeds the threshold, it shows in red.
- **Created** -- When the alert was triggered.

You can filter alerts by severity, room, and search by message text.

### Alert Detail View

Click the **eye icon** on any alert to see full details, including:
- The full alert message.
- The room name, device name, and timestamp.
- A line chart showing the sensor reading over time with a red dashed line at the threshold value.
- Who acknowledged it and when it was resolved (if applicable).

### Acknowledging Alerts

When you see an active alert and you are aware of the issue:
1. Click the **checkmark icon** (single check) next to the alert.
2. The alert moves from "Active" to "Acknowledged" status.
3. This tells your team that someone is aware of the problem.

You need at least **Operator** permissions to acknowledge alerts.

### Resolving Alerts

Once the underlying issue is fixed (e.g., you adjusted the threshold, fixed the equipment, or the reading returned to normal):
1. Click the **double checkmark icon** next to the alert.
2. The alert moves to "Resolved" status.

You need at least **Manager** permissions to resolve alerts.

---

## 9. Reports

Reports let you generate summaries of your farm data and download them as CSV files for record-keeping or analysis.

### Viewing Existing Reports

Go to **Reports** in the sidebar. You will see a table of all previously generated reports with:

- **Report Name** -- A descriptive name generated from the type, plant, and date range.
- **Type** -- The kind of report (Daily Summary, Weekly Summary, Alert Report, or Harvest Report).
- **Format** -- The file format (currently CSV).
- **Date Range** -- The period covered by the report.
- **Size** -- The file size.
- **Generated At** -- When the report was created.

You can search reports by name.

### Generating a New Report

1. Click the **Generate Report** button in the top right.
2. A panel slides in. Fill in:
   - **Report Type** -- Choose one:
     - **Daily Summary** -- A day-by-day summary of sensor readings.
     - **Weekly Summary** -- A week-by-week summary.
     - **Alert Report** -- A list of all alerts during the period.
     - **Harvest Report** -- A summary of harvests during the period.
   - **Plant** -- Select which farm location the report covers.
   - **Date From / Date To** -- The date range for the report. The default is the last 7 days.
3. Click **Generate**. A spinner will appear while the report is being created.
4. Once complete, the report appears in the table and you can download it.

### Downloading a Report

Click the **download icon** next to any report in the table. The CSV file will download to your computer.

### Deleting a Report (Admin Only)

Admins can click the **trash icon** next to a report to delete it. You will be asked to confirm before the report is permanently removed.

### Understanding Report Data

CSV files can be opened in Excel, Google Sheets, or any spreadsheet program. They contain timestamped sensor readings, alert records, or harvest logs depending on the report type. Use them for:

- Tracking trends over time.
- Complying with food safety record-keeping requirements.
- Analyzing which rooms perform best.
- Sharing data with consultants or auditors.

---

## 10. Harvest Tracking

Harvest tracking lets you record every time you pick mushrooms, along with the weight and quality grade.

### Logging a Harvest

You can log a harvest from the **Room Detail** page:

1. Navigate to the room where you harvested mushrooms.
2. Click the **Log Harvest** button in the top right.
3. A dialog opens. Fill in:
   - **Weight (kg)** -- The total weight of this harvest in kilograms.
   - **Grade** -- Select the quality grade:
     - **Grade A** -- Premium quality. Mushrooms are the right size, shape, and color. No defects. These go to your best buyers.
     - **Grade B** -- Good quality. Minor cosmetic imperfections. Still sellable at market rate.
     - **Grade C** -- Acceptable quality. Smaller size or visible imperfections. May be sold at a discount or used for processing.
   - **Notes** -- Optional. Add any comments, e.g., "First flush" or "Slightly dry conditions this week."
4. Click **Log Harvest**.

### Viewing Harvest History

On the Room Detail page, the **Yield Tracker** card shows:

- **Harvest Progress** -- A circular progress chart. If a target yield has been set for the growth cycle, it shows the percentage completed. If no target is set, it shows the total weight harvested.
- **Grade Distribution** -- A pie chart showing the percentage breakdown of Grade A (cyan), Grade B (green), and Grade C (yellow) harvests.
- **Recent Harvests** -- A list of the 5 most recent harvests for this room, showing weight, grade, and when it was recorded.

### Yield Summary on the Dashboard

The User Dashboard shows an overall **Yield Summary** card that aggregates harvest data across all rooms for the current period.

---

## 11. Growth Cycles

A Growth Cycle tracks the entire lifecycle of a batch of mushroom bags in a room, from inoculation through harvest. It helps you plan, track, and optimize your growing process.

### What Is a Growth Cycle?

When you fill a room with new bags of substrate, you start a new growth cycle. The cycle tracks which stage the room is in and provides climate recommendations for each stage.

### Growth Stages

Mushroom growing typically follows these stages:

| Stage | What Happens | Typical Duration |
|---|---|---|
| **Inoculation** | Substrate bags are inoculated (injected) with mushroom spawn. | 1-2 days |
| **Spawn Run** | Mycelium (the mushroom's root system) colonizes the substrate. Bags are kept warm and dark. | 14-21 days |
| **Incubation** | Continued colonization and consolidation. Conditions are controlled to support full colonization. | 7-14 days |
| **Fruiting** | Conditions are changed (lower temperature, higher humidity, fresh air exchange) to trigger mushroom growth. Pins (tiny mushrooms) appear and grow to harvest size. | 7-14 days per flush |
| **Harvest** | Mushrooms are picked. The room may go through multiple "flushes" (fruiting cycles). | 2-5 days |
| **Idle** | Room is cleaned, sanitized, and prepared for the next cycle. | Variable |

### Starting a New Cycle

1. Go to the Room Detail page.
2. If no cycle is active, you will see a **Start Growth Cycle** button near the Stage Timeline.
3. Click it. The cycle begins at the Inoculation stage.

### Advancing to the Next Stage

When the room is ready to move to the next stage:

1. Click the **Advance to [Next Stage]** button (e.g., "Advance to Spawn Run").
2. A confirmation dialog appears showing:
   - The current stage and the next stage.
   - If **Auto-Adjust** is ON, it will show the threshold changes that will be applied automatically for the new stage (e.g., temperature will be adjusted from 25 degrees C to 16 degrees C when moving from Incubation to Fruiting).
   - If Auto-Adjust is OFF, you will see a note reminding you to update thresholds manually.
3. Click **Confirm Advance**.

### Auto-Adjust Thresholds

When Auto-Adjust is enabled:
- Moving to a new stage automatically updates the CO2, Temperature, and Humidity thresholds to match the recommended ranges for that stage and mushroom type.
- This saves you from having to manually change settings every time the room advances.
- You can toggle Auto-Adjust on or off in the Climate Advisory card on the Room Detail page.

### Completing a Cycle

When you advance through all stages to **Idle**, the cycle is complete. You can then start a new cycle when you refill the room with fresh substrate bags.

---

## 12. User Management (Admin Only)

Only Admins can access the Users page. This is where you manage who can log in and what they can do.

### Viewing Users

Go to **Users** in the sidebar. The table shows:

- **Username** -- The login name. A lock icon appears if the account is locked.
- **Email** -- The user's email address.
- **Full Name** -- First and last name.
- **Role** -- The user's permission level (see below).
- **Assigned Plants** -- Which farm locations this user can access.
- **Last Login** -- When they last signed in.
- **Status** -- Active or Locked.
- **Created** -- When the account was created.

You can search by name, username, or email, and filter by role.

### User Roles

| Role | What They Can Do |
|---|---|
| **Admin** | Full access to everything: manage users, devices, firmware, flash devices, approve pending devices, delete reports, and all standard features. |
| **Manager** | Can view all data, acknowledge and resolve alerts, generate reports, log harvests, and manage room settings. Cannot manage users or flash devices. |
| **Operator** | Can view data, acknowledge alerts, and log harvests. Cannot resolve alerts or modify system settings. |
| **Viewer** | Read-only access. Can view dashboards, sensor data, and reports but cannot make changes. |

### Adding a New User

1. Click **New User**.
2. Fill in the form:
   - **First Name** and **Last Name** (required)
   - **Username** (required) -- What they will use to log in.
   - **Email** (required)
   - **Password** (required for new users) -- Must be at least 8 characters.
   - **Mobile** -- Phone number (optional).
   - **Role** -- Select from Admin, Manager, Operator, or Viewer.
   - **Assigned Plants** -- Check the boxes for which farm locations this user should be able to access.
3. Click **Create User**.

### Editing a User

1. Click the **pencil icon** next to the user in the table.
2. Update any fields. Note: you cannot change the password here (users change their own password via the Profile page).
3. Click **Save Changes**.

### Deactivating Users

Currently, user accounts can become locked after 5 failed login attempts. To unlock a locked account, an admin can edit the user and reset their status through the backend. If you need to prevent someone from logging in, contact your system administrator to change the account status in the database.

---

## 13. Settings

The Settings page lets you configure **sensor thresholds** for each room. Thresholds control when alerts are triggered and when AUTO-mode relays turn equipment on or off.

### Selecting a Room

1. Go to **Settings** in the sidebar.
2. Use the **Select Room** dropdown at the top to choose which room you want to configure.

### Setting Thresholds

You will see three threshold cards:

#### CO2 Thresholds
- **Min (ppm)** -- The lowest acceptable CO2 level. Below this, a CO2_LOW alert triggers.
- **Max (ppm)** -- The highest acceptable CO2 level. Above this, a CO2_HIGH alert triggers and the CO2 relay (ventilation) turns on in AUTO mode.
- **Hysteresis (ppm)** -- The buffer zone. For example, if Max is 1300 and hysteresis is 100, the relay turns on at 1300 but does not turn off until CO2 drops to 1200.

Typical values for oyster mushrooms during fruiting: Min 800, Max 1300, Hysteresis 100.

#### Temperature Thresholds
- **Min (degrees C)** -- Below this, a TEMP_LOW alert triggers.
- **Max (degrees C)** -- Above this, a TEMP_HIGH alert triggers and the temperature relay (AC) turns on.
- **Hysteresis (degrees C)** -- The buffer zone.

Typical values for oyster mushrooms during fruiting: Min 15, Max 18, Hysteresis 1.

#### Humidity Thresholds
- **Min (%)** -- Below this, a HUMIDITY_LOW alert triggers and the humidity relay (humidifier) turns on.
- **Max (%)** -- Above this, a HUMIDITY_HIGH alert triggers.
- **Hysteresis (%)** -- The buffer zone.

Typical values for oyster mushrooms during fruiting: Min 85, Max 95, Hysteresis 2.5.

### Saving Thresholds

Each threshold card has its own **Save** button. Click it after making changes. The new thresholds take effect immediately -- both for alert generation and for AUTO-mode relay control.

If a live sensor reading is available, a circular gauge above each card shows the current value, so you can see at a glance whether the room is within range.

### What Is Hysteresis and Why Does It Matter?

Hysteresis prevents equipment from rapidly switching on and off (called "chattering"). Without hysteresis, if your CO2 max is 1300 and the reading fluctuates between 1299 and 1301, the fan would turn on and off every few seconds. With a hysteresis of 100, the fan turns on at 1300 but stays on until CO2 drops to 1200, giving a smooth, stable operation.

---

## 14. Profile

The Profile page shows your account information and lets you change your password.

### Viewing Your Profile

Go to **Profile** in the sidebar (or navigate to `/profile`). You will see:

- **Full Name** -- Your first and last name.
- **Email** -- Your email address.
- **Mobile** -- Your phone number (if set).
- **Role** -- Your permission level (Admin, Manager, Operator, or Viewer).
- **Last Login** -- When you last signed in.
- **Account Status** -- Active (green pulsing dot) or Locked (red dot).

### Changing Your Password

1. Scroll down to the **Change Password** section.
2. Enter your **Current Password**.
3. Enter your **New Password** (must be at least 8 characters).
4. Enter the new password again in **Confirm New Password** to make sure you typed it correctly.
5. Click **Update Password**.

If successful, you will see a confirmation message. Your new password will be required next time you log in.

---

## 15. Device Onboarding (Admin Only)

This section covers how to add new sensor devices to the system. Only Admins can access the Flash Device and Firmware pages.

### Flash Device Wizard

Go to **Flash Device** in the sidebar. A 5-step wizard guides you through the process:

#### Step 1: Connect
- Connect the ESP32 device to your computer via USB.
- Click **Connect via USB** (note: Web Serial flashing is a placeholder feature -- for actual firmware flashing, use PlatformIO or esptool.py).
- Or click **Skip to Manual Entry** to go directly to entering device information.

#### Step 2: Flash
- Shows the latest firmware version available.
- Click **Flash Firmware** to flash the firmware to the device (placeholder -- use PlatformIO for now).
- Click **Next** to continue.

#### Step 3: Device Info
- Enter the **MAC Address** of the device (format: AA:BB:CC:DD:EE:FF). The system auto-formats as you type.
- Enter a **Device Name** (e.g., "ESP32-Sensor-03").
- Click **Next**.

#### Step 4: Register
- Review the summary (MAC Address, Device Name, Device Type, Firmware version).
- Click **Register Device**. The system will:
  - Create the device record in the database.
  - Generate a unique **License Key**.
- Once registered, you will see a green confirmation with the license key displayed.
- Click **View Sticker** to continue.

#### Step 5: Sticker
- A printable sticker is generated with the device name, MAC address, license key (as text and barcode), and a QR code.
- Print this sticker and attach it to the device enclosure for easy identification in the field.

After completing all steps, you can click **Flash Another Device** to start the process again for the next device.

### QR Code Scanning

At the bottom of the Flash Device page, there is a **QR Scanner** tool. You can:
- Click **Open QR Scanner** to activate your camera.
- Point it at a device's QR sticker.
- The scanner reads the license key and provisioning info, making it easy to look up or link a device.

### Linking a Device to a Room

Once a device is registered, you need to assign it to a room:

1. Go to the **Room Detail** page for the room where the device is installed.
2. Click the **Link Device** button (QR code icon, Admin only).
3. Either scan the device's QR code with your camera, or select the device from a list.
4. The device will appear as "Pending Approval" in the Devices page.
5. Go to **Devices** and approve the pending device.

Alternatively, from the Devices page, click on a device row and use **Assign to Room** to directly link it.

### Device Approval

When a device is linked via QR scanning, it enters a "Pending Approval" state. Admins must approve it:

1. Go to **Devices**.
2. Look for the **Pending Approval** section at the top of the page.
3. For each pending device, click **Approve** (green checkmark) or **Reject** (red X).
4. Approved devices start sending data immediately.

### Firmware Management

Go to **Firmware** in the sidebar to:
- View all uploaded firmware versions.
- See which version is marked as "Active" (the one used for new devices).
- Upload new firmware .bin files.
- View release notes and file sizes.

---

## 16. Troubleshooting

### "Device showing offline"

If a device shows as Offline on the dashboard:

1. **Check physical power.** Is the ESP32 plugged in and getting power? Look for the power LED on the board.
2. **Check WiFi.** Is the WiFi router working? Try connecting another device to the same network to verify.
3. **Check the device's location.** WiFi signal weakens through walls and metal structures. If the device was moved, it may be too far from the router.
4. **Check the router.** Some routers drop connections after a certain number of connected devices. Make sure your router supports enough simultaneous connections.
5. **Restart the device.** Unplug the device, wait 10 seconds, and plug it back in. It takes about 30-60 seconds to reconnect.
6. **Check the "Last Seen" time** on the Devices page. If it was recent (a few minutes ago), the device may be temporarily disconnected and will come back on its own.

If the device remains offline after these steps, it may have a hardware issue. Contact your administrator.

### "Sensor readings not updating"

If you see stale numbers that are not changing:

1. **Check the device status.** If the device is Offline, readings will not update (see above).
2. **Check the WebSocket connection.** Look for the WebSocket connection indicator. If the dashboard says "Disconnected," try refreshing the page (press F5 or Ctrl+R).
3. **Check your internet connection.** If your internet is slow or unstable, the real-time connection may drop. Refreshing the page usually reconnects.
4. **Check the sensor itself.** If only one measurement is stuck (e.g., CO2 is always 0), the physical sensor on the device may be faulty. The SCD41 CO2 sensor can take up to 5 minutes to warm up after a power cycle.

### "Can't control relay"

If clicking a relay toggle does nothing:

1. **Check the relay mode.** If the relay is in AUTO or SCHEDULE mode, you cannot manually toggle it. Switch it to MANUAL mode first.
2. **Check the device status.** The device must be Online to receive relay commands.
3. **Wait a moment.** After toggling, there is a brief delay (about 0.5 seconds) while the command is sent. If the toggle seems to bounce back, the command may have failed.
4. **Check your permissions.** Viewers cannot control relays. You need at least Operator role.
5. **Refresh the page.** Sometimes the UI state can get out of sync. Refreshing will fetch the latest relay states from the server.

### "Login not working"

If you cannot log in:

1. **Check your username and password.** Make sure Caps Lock is off. Passwords are case-sensitive.
2. **Check for account lockout.** After 5 failed login attempts, your account is locked for several minutes. You will see a message: "Account locked. Try again in X minutes."
3. **Ask your admin to check your account.** Your account status might be Locked in the database.
4. **Clear your browser cache.** Sometimes old session data can cause issues. Clear cookies for dashboard.mushroomkimandi.com.
5. **Try a different browser.** If all else fails, try Chrome, Edge, or Firefox.

### "Alert keeps coming back after resolving"

If an alert is resolved but a new one immediately appears:

- This means the underlying condition has not been fixed. The sensor reading is still outside the threshold.
- Check the room's actual conditions: is the equipment working? Is the humidifier running? Is the AC on?
- You may need to adjust the threshold if the current setting is too tight for your actual conditions.

### "Reports fail to generate"

If you get an error when generating a report:

1. **Make sure you selected a plant.** The report generator requires a plant selection.
2. **Check the date range.** The "Date From" must be before "Date To."
3. **Try a shorter date range.** Very large date ranges with many data points can take longer to generate.
4. **Refresh and try again.** Temporary server issues can cause failures. Wait a moment and try again.

### Contact Support

If none of the above solutions work, contact your system administrator or reach out to the Mushroom Kimandi support team.

When reporting an issue, please include:
- What page you were on.
- What you were trying to do.
- What error message you saw (if any).
- The time when the issue occurred.
- Your username and which browser you are using.

---

*This manual covers the Mushroom Farm IoT Monitoring Dashboard v4.0. For technical documentation, firmware specifications, or API reference, contact your system administrator.*
