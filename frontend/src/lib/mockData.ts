import type {
  User,
  Plant,
  Room,
  Device,
  Alert,
  Report,
  SensorReading,
  RoomThresholds,
  HistoricalDataPoint,
} from '@/types';

// Mock Users
export const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@mushroomiot.com',
    firstName: 'System',
    lastName: 'Administrator',
    mobile: '+1-555-0100',
    role: 'ADMIN',
    assignedPlants: ['1', '2', '3'],
    lastLogin: new Date().toISOString(),
    status: 'ACTIVE',
    loginAttempts: 0,
    createdAt: '2024-01-15T00:00:00Z',
  },
  {
    id: '2',
    username: 'manager1',
    email: 'manager@mushroomiot.com',
    firstName: 'Farm',
    lastName: 'Manager',
    mobile: '+1-555-0101',
    role: 'MANAGER',
    assignedPlants: ['1', '2'],
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
    status: 'ACTIVE',
    loginAttempts: 0,
    createdAt: '2024-02-01T00:00:00Z',
  },
  {
    id: '3',
    username: 'operator1',
    email: 'operator@mushroomiot.com',
    firstName: 'Line',
    lastName: 'Operator',
    mobile: '+1-555-0102',
    role: 'OPERATOR',
    assignedPlants: ['1'],
    lastLogin: new Date(Date.now() - 172800000).toISOString(),
    status: 'ACTIVE',
    loginAttempts: 0,
    createdAt: '2024-03-01T00:00:00Z',
  },
  {
    id: '4',
    username: 'viewer1',
    email: 'viewer@mushroomiot.com',
    firstName: 'Guest',
    lastName: 'Viewer',
    role: 'VIEWER',
    assignedPlants: ['1'],
    lastLogin: new Date(Date.now() - 604800000).toISOString(),
    status: 'ACTIVE',
    loginAttempts: 0,
    createdAt: '2024-04-01T00:00:00Z',
  },
  {
    id: '5',
    username: 'lockeduser',
    email: 'locked@mushroomiot.com',
    firstName: 'Locked',
    lastName: 'User',
    role: 'OPERATOR',
    assignedPlants: ['2'],
    status: 'LOCKED',
    loginAttempts: 5,
    createdAt: '2024-05-01T00:00:00Z',
  },
];

// Mock Plants
export const mockPlants: Plant[] = [
  {
    id: '1',
    name: 'North Valley Farm',
    code: 'NVF',
    type: 'OYSTER',
    location: 'North Valley Region',
    address: '1234 Farm Road',
    city: 'North Valley',
    state: 'CA',
    latitude: 38.5,
    longitude: -121.5,
    sizeSqft: 50000,
    status: 'ACTIVE',
    roomsCount: 24,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'South Ridge Facility',
    code: 'SRF',
    type: 'BUTTON',
    location: 'South Ridge Industrial Park',
    address: '5678 Industrial Blvd',
    city: 'South Ridge',
    state: 'CA',
    latitude: 37.8,
    longitude: -122.2,
    sizeSqft: 35000,
    status: 'ACTIVE',
    roomsCount: 16,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2024-06-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Eastwood Mushroom Center',
    code: 'EMC',
    type: 'SHIITAKE',
    location: 'Eastwood Agricultural Zone',
    address: '9012 Agri Way',
    city: 'Eastwood',
    state: 'CA',
    latitude: 39.2,
    longitude: -120.8,
    sizeSqft: 42000,
    status: 'ACTIVE',
    roomsCount: 20,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-07-01T00:00:00Z',
  },
];

// Mock Rooms
export const mockRooms: Room[] = [
  // North Valley Farm Rooms
  { id: '1', name: 'Spawn Room A1', code: 'NVF-A1', plantId: '1', plantName: 'North Valley Farm', roomType: 'SPAWN_RUN', sizeSqft: 800, racks: 10, bags: 100, bagsPerRack: 10, floorNumber: 1, deviceId: '1', deviceName: 'Device-001', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '2', name: 'Spawn Room A2', code: 'NVF-A2', plantId: '1', plantName: 'North Valley Farm', roomType: 'SPAWN_RUN', sizeSqft: 800, racks: 10, bags: 100, bagsPerRack: 10, floorNumber: 1, deviceId: '2', deviceName: 'Device-002', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '3', name: 'Incubation B1', code: 'NVF-B1', plantId: '1', plantName: 'North Valley Farm', roomType: 'INCUBATION', sizeSqft: 1000, racks: 12, bags: 120, bagsPerRack: 10, floorNumber: 1, deviceId: '3', deviceName: 'Device-003', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '4', name: 'Incubation B2', code: 'NVF-B2', plantId: '1', plantName: 'North Valley Farm', roomType: 'INCUBATION', sizeSqft: 1000, racks: 12, bags: 120, bagsPerRack: 10, floorNumber: 1, deviceId: '4', deviceName: 'Device-004', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '5', name: 'Fruiting C1', code: 'NVF-C1', plantId: '1', plantName: 'North Valley Farm', roomType: 'FRUITING', sizeSqft: 1200, racks: 15, bags: 150, bagsPerRack: 10, floorNumber: 1, deviceId: '5', deviceName: 'Device-005', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '6', name: 'Fruiting C2', code: 'NVF-C2', plantId: '1', plantName: 'North Valley Farm', roomType: 'FRUITING', sizeSqft: 1200, racks: 15, bags: 150, bagsPerRack: 10, floorNumber: 1, deviceId: '6', deviceName: 'Device-006', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '7', name: 'Fruiting C3', code: 'NVF-C3', plantId: '1', plantName: 'North Valley Farm', roomType: 'FRUITING', sizeSqft: 1200, racks: 15, bags: 150, bagsPerRack: 10, floorNumber: 1, deviceId: '7', deviceName: 'Device-007', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  { id: '8', name: 'Storage D1', code: 'NVF-D1', plantId: '1', plantName: 'North Valley Farm', roomType: 'STORAGE', sizeSqft: 600, racks: 8, bags: 80, bagsPerRack: 10, floorNumber: 1, deviceId: '8', deviceName: 'Device-008', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-06-01T00:00:00Z' },
  
  // South Ridge Facility Rooms
  { id: '9', name: 'Spawn Room A1', code: 'SRF-A1', plantId: '2', plantName: 'South Ridge Facility', roomType: 'SPAWN_RUN', sizeSqft: 700, racks: 8, bags: 80, bagsPerRack: 10, floorNumber: 1, deviceId: '9', deviceName: 'Device-009', status: 'ACTIVE', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' },
  { id: '10', name: 'Incubation B1', code: 'SRF-B1', plantId: '2', plantName: 'South Ridge Facility', roomType: 'INCUBATION', sizeSqft: 900, racks: 10, bags: 100, bagsPerRack: 10, floorNumber: 1, deviceId: '10', deviceName: 'Device-010', status: 'ACTIVE', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' },
  { id: '11', name: 'Fruiting C1', code: 'SRF-C1', plantId: '2', plantName: 'South Ridge Facility', roomType: 'FRUITING', sizeSqft: 1100, racks: 14, bags: 140, bagsPerRack: 10, floorNumber: 1, deviceId: '11', deviceName: 'Device-011', status: 'ACTIVE', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' },
  { id: '12', name: 'Fruiting C2', code: 'SRF-C2', plantId: '2', plantName: 'South Ridge Facility', roomType: 'FRUITING', sizeSqft: 1100, racks: 14, bags: 140, bagsPerRack: 10, floorNumber: 1, deviceId: '12', deviceName: 'Device-012', status: 'ACTIVE', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-06-15T00:00:00Z' },
  
  // Eastwood Mushroom Center Rooms
  { id: '13', name: 'Spawn Room A1', code: 'EMC-A1', plantId: '3', plantName: 'Eastwood Mushroom Center', roomType: 'SPAWN_RUN', sizeSqft: 750, racks: 9, bags: 90, bagsPerRack: 10, floorNumber: 1, deviceId: '13', deviceName: 'Device-013', status: 'ACTIVE', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' },
  { id: '14', name: 'Spawn Room A2', code: 'EMC-A2', plantId: '3', plantName: 'Eastwood Mushroom Center', roomType: 'SPAWN_RUN', sizeSqft: 750, racks: 9, bags: 90, bagsPerRack: 10, floorNumber: 1, deviceId: '14', deviceName: 'Device-014', status: 'ACTIVE', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' },
  { id: '15', name: 'Incubation B1', code: 'EMC-B1', plantId: '3', plantName: 'Eastwood Mushroom Center', roomType: 'INCUBATION', sizeSqft: 950, racks: 11, bags: 110, bagsPerRack: 10, floorNumber: 1, deviceId: '15', deviceName: 'Device-015', status: 'ACTIVE', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' },
  { id: '16', name: 'Fruiting C1', code: 'EMC-C1', plantId: '3', plantName: 'Eastwood Mushroom Center', roomType: 'FRUITING', sizeSqft: 1150, racks: 14, bags: 140, bagsPerRack: 10, floorNumber: 1, deviceId: '16', deviceName: 'Device-016', status: 'ACTIVE', createdAt: '2024-03-01T00:00:00Z', updatedAt: '2024-07-01T00:00:00Z' },
];

// Mock Devices
export const mockDevices: Device[] = Array.from({ length: 16 }, (_, i) => ({
  id: `${i + 1}`,
  name: `Device-${String(i + 1).padStart(3, '0')}`,
  macAddress: `AA:BB:CC:DD:EE:${String(i + 1).padStart(2, '0')}`,
  type: 'ESP32' as const,
  firmwareVersion: '2.1.4',
  hardwareVersion: '1.2',
  assignedRoomId: `${i + 1}`,
  assignedRoomName: mockRooms[i]?.name || '',
  licenseKey: `LIC-${String.fromCharCode(65 + i)}3F7-K9M2-P5X${i}`,
  subscriptionStatus: 'ACTIVE' as const,
  communicationMode: 'MQTT' as const,
  onlineStatus: (i === 15 ? 'OFFLINE' : 'ONLINE') as 'ONLINE' | 'OFFLINE',
  lastSeen: i === 15 ? new Date(Date.now() - 3600000).toISOString() : new Date().toISOString(),
  wifiSignal: -45 - Math.floor(Math.random() * 30),
  freeHeap: 150000 + Math.floor(Math.random() * 50000),
  ipAddress: `192.168.1.${100 + i}`,
  uptime: 86400 * (1 + Math.floor(Math.random() * 7)),
  registeredAt: '2024-01-01T00:00:00Z',
}));

// Default Thresholds
export const defaultThresholds: RoomThresholds = {
  roomId: '',
  co2: { min: 1200, max: 1300, hysteresis: 100 },
  temperature: { min: 16, max: 17, hysteresis: 1 },
  humidity: { min: 87.5, max: 90, hysteresis: 2.5 },
};

// Generate Mock Sensor Reading
export function generateMockSensorReading(roomId: string, deviceId: string): SensorReading {
  const room = mockRooms.find(r => r.id === roomId);
  const isFruiting = room?.roomType === 'FRUITING';
  const isIncubation = room?.roomType === 'INCUBATION';
  
  // Generate CO2 based on room type
  let co2Base = isFruiting ? 1250 : isIncubation ? 1000 : 800;
  const co2 = co2Base + Math.floor(Math.random() * 200) - 100;
  
  // Generate temperature
  let tempBase = isFruiting ? 17 : isIncubation ? 22 : 20;
  const temperature = tempBase + (Math.random() * 2 - 1);
  
  // Generate humidity
  let humidityBase = isFruiting ? 88.5 : isIncubation ? 75 : 70;
  const humidity = humidityBase + (Math.random() * 4 - 2);
  
  // Generate bag temperatures
  const bagTemperatures = Array.from({ length: 10 }, (_, i) => ({
    bagId: i + 1,
    temperature: temperature + (Math.random() * 1 - 0.5),
    timestamp: new Date().toISOString(),
  }));
  
  return {
    id: Math.random().toString(36).substring(7),
    roomId,
    deviceId,
    co2,
    temperature: parseFloat(temperature.toFixed(1)),
    humidity: parseFloat(humidity.toFixed(1)),
    bagTemperatures,
    outdoorTemperature: 22.3,
    outdoorHumidity: 65,
    relayStates: {
      co2: Math.random() > 0.5 ? 'ON' : 'OFF',
      humidity: Math.random() > 0.3 ? 'ON' : 'OFF',
      temperature: Math.random() > 0.4 ? 'ON' : 'OFF',
    },
    timestamp: new Date().toISOString(),
  };
}

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: '1',
    severity: 'CRITICAL',
    type: 'CO2_HIGH',
    roomId: '5',
    roomName: 'Fruiting C1',
    deviceId: '5',
    deviceName: 'Device-005',
    message: 'CO2 1450 ppm exceeds max 1300 ppm',
    currentValue: 1450,
    thresholdValue: 1300,
    unit: 'ppm',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: '2',
    severity: 'WARNING',
    type: 'HUMIDITY_LOW',
    roomId: '6',
    roomName: 'Fruiting C2',
    deviceId: '6',
    deviceName: 'Device-006',
    message: 'Humidity 85% below min 87.5%',
    currentValue: 85,
    thresholdValue: 87.5,
    unit: '%',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 720000).toISOString(),
  },
  {
    id: '3',
    severity: 'INFO',
    type: 'DEVICE_OFFLINE',
    roomId: '16',
    roomName: 'Fruiting C1',
    deviceId: '16',
    deviceName: 'Device-016',
    message: 'Device-016 went offline',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '4',
    severity: 'WARNING',
    type: 'TEMP_LOW',
    roomId: '3',
    roomName: 'Incubation B1',
    deviceId: '3',
    deviceName: 'Device-003',
    message: 'Temperature 15.2°C below min 16°C',
    currentValue: 15.2,
    thresholdValue: 16,
    unit: '°C',
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'operator1',
    acknowledgedAt: new Date(Date.now() - 1800000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '5',
    severity: 'CRITICAL',
    type: 'SENSOR_ERROR',
    roomId: '4',
    roomName: 'Incubation B2',
    deviceId: '4',
    deviceName: 'Device-004',
    message: 'CO2 sensor communication error',
    status: 'RESOLVED',
    acknowledgedBy: 'manager1',
    acknowledgedAt: new Date(Date.now() - 7200000).toISOString(),
    resolvedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

// Mock Reports
export const mockReports: Report[] = [
  {
    id: '1',
    name: 'Daily Report - North Valley Farm',
    type: 'DAILY',
    format: 'PDF',
    plantId: '1',
    plantName: 'North Valley Farm',
    dateFrom: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    fileSize: '2.4 MB',
    generatedBy: 'admin',
    generatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    name: 'Weekly Summary - All Plants',
    type: 'WEEKLY',
    format: 'EXCEL',
    dateFrom: new Date(Date.now() - 604800000).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    fileSize: '5.1 MB',
    generatedBy: 'manager1',
    generatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '3',
    name: 'Monthly Analysis - March 2026',
    type: 'MONTHLY',
    format: 'CSV',
    dateFrom: '2026-03-01',
    dateTo: '2026-03-31',
    fileSize: '12.8 MB',
    generatedBy: 'admin',
    generatedAt: new Date(Date.now() - 604800000).toISOString(),
  },
];

// Generate Historical Data
export function generateHistoricalData(roomId: string, hours: number = 24): HistoricalDataPoint[] {
  const data: HistoricalDataPoint[] = [];
  const room = mockRooms.find(r => r.id === roomId);
  const isFruiting = room?.roomType === 'FRUITING';
  const isIncubation = room?.roomType === 'INCUBATION';
  
  const now = Date.now();
  const interval = (hours * 3600000) / 24; // 24 data points
  
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now - i * interval).toISOString();
    
    let co2Base = isFruiting ? 1250 : isIncubation ? 1000 : 800;
    const co2 = co2Base + Math.floor(Math.random() * 200) - 100;
    
    let tempBase = isFruiting ? 17 : isIncubation ? 22 : 20;
    const temperature = tempBase + (Math.random() * 2 - 1);
    
    let humidityBase = isFruiting ? 88.5 : isIncubation ? 75 : 70;
    const humidity = humidityBase + (Math.random() * 4 - 2);
    
    data.push({
      timestamp,
      co2,
      temperature: parseFloat(temperature.toFixed(1)),
      humidity: parseFloat(humidity.toFixed(1)),
    });
  }
  
  return data;
}

// Initialize Thresholds for all rooms
export function initializeThresholds(): Map<string, RoomThresholds> {
  const thresholds = new Map<string, RoomThresholds>();
  mockRooms.forEach(room => {
    thresholds.set(room.id, {
      ...defaultThresholds,
      roomId: room.id,
    });
  });
  return thresholds;
}

// Initialize Sensor Readings for all rooms
export function initializeSensorReadings(): Map<string, SensorReading> {
  const readings = new Map<string, SensorReading>();
  mockRooms.forEach(room => {
    if (room.deviceId) {
      readings.set(room.id, generateMockSensorReading(room.id, room.deviceId));
    }
  });
  return readings;
}
