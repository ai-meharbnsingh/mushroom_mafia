import { APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3800/api/v1';

/**
 * Get a JWT token for API calls.
 */
export async function getAuthToken(
  request: APIRequestContext,
  username = 'admin',
  password = 'admin123',
): Promise<string> {
  const res = await request.post(`${API_BASE}/auth/login`, {
    data: { username, password },
  });
  const data = await res.json();
  return data.access_token;
}

/**
 * Create a plant via API.
 */
export async function createPlant(
  request: APIRequestContext,
  token: string,
  plant: {
    plant_name: string;
    plant_code: string;
    plant_type: string;
    location?: string;
    city?: string;
    state?: string;
    plant_size_sqft?: number;
    no_of_rooms?: number;
    owner_id?: number;
  },
) {
  const res = await request.post(`${API_BASE}/plants/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { owner_id: 1, ...plant },
  });
  if (res.ok()) return res.json();
  // Plant may already exist — find it by code
  const all = await request.get(`${API_BASE}/plants/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const plants = await all.json();
  const existing = plants.find((p: any) => p.plant_code === plant.plant_code);
  if (existing) return existing;
  // Re-throw the original error
  return res.json();
}

/**
 * Create a room via API.
 */
export async function createRoom(
  request: APIRequestContext,
  token: string,
  room: {
    plant_id: number;
    room_name: string;
    room_code: string;
    room_type: string;
    room_size_sqft?: number;
    no_of_racks?: number;
    no_of_bags?: number;
    bags_per_rack?: number;
    floor_number?: number;
  },
) {
  const res = await request.post(`${API_BASE}/rooms/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: room,
  });
  if (res.ok()) return res.json();
  // Room may already exist — find it by code
  const all = await request.get(`${API_BASE}/rooms/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const rooms = await all.json();
  const existing = rooms.find((r: any) => r.room_code === room.room_code);
  if (existing) return existing;
  return res.json();
}

/**
 * Provision a device via API (creates it in DB with license key).
 */
export async function provisionDevice(
  request: APIRequestContext,
  token: string,
  device: {
    mac_address: string;
    device_name: string;
    device_type?: string;
  },
) {
  const res = await request.post(`${API_BASE}/devices/provision`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { device_type: 'ESP32', ...device },
  });
  if (res.ok()) return res.json();
  // Device may already exist — find by MAC
  const all = await request.get(`${API_BASE}/devices/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const devices = await all.json();
  const existing = devices.find((d: any) => d.mac_address === device.mac_address);
  if (existing) return existing;
  return res.json();
}

/**
 * Register a device (simulates ESP32 calling /device/register).
 */
export async function registerDevice(
  request: APIRequestContext,
  data: {
    license_key: string;
    mac_address: string;
    firmware_version: string;
    hardware_version?: string;
  },
) {
  const res = await request.post(`${API_BASE}/device/register`, {
    data: { hardware_version: 'v1.0', ...data },
  });
  return res.json();
}

/**
 * Assign a device to a plant via API.
 */
export async function assignDeviceToPlant(
  request: APIRequestContext,
  token: string,
  deviceId: number,
  plantId: number,
) {
  const res = await request.post(`${API_BASE}/devices/${deviceId}/assign`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { plant_id: plantId },
  });
  return res.json();
}

/**
 * Assign a device to a room via API (update device with room_id).
 */
export async function assignDeviceToRoom(
  request: APIRequestContext,
  token: string,
  deviceId: number,
  roomId: number,
) {
  const res = await request.put(`${API_BASE}/devices/${deviceId}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { room_id: roomId },
  });
  return res.json();
}

/**
 * Submit a sensor reading via API (simulates ESP32 POST /device/readings).
 * Requires device_id and license_key in headers.
 */
export async function submitReading(
  request: APIRequestContext,
  deviceId: number,
  licenseKey: string,
  reading: {
    co2_ppm?: number;
    room_temp?: number;
    room_humidity?: number;
    bag_temps?: number[];
    outdoor_temp?: number;
    outdoor_humidity?: number;
    relay_states?: Record<string, boolean>;
  },
) {
  const res = await request.post(`${API_BASE}/device/readings`, {
    headers: {
      'X-Device-Id': String(deviceId),
      'X-Device-Key': licenseKey,
    },
    data: reading,
  });
  return res.json();
}

/**
 * Create a user via API.
 */
export async function createUser(
  request: APIRequestContext,
  token: string,
  user: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    role: string;
    mobile?: string;
    owner_id?: number;
    assigned_plants?: number[];
  },
) {
  const res = await request.post(`${API_BASE}/users/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { owner_id: 1, ...user },
  });
  return res.json();
}

/**
 * Get all devices via API.
 */
export async function getDevices(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/devices/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/**
 * Get all plants via API.
 */
export async function getPlants(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/plants/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/**
 * Get all rooms via API.
 */
export async function getRooms(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/rooms/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/**
 * Get all alerts via API.
 */
export async function getAlerts(request: APIRequestContext, token: string) {
  const res = await request.get(`${API_BASE}/alerts/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
