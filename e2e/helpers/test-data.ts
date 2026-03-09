/**
 * Test data constants for the mushroom farm E2E tests.
 *
 * 5 Plants, 33 Rooms (varying types), 33 Devices (1 per room).
 */

// ---------- PLANTS ----------
export interface TestPlant {
  plant_name: string;
  plant_code: string;
  plant_type: string;
  location: string;
  city: string;
  state: string;
  plant_size_sqft: number;
  no_of_rooms: number;
}

export const TEST_PLANTS: TestPlant[] = [
  {
    plant_name: 'Napa Valley Farm',
    plant_code: 'NVF',
    plant_type: 'OYSTER',
    location: 'Napa Valley Industrial Park',
    city: 'Napa',
    state: 'CA',
    plant_size_sqft: 12000,
    no_of_rooms: 7,
  },
  {
    plant_name: 'Sierra Ridge Farm',
    plant_code: 'SRF',
    plant_type: 'BUTTON',
    location: 'Sierra Ridge Complex',
    city: 'Reno',
    state: 'NV',
    plant_size_sqft: 9500,
    no_of_rooms: 6,
  },
  {
    plant_name: 'Emerald Mushroom Farm',
    plant_code: 'EMF',
    plant_type: 'SHIITAKE',
    location: 'Emerald Valley Road',
    city: 'Portland',
    state: 'OR',
    plant_size_sqft: 14000,
    no_of_rooms: 7,
  },
  {
    plant_name: 'Willow Lake Farm',
    plant_code: 'WLF',
    plant_type: 'MIXED',
    location: 'Willow Lake Business Park',
    city: 'Bend',
    state: 'OR',
    plant_size_sqft: 8000,
    no_of_rooms: 6,
  },
  {
    plant_name: 'Coastal Pearl Farm',
    plant_code: 'CPF',
    plant_type: 'OYSTER',
    location: 'Coastal Pearl Drive',
    city: 'Eureka',
    state: 'CA',
    plant_size_sqft: 11000,
    no_of_rooms: 7,
  },
];

// ---------- ROOM TYPES ----------
const ROOM_TYPES = ['FRUITING', 'SPAWN_RUN', 'INCUBATION', 'STORAGE'] as const;
type RoomType = (typeof ROOM_TYPES)[number];

// Distribution: mostly Fruiting, some Spawn Run, Incubation, and 1 Storage per plant
function getRoomType(index: number, total: number): RoomType {
  if (index === total - 1) return 'STORAGE';
  if (index === 0) return 'SPAWN_RUN';
  if (index === 1) return 'INCUBATION';
  return 'FRUITING';
}

// ---------- ROOMS ----------
export interface TestRoom {
  room_name: string;
  room_code: string;
  room_type: string;
  plant_code: string; // reference to look up plant_id at runtime
  room_size_sqft: number;
  no_of_racks: number;
  no_of_bags: number;
  bags_per_rack: number;
  floor_number: number;
}

export const TEST_ROOMS: TestRoom[] = [];

for (const plant of TEST_PLANTS) {
  for (let i = 0; i < plant.no_of_rooms; i++) {
    const letter = String.fromCharCode(65 + i); // A, B, C, ...
    const roomType = getRoomType(i, plant.no_of_rooms);
    TEST_ROOMS.push({
      room_name: `${plant.plant_name} Room ${letter}`,
      room_code: `${plant.plant_code}-${letter}${i + 1}`,
      room_type: roomType,
      plant_code: plant.plant_code,
      room_size_sqft: 800 + i * 200,
      no_of_racks: 8 + i,
      no_of_bags: (8 + i) * 10,
      bags_per_rack: 10,
      floor_number: i < 4 ? 1 : 2,
    });
  }
}

// ---------- DEVICES ----------
export interface TestDevice {
  mac_address: string;
  device_name: string;
  room_code: string; // reference to look up room_id at runtime
}

function generateMAC(index: number): string {
  const hex = (n: number) => n.toString(16).toUpperCase().padStart(2, '0');
  return `AA:BB:CC:${hex(Math.floor(index / 256))}:${hex(index % 256)}:${hex((index * 7 + 3) % 256)}`;
}

export const TEST_DEVICES: TestDevice[] = TEST_ROOMS.map((room, i) => ({
  mac_address: generateMAC(i + 1),
  device_name: `Sensor-${room.room_code}`,
  room_code: room.room_code,
}));

// ---------- SENSOR READING GENERATORS ----------
/**
 * Generate a realistic sensor reading for a mushroom grow room.
 */
export function generateReading(roomType: string) {
  const base = {
    FRUITING: { co2: 1200, temp: 16.5, humidity: 88 },
    SPAWN_RUN: { co2: 1000, temp: 24, humidity: 85 },
    INCUBATION: { co2: 900, temp: 22, humidity: 80 },
    STORAGE: { co2: 500, temp: 14, humidity: 70 },
  }[roomType] || { co2: 1100, temp: 18, humidity: 85 };

  const jitter = (val: number, range: number) =>
    Number((val + (Math.random() - 0.5) * range).toFixed(1));

  return {
    co2_ppm: jitter(base.co2, 200),
    room_temp: jitter(base.temp, 2),
    room_humidity: jitter(base.humidity, 6),
    bag_temps: Array.from({ length: 10 }, () => jitter(base.temp + 1, 3)),
    outdoor_temp: jitter(15, 5),
    outdoor_humidity: jitter(60, 10),
    relay_states: { co2: false, humidity: false, temperature: false },
  };
}

/**
 * Generate a reading with CO2 exceeding the max threshold to trigger an alert.
 */
export function generateHighCO2Reading() {
  return {
    co2_ppm: 1600,
    room_temp: 17,
    room_humidity: 88,
    bag_temps: Array.from({ length: 10 }, () => 18),
    outdoor_temp: 15,
    outdoor_humidity: 60,
    relay_states: { co2: true, humidity: false, temperature: false },
  };
}

// ---------- TEST USER ----------
export const TEST_USER = {
  username: 'e2e_operator',
  email: 'e2e_operator@mushroom.io',
  password: 'Test1234!',
  first_name: 'E2E',
  last_name: 'Operator',
  role: 'OPERATOR',
  mobile: '+1-555-0199',
};
