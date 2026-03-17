import type { Plant, Room, Device, Alert, User, Report, SensorReading, RoomThresholds, AdminDashboardSummary, PendingDevice, PlantDashboardSummary } from '@/types';

// --- Plant ---
export function mapPlant(p: any): Plant {
  return {
    id: String(p.plant_id ?? p.id),
    name: p.plant_name ?? p.name ?? '',
    code: p.plant_code ?? p.code ?? '',
    type: (p.plant_type ?? p.type ?? 'OYSTER').toUpperCase(),
    location: p.location ?? '',
    address: p.address,
    city: p.city ?? '',
    state: p.state ?? '',
    latitude: p.latitude,
    longitude: p.longitude,
    pincode: p.pincode ?? '',
    sizeSqft: p.plant_size_sqft ?? p.sizeSqft,
    status: p.is_active === false ? 'INACTIVE' : 'ACTIVE',
    roomsCount: p.no_of_rooms ?? p.roomsCount ?? 0,
    createdAt: p.created_at ?? p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updated_at ?? p.updatedAt ?? new Date().toISOString(),
  };
}

// --- Room ---
export function mapRoom(r: any, plants?: Plant[]): Room {
  const plantId = String(r.plant_id ?? r.plantId);
  const plant = plants?.find(p => p.id === plantId);
  return {
    id: String(r.room_id ?? r.id),
    name: r.room_name ?? r.name ?? '',
    code: r.room_code ?? r.code ?? '',
    plantId,
    plantName: r.plant_name ?? plant?.name ?? '',
    roomType: (r.room_type ?? r.roomType ?? 'FRUITING').toUpperCase(),
    sizeSqft: r.room_size_sqft ?? r.sizeSqft,
    racks: r.no_of_racks ?? r.racks ?? 0,
    bags: r.no_of_bags ?? r.bags ?? 0,
    bagsPerRack: r.bags_per_rack ?? r.bagsPerRack ?? 0,
    floorNumber: r.floor_number ?? r.floorNumber ?? 1,
    deviceId: r.device_id ? String(r.device_id) : r.deviceId,
    deviceName: r.device_name ?? r.deviceName,
    status: r.status ?? (r.is_active === false ? 'INACTIVE' : 'ACTIVE'),
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.updatedAt ?? new Date().toISOString(),
  };
}

// --- Device ---
export function mapDevice(d: any, rooms?: Room[]): Device {
  const roomId = d.room_id ? String(d.room_id) : d.assignedRoomId;
  const room = rooms?.find(r => r.id === roomId);
  return {
    id: String(d.device_id ?? d.id),
    name: d.device_name ?? d.name ?? '',
    macAddress: d.mac_address ?? d.macAddress ?? '',
    type: 'ESP32',
    firmwareVersion: d.firmware_version ?? d.firmwareVersion ?? '',
    hardwareVersion: d.hardware_version ?? d.hardwareVersion,
    assignedRoomId: roomId,
    assignedRoomName: d.room_name ?? room?.name,
    assignedPlantId: d.assigned_to_plant_id ? String(d.assigned_to_plant_id) : d.assignedPlantId,
    assignedPlantName: d.plant_name ?? d.assignedPlantName,
    licenseKey: d.license_key ?? d.licenseKey ?? '',
    subscriptionStatus: (d.subscription_status ?? d.subscriptionStatus ?? 'PENDING').toUpperCase(),
    communicationMode: (d.communication_mode ?? d.communicationMode ?? 'HTTP').toUpperCase(),
    onlineStatus: d.is_online ? 'ONLINE' : 'OFFLINE',
    lastSeen: d.last_seen ?? d.lastSeen,
    wifiSignal: d.wifi_rssi ?? d.wifiSignal ?? -70,
    freeHeap: d.free_heap ?? d.freeHeap ?? 0,
    ipAddress: d.device_ip ?? d.ipAddress,
    uptime: d.uptime_seconds ?? d.uptime ?? 0,
    registeredAt: d.registered_at ?? d.registeredAt ?? new Date().toISOString(),
  };
}

// --- Alert ---
export function mapAlert(a: any, rooms?: Room[], devices?: Device[]): Alert {
  const roomId = String(a.room_id ?? a.roomId ?? '');
  const deviceId = a.device_id ? String(a.device_id) : a.deviceId;
  const room = rooms?.find(r => r.id === roomId);
  const device = devices?.find(d => d.id === deviceId);

  let status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' = 'ACTIVE';
  if (a.is_resolved || a.status === 'RESOLVED') status = 'RESOLVED';
  else if (a.is_read || a.acknowledged_at || a.status === 'ACKNOWLEDGED') status = 'ACKNOWLEDGED';

  return {
    id: String(a.alert_id ?? a.id),
    severity: (a.severity ?? 'INFO').toUpperCase(),
    type: (a.alert_type ?? a.type ?? 'SENSOR_ERROR').toUpperCase(),
    roomId,
    roomName: a.room_name ?? room?.name ?? '',
    deviceId,
    deviceName: a.device_name ?? device?.name,
    message: a.message ?? '',
    currentValue: a.current_value ?? a.currentValue,
    thresholdValue: a.threshold_value ?? a.thresholdValue,
    unit: a.unit ?? a.parameter,
    status,
    acknowledgedBy: a.acknowledged_by ? String(a.acknowledged_by) : a.acknowledgedBy,
    acknowledgedAt: a.acknowledged_at ?? a.acknowledgedAt,
    resolvedAt: a.resolved_at ?? a.resolvedAt,
    createdAt: a.created_at ?? a.createdAt ?? new Date().toISOString(),
  };
}

// --- User ---
export function mapUser(u: any): User {
  return {
    id: String(u.user_id ?? u.id),
    username: u.username ?? '',
    email: u.email ?? '',
    firstName: u.first_name ?? u.firstName ?? '',
    lastName: u.last_name ?? u.lastName ?? '',
    mobile: u.mobile,
    role: (u.role ?? 'VIEWER').toUpperCase(),
    assignedPlants: (u.assigned_plants ?? u.assignedPlants ?? []).map(String),
    lastLogin: u.last_login ?? u.lastLogin,
    status: u.is_active === false ? 'LOCKED' : 'ACTIVE',
    loginAttempts: u.login_attempts ?? u.loginAttempts ?? 0,
    createdAt: u.created_at ?? u.createdAt ?? new Date().toISOString(),
  };
}

// --- Report ---
export function mapReport(r: any): Report {
  // file_size comes from backend as an integer (bytes) -- format it for display
  const rawSize = r.file_size ?? r.fileSize;
  let fileSize = '';
  if (typeof rawSize === 'number' && rawSize > 0) {
    if (rawSize >= 1048576) {
      fileSize = `${(rawSize / 1048576).toFixed(1)} MB`;
    } else if (rawSize >= 1024) {
      fileSize = `${(rawSize / 1024).toFixed(1)} KB`;
    } else {
      fileSize = `${rawSize} B`;
    }
  } else if (typeof rawSize === 'string') {
    fileSize = rawSize;
  }

  return {
    id: String(r.report_id ?? r.id),
    name: r.report_name ?? r.name ?? '',
    type: (r.report_type ?? r.type ?? 'DAILY').toUpperCase(),
    format: (r.report_format ?? r.format ?? 'CSV').toUpperCase(),
    plantId: r.plant_id ? String(r.plant_id) : r.plantId,
    plantName: r.plant_name ?? r.plantName,
    dateFrom: r.date_from ?? r.dateFrom ?? '',
    dateTo: r.date_to ?? r.dateTo ?? '',
    fileSize,
    filePath: r.file_path ?? r.filePath,
    generatedBy: r.generated_by ? String(r.generated_by) : (r.generatedBy ?? ''),
    generatedAt: r.generated_at ?? r.generatedAt ?? new Date().toISOString(),
    fileUrl: r.file_url ?? r.fileUrl,
  };
}

// --- Sensor Reading (from live endpoint) ---
export function mapSensorReading(data: any): SensorReading {
  return {
    id: String(data.reading_id ?? data.id ?? ''),
    roomId: String(data.room_id ?? data.roomId ?? ''),
    deviceId: String(data.device_id ?? data.deviceId ?? ''),
    co2: data.co2_ppm ?? data.co2 ?? 0,
    temperature: data.room_temp ?? data.temperature ?? 0,
    humidity: data.room_humidity ?? data.humidity ?? 0,
    bagTemperatures: (data.bag_temps ?? data.bagTemperatures ?? []).map((t: any, i: number) =>
      typeof t === 'number'
        ? { bagId: i + 1, temperature: t, timestamp: data.timestamp ?? new Date().toISOString() }
        : t
    ),
    outdoorTemperature: data.outdoor_temp ?? data.outdoorTemperature,
    outdoorHumidity: data.outdoor_humidity ?? data.outdoorHumidity,
    relayStates: {
      co2: data.relay_states?.co2 === true || data.relayStates?.co2 === 'ON' ? 'ON' : 'OFF',
      humidity: data.relay_states?.humidity === true || data.relayStates?.humidity === 'ON' ? 'ON' : 'OFF',
      temperature: data.relay_states?.temperature === true || data.relayStates?.temperature === 'ON' ? 'ON' : 'OFF',
      ahu: data.relay_states?.ahu === true || data.relayStates?.ahu === 'ON' ? 'ON' : 'OFF',
      humidifier: data.relay_states?.humidifier === true || data.relayStates?.humidifier === 'ON' ? 'ON' : 'OFF',
      duct_fan: data.relay_states?.duct_fan === true || data.relayStates?.duct_fan === 'ON' ? 'ON' : 'OFF',
      extra: data.relay_states?.extra === true || data.relayStates?.extra === 'ON' ? 'ON' : 'OFF',
    },
    timestamp: data.timestamp ?? new Date().toISOString(),
  };
}

// --- Threshold (from backend array → frontend RoomThresholds) ---
export function mapThresholds(roomId: string, thresholds: any[]): RoomThresholds {
  const result: RoomThresholds = {
    roomId,
    co2: { min: 1200, max: 1300, hysteresis: 100 },
    temperature: { min: 16, max: 17, hysteresis: 1 },
    humidity: { min: 87.5, max: 90, hysteresis: 2.5 },
  };

  for (const t of thresholds) {
    const param = (t.parameter ?? '').toLowerCase();
    if (param === 'co2') {
      result.co2 = { min: t.min_value, max: t.max_value, hysteresis: t.hysteresis ?? 100 };
    } else if (param === 'temperature') {
      result.temperature = { min: t.min_value, max: t.max_value, hysteresis: t.hysteresis ?? 1 };
    } else if (param === 'humidity') {
      result.humidity = { min: t.min_value, max: t.max_value, hysteresis: t.hysteresis ?? 2.5 };
    }
  }

  return result;
}

// --- Admin Dashboard Summary ---
export function mapAdminDashboardSummary(data: any): AdminDashboardSummary {
  return {
    totalPlants: data.total_plants ?? 0,
    totalRooms: data.total_rooms ?? 0,
    totalDevices: data.total_devices ?? 0,
    totalUsers: data.total_users ?? 0,
    deviceStatus: {
      total: data.device_status?.total ?? 0,
      online: data.device_status?.online ?? 0,
      offline: data.device_status?.offline ?? 0,
      unassigned: data.device_status?.unassigned ?? 0,
    },
    subscriptions: {
      active: data.subscriptions?.active ?? 0,
      pending: data.subscriptions?.pending ?? 0,
      suspended: data.subscriptions?.suspended ?? 0,
      expired: data.subscriptions?.expired ?? 0,
    },
    roomTypes: {
      fruiting: data.room_types?.fruiting ?? 0,
      spawnRun: data.room_types?.spawn_run ?? 0,
      incubation: data.room_types?.incubation ?? 0,
      storage: data.room_types?.storage ?? 0,
    },
    alerts: {
      active: data.alerts?.active ?? 0,
      critical: data.alerts?.critical ?? 0,
      warning: data.alerts?.warning ?? 0,
      acknowledged: data.alerts?.acknowledged ?? 0,
      resolvedToday: data.alerts?.resolved_today ?? 0,
    },
    plants: (data.plants ?? []).map((p: any) => ({
      plantId: String(p.plant_id),
      plantName: p.plant_name ?? '',
      plantCode: p.plant_code ?? '',
      plantType: p.plant_type ?? '',
      totalRooms: p.total_rooms ?? 0,
      totalDevices: p.total_devices ?? 0,
      onlineDevices: p.online_devices ?? 0,
      activeAlerts: p.active_alerts ?? 0,
      monthYieldKg: p.month_yield_kg ?? 0,
      monthHarvests: p.month_harvests ?? 0,
    })),
    recentEvents: (data.recent_events ?? []).map((e: any) => ({
      deviceId: String(e.device_id),
      deviceName: e.device_name ?? '',
      event: e.event ?? '',
      timestamp: e.timestamp ?? '',
    })),
    overallYieldKg: data.overall_yield_kg ?? 0,
    overallHarvests: data.overall_harvests ?? 0,
    overallGradeA: data.overall_grade_a ?? 0,
    overallGradeB: data.overall_grade_b ?? 0,
    overallGradeC: data.overall_grade_c ?? 0,
  };
}

// --- Reverse mappers (frontend → backend for create/update) ---
export function toPlantCreate(data: any, ownerId: number = 1) {
  const payload: any = {
    owner_id: ownerId,
    plant_name: data.name,
    plant_type: data.type,
    location: data.location,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    latitude: data.latitude,
    longitude: data.longitude,
    plant_size_sqft: data.sizeSqft,
  };
  if (data.adminUserId) {
    payload.admin_user_id = Number(data.adminUserId);
  } else if (data.newAdmin) {
    payload.new_admin = {
      username: data.newAdmin.username,
      email: data.newAdmin.email,
      password: data.newAdmin.password,
      first_name: data.newAdmin.firstName,
      last_name: data.newAdmin.lastName,
      mobile: data.newAdmin.mobile,
    };
  }
  return payload;
}

export function toPlantUpdate(data: any) {
  return {
    plant_name: data.name,
    plant_type: data.type,
    location: data.location,
    address: data.address,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    latitude: data.latitude,
    longitude: data.longitude,
    plant_size_sqft: data.sizeSqft,
  };
}

// --- Plant Dashboard Summary ---
export function mapPlantDashboardSummary(data: any): PlantDashboardSummary {
  return {
    plantId: String(data.plant_id),
    plantName: data.plant_name ?? '',
    plantCode: data.plant_code ?? '',
    plantType: data.plant_type ?? '',
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    totalRooms: data.total_rooms ?? 0,
    totalDevices: data.total_devices ?? 0,
    onlineDevices: data.online_devices ?? 0,
    activeAlerts: data.active_alerts ?? 0,
    criticalAlerts: data.critical_alerts ?? 0,
    monthYieldKg: data.month_yield_kg ?? 0,
    monthHarvests: data.month_harvests ?? 0,
    monthGradeA: data.month_grade_a ?? 0,
    monthGradeB: data.month_grade_b ?? 0,
    monthGradeC: data.month_grade_c ?? 0,
    rooms: (data.rooms ?? []).map((r: any) => ({
      roomId: String(r.room_id),
      roomName: r.room_name ?? '',
      roomCode: r.room_code ?? '',
      roomType: r.room_type ?? '',
      status: r.status ?? 'ACTIVE',
      hasDevice: r.has_device ?? false,
      deviceName: r.device_name,
      deviceId: r.device_id,
      isOnline: r.is_online ?? false,
      co2Ppm: r.co2_ppm,
      roomTemp: r.room_temp,
      roomHumidity: r.room_humidity,
      bagTemps: r.bag_temps ?? [],
      lastReadingAt: r.last_reading_at,
      monthYieldKg: r.month_yield_kg ?? 0,
      monthHarvests: r.month_harvests ?? 0,
      gradeA: r.grade_a ?? 0,
      gradeB: r.grade_b ?? 0,
      gradeC: r.grade_c ?? 0,
      growthStage: r.growth_stage,
      daysInStage: r.days_in_stage,
      activeAlerts: r.active_alerts ?? 0,
    })),
  };
}

export function toRoomCreate(data: any) {
  return {
    plant_id: Number(data.plantId),
    room_name: data.name,
    room_type: data.roomType,
    room_size_sqft: data.sizeSqft,
    no_of_racks: data.racks,
    no_of_bags: data.bags,
    bags_per_rack: data.bagsPerRack,
    floor_number: data.floorNumber,
  };
}

export function toRoomUpdate(data: any) {
  return {
    room_name: data.name,
    room_type: data.roomType,
    room_size_sqft: data.sizeSqft,
    no_of_racks: data.racks,
    no_of_bags: data.bags,
    bags_per_rack: data.bagsPerRack,
    floor_number: data.floorNumber,
  };
}

export function toUserCreate(data: any, ownerId: number = 1) {
  return {
    owner_id: ownerId,
    username: data.username,
    email: data.email,
    password: data.password,
    first_name: data.firstName,
    last_name: data.lastName,
    mobile: data.mobile,
    role: data.role,
    assigned_plants: data.assignedPlants?.map(Number),
  };
}

export function toUserUpdate(data: any) {
  const payload: any = {
    username: data.username,
    email: data.email,
    first_name: data.firstName,
    last_name: data.lastName,
    mobile: data.mobile,
    role: data.role,
    assigned_plants: data.assignedPlants?.map(Number),
  };
  if (data.password) {
    payload.password = data.password;
  }
  return payload;
}

// --- Pending Device (from onboarding/approval flow) ---
export function mapPendingDevice(d: any): PendingDevice {
  return {
    deviceId: String(d.device_id ?? d.id ?? ''),
    name: d.device_name ?? d.name ?? '',
    licenseKey: d.license_key ?? d.licenseKey ?? '',
    macAddress: d.mac_address ?? d.macAddress ?? '',
    roomId: String(d.room_id ?? d.roomId ?? ''),
    roomName: d.room_name ?? d.roomName ?? '',
    linkedByUsername: d.linked_by_username ?? d.linkedByUsername ?? '',
    linkedAt: d.linked_at ?? d.linkedAt ?? new Date().toISOString(),
  };
}
