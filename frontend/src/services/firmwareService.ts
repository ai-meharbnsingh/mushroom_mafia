import api from './api';
import type {
  FirmwareVersion,
  OTADeviceStatus,
  FirmwareFile,
  FirmwareFileLatest,
  OTARolloutResult,
} from '@/types';

// --- Mappers: snake_case API -> camelCase frontend ---

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

const mapFirmwareFile = (raw: any): FirmwareFile => ({
  id: raw.id,
  version: raw.version,
  filename: raw.filename,
  fileSize: raw.file_size ?? raw.fileSize,
  checksumSha256: raw.checksum_sha256 ?? raw.checksumSha256,
  boardType: raw.board_type ?? raw.boardType ?? 'ESP32',
  uploadNotes: raw.upload_notes ?? raw.uploadNotes ?? null,
  uploadedAt: raw.uploaded_at ?? raw.uploadedAt ?? null,
  isActive: raw.is_active ?? raw.isActive ?? false,
});

const mapFirmwareFileLatest = (raw: any): FirmwareFileLatest => ({
  version: raw.version,
  filename: raw.filename,
  fileSize: raw.file_size ?? raw.fileSize,
  checksumSha256: raw.checksum_sha256 ?? raw.checksumSha256,
  boardType: raw.board_type ?? raw.boardType ?? 'ESP32',
  uploadedAt: raw.uploaded_at ?? raw.uploadedAt ?? null,
});

const mapOTARolloutResult = (raw: any): OTARolloutResult => ({
  detail: raw.detail,
  firmwareVersion: raw.firmware_version ?? raw.firmwareVersion,
  totalDevices: raw.total_devices ?? raw.totalDevices,
  success: raw.success,
  failed: raw.failed,
  downloadUrl: raw.download_url ?? raw.downloadUrl,
});

// --- Service ---

export const firmwareService = {
  // =====================================================================
  // Firmware (disk-based, OTA delivery to devices)
  // =====================================================================

  /** Upload a .bin firmware file to disk storage (ADMIN+). */
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

  /** List all firmware versions (authenticated user). */
  getFirmwareList: async (): Promise<FirmwareVersion[]> => {
    const res = await api.get('/firmware/');
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapFirmwareVersion);
  },

  /** Trigger OTA rollout to devices via MQTT (ADMIN+). */
  triggerOTARollout: async (
    firmwareId: number,
    deviceIds: number[],
  ): Promise<OTARolloutResult> => {
    const res = await api.post('/firmware/rollout', {
      firmware_id: firmwareId,
      device_ids: deviceIds,
    });
    return mapOTARolloutResult(res.data);
  },

  /** Get OTA status for all active devices. */
  getOTAStatus: async (): Promise<OTADeviceStatus[]> => {
    const res = await api.get('/firmware/status');
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapOTADeviceStatus);
  },

  // =====================================================================
  // FirmwareFile (in-DB binary storage for Web Serial / browser flashing)
  // =====================================================================

  /** Upload a .bin firmware file to DB storage (ADMIN+). */
  uploadFirmwareFile: async (
    file: File,
    version: string,
    boardType?: string,
    notes?: string,
  ): Promise<FirmwareFile> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    if (boardType) {
      formData.append('board_type', boardType);
    }
    if (notes) {
      formData.append('notes', notes);
    }
    const res = await api.post('/firmware/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapFirmwareFile(res.data);
  },

  /** Get latest active firmware file metadata (no auth required). */
  getLatestFirmwareFile: async (): Promise<FirmwareFileLatest> => {
    const res = await api.get('/firmware/files/latest');
    return mapFirmwareFileLatest(res.data);
  },

  /**
   * Download latest active firmware .bin binary as ArrayBuffer.
   * Used by Web Serial flashing to get the raw bytes for esptool-js.
   */
  downloadLatestFirmwareBin: async (): Promise<{
    data: ArrayBuffer;
    version: string;
    checksum: string;
  }> => {
    const res = await api.get('/firmware/files/latest/bin', {
      responseType: 'arraybuffer',
    });
    return {
      data: res.data,
      version: res.headers['x-firmware-version'] || '',
      checksum: res.headers['x-checksum-sha256'] || '',
    };
  },

  /** List all firmware file versions (authenticated user). */
  listFirmwareFiles: async (): Promise<FirmwareFile[]> => {
    const res = await api.get('/firmware/files/versions');
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(mapFirmwareFile);
  },

  /** Download a specific firmware version .bin as ArrayBuffer. */
  downloadFirmwareFileBin: async (version: string): Promise<{
    data: ArrayBuffer;
    version: string;
    checksum: string;
  }> => {
    const res = await api.get(`/firmware/files/${version}/bin`, {
      responseType: 'arraybuffer',
    });
    return {
      data: res.data,
      version: res.headers['x-firmware-version'] || '',
      checksum: res.headers['x-checksum-sha256'] || '',
    };
  },

  /** Deactivate a firmware file version (ADMIN+). */
  deleteFirmwareFile: async (version: string): Promise<{ detail: string }> => {
    const res = await api.delete(`/firmware/files/${version}`);
    return res.data;
  },

  // =====================================================================
  // Convenience: unified "get latest" for the FlashDevice page
  // =====================================================================

  /**
   * Get the latest firmware metadata from the files/latest endpoint.
   * Falls back gracefully if no firmware is uploaded yet.
   * Used by FlashDevice page on mount.
   */
  getLatestFirmware: async (): Promise<FirmwareVersion | null> => {
    try {
      // Try the FirmwareFile endpoint first (no auth, works for Web Serial)
      const res = await api.get('/firmware/files/latest');
      const raw = res.data;
      return {
        firmwareId: raw.id ?? 0,
        version: raw.version,
        checksumSha256: raw.checksum_sha256 ?? raw.checksumSha256 ?? '',
        fileSize: raw.file_size ?? raw.fileSize ?? 0,
        releaseNotes: raw.upload_notes ?? raw.uploadNotes ?? null,
        createdAt: raw.uploaded_at ?? raw.uploadedAt ?? '',
        isActive: true,
      };
    } catch {
      // Fall back to the authenticated firmware list endpoint
      try {
        const res = await api.get('/firmware/');
        const data = Array.isArray(res.data) ? res.data : [];
        if (data.length === 0) return null;
        // Return the first (newest) active version
        const active = data.find((fw: any) => fw.is_active || fw.isActive) || data[0];
        return mapFirmwareVersion(active);
      } catch {
        return null;
      }
    }
  },
};
