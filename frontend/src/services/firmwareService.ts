import api from './api';
import type { FirmwareVersion, OTADeviceStatus } from '@/types';

// Map snake_case API response to camelCase frontend types
const mapFirmwareVersion = (raw: any): FirmwareVersion => ({
  firmwareId: raw.firmware_id ?? raw.firmwareId,
  version: raw.version,
  checksumSha256: raw.checksum_sha256 ?? raw.checksumSha256,
  fileSize: raw.file_size ?? raw.fileSize,
  releaseNotes: raw.release_notes ?? raw.releaseNotes ?? null,
  createdAt: raw.created_at ?? raw.createdAt,
  isActive: raw.is_active ?? raw.isActive ?? false,
});

const mapOTADeviceStatus = (raw: any): OTADeviceStatus => ({
  deviceId: raw.device_id ?? raw.deviceId,
  deviceName: raw.device_name ?? raw.deviceName,
  firmwareVersion: raw.firmware_version ?? raw.firmwareVersion ?? null,
  otaStatus: raw.ota_status ?? raw.otaStatus ?? null,
  lastOtaAt: raw.last_ota_at ?? raw.lastOtaAt ?? null,
});

export const firmwareService = {
  uploadFirmware: async (
    file: File,
    version: string,
    releaseNotes?: string,
  ): Promise<FirmwareVersion> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    if (releaseNotes) {
      formData.append('release_notes', releaseNotes);
    }
    const res = await api.post('/firmware/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapFirmwareVersion(res.data);
  },

  getFirmwareList: async (): Promise<FirmwareVersion[]> => {
    const res = await api.get('/firmware');
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapFirmwareVersion);
  },

  getLatestFirmware: async (): Promise<FirmwareVersion> => {
    const res = await api.get('/firmware/latest');
    return mapFirmwareVersion(res.data);
  },

  triggerOTARollout: async (
    firmwareId: number,
    deviceIds: number[],
  ): Promise<void> => {
    await api.post('/firmware/ota/rollout', {
      firmware_id: firmwareId,
      device_ids: deviceIds,
    });
  },

  getOTAStatus: async (): Promise<OTADeviceStatus[]> => {
    const res = await api.get('/firmware/ota/status');
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapOTADeviceStatus);
  },
};
