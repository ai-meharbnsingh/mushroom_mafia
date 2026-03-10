// User Types
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  role: UserRole;
  assignedPlants: string[];
  lastLogin?: string;
  status: 'ACTIVE' | 'LOCKED';
  loginAttempts: number;
  createdAt: string;
}

// Plant Types
export type PlantType = 'OYSTER' | 'BUTTON' | 'SHIITAKE' | 'MIXED';

export interface Plant {
  id: string;
  name: string;
  code: string;
  type: PlantType;
  location: string;
  address?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  sizeSqft?: number;
  status: 'ACTIVE' | 'INACTIVE';
  roomsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Room Types
export type RoomType = 'SPAWN_RUN' | 'FRUITING' | 'INCUBATION' | 'STORAGE';

export interface Room {
  id: string;
  name: string;
  code: string;
  plantId: string;
  plantName: string;
  roomType: RoomType;
  sizeSqft?: number;
  racks: number;
  bags: number;
  bagsPerRack: number;
  floorNumber: number;
  deviceId?: string;
  deviceName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  createdAt: string;
  updatedAt: string;
}

// Device Types
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING_APPROVAL';
export type CommunicationMode = 'HTTP' | 'MQTT';

export interface Device {
  id: string;
  name: string;
  macAddress: string;
  type: 'ESP32';
  firmwareVersion: string;
  hardwareVersion?: string;
  assignedRoomId?: string;
  assignedRoomName?: string;
  assignedPlantId?: string;
  assignedPlantName?: string;
  licenseKey: string;
  subscriptionStatus: SubscriptionStatus;
  communicationMode: CommunicationMode;
  onlineStatus: 'ONLINE' | 'OFFLINE';
  lastSeen?: string;
  wifiSignal: number; // RSSI
  freeHeap: number;
  ipAddress?: string;
  uptime?: number;
  registeredAt: string;
}

// Sensor Reading Types
export interface BagTemperature {
  bagId: number;
  temperature: number;
  timestamp: string;
}

export interface SensorReading {
  id: string;
  roomId: string;
  deviceId: string;
  co2: number; // ppm
  temperature: number; // °C
  humidity: number; // %
  bagTemperatures: BagTemperature[];
  outdoorTemperature?: number;
  outdoorHumidity?: number;
  relayStates: RelayStates;
  timestamp: string;
}

// Relay Types
export type RelayState = 'ON' | 'OFF';
export type TriggerType = 'AUTO' | 'MANUAL' | 'SCHEDULE';

export type RelayType = 'co2' | 'humidity' | 'temperature' | 'ahu' | 'humidifier' | 'duct_fan' | 'extra';

export interface RelayStates {
  co2: RelayState;
  humidity: RelayState;
  temperature: RelayState;
  ahu: RelayState;
  humidifier: RelayState;
  duct_fan: RelayState;
  extra: RelayState;
}

export interface RelayTriggers {
  co2: TriggerType;
  humidity: TriggerType;
  temperature: TriggerType;
  ahu: TriggerType;
  humidifier: TriggerType;
  duct_fan: TriggerType;
  extra: TriggerType;
}

export interface PendingDevice {
  deviceId: string;
  name: string;
  licenseKey: string;
  macAddress: string;
  roomId: string;
  roomName: string;
  linkedByUsername: string;
  linkedAt: string;
}

export interface QrScanResult {
  v: number;
  lic: string;
  ap: string;
  pw: string;
}

// Threshold Types
export interface Threshold {
  min: number;
  max: number;
  hysteresis: number;
}

export interface RoomThresholds {
  roomId: string;
  co2: Threshold;
  temperature: Threshold;
  humidity: Threshold;
  updatedBy?: string;
  updatedAt?: string;
}

// Alert Types
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertType = 
  | 'CO2_HIGH' 
  | 'CO2_LOW' 
  | 'TEMP_HIGH' 
  | 'TEMP_LOW' 
  | 'HUMIDITY_HIGH' 
  | 'HUMIDITY_LOW'
  | 'DEVICE_OFFLINE'
  | 'SENSOR_ERROR';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  roomId: string;
  roomName: string;
  deviceId?: string;
  deviceName?: string;
  message: string;
  currentValue?: number;
  thresholdValue?: number;
  unit?: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

// Report Types
export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
export type ReportFormat = 'PDF' | 'EXCEL' | 'CSV';

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  format: ReportFormat;
  plantId?: string;
  plantName?: string;
  dateFrom: string;
  dateTo: string;
  fileSize: string;
  generatedBy: string;
  generatedAt: string;
  fileUrl?: string;
}

// Historical Data Types
export interface HistoricalDataPoint {
  timestamp: string;
  co2: number;
  temperature: number;
  humidity: number;
}

export interface RoomHistoricalData {
  roomId: string;
  data: HistoricalDataPoint[];
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'SENSOR_UPDATE' | 'ALERT' | 'RELAY_CONFIRM' | 'DEVICE_STATUS' | 'DEVICE_REGISTERED';
  payload: unknown;
  timestamp: string;
}

// Dashboard Summary
export interface DashboardSummary {
  totalPlants: number;
  totalRooms: number;
  activeDevices: number;
  activeAlerts: number;
}

// Admin Dashboard
export interface AdminDashboardSummary {
  totalPlants: number;
  totalRooms: number;
  totalDevices: number;
  totalUsers: number;
  deviceStatus: { total: number; online: number; offline: number; unassigned: number };
  subscriptions: { active: number; pending: number; suspended: number; expired: number };
  roomTypes: { fruiting: number; spawnRun: number; incubation: number; storage: number };
  alerts: { active: number; critical: number; warning: number; acknowledged: number; resolvedToday: number };
  plants: PlantOverview[];
  recentEvents: RecentDeviceEvent[];
}

export interface PlantOverview {
  plantId: string;
  plantName: string;
  plantCode: string;
  plantType: string;
  totalRooms: number;
  totalDevices: number;
  onlineDevices: number;
  activeAlerts: number;
}

export interface RecentDeviceEvent {
  deviceId: string;
  deviceName: string;
  event: string;
  timestamp: string;
}

// Room With Latest Reading
export interface RoomWithReading extends Room {
  latestReading?: SensorReading;
  thresholds: RoomThresholds;
}

// Navigation Types
export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
  adminOnly?: boolean;
}

// Form Types
export interface LoginFormData {
  username: string;
  password: string;
}

export interface PlantFormData {
  name: string;
  code: string;
  type: PlantType;
  location: string;
  address?: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  sizeSqft?: number;
}

export interface RoomFormData {
  name: string;
  code: string;
  plantId: string;
  roomType: RoomType;
  sizeSqft?: number;
  racks: number;
  bags: number;
  bagsPerRack: number;
  floorNumber: number;
}

export interface UserFormData {
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  role: UserRole;
  assignedPlants: string[];
}

export interface ReportFormData {
  plantId?: string;
  dateFrom: string;
  dateTo: string;
  type: ReportType;
  format: ReportFormat;
}

export interface PasswordFormData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Filter Types
export interface PlantFilters {
  type?: PlantType;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
}

export interface RoomFilters {
  plantId?: string;
  roomType?: RoomType;
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  search?: string;
}

export interface AlertFilters {
  severity?: AlertSeverity;
  roomId?: string;
  status?: AlertStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface DeviceFilters {
  status?: 'ONLINE' | 'OFFLINE';
  subscriptionStatus?: SubscriptionStatus;
  assigned?: boolean;
  search?: string;
}
