import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  HardDrive,
  Upload,
  History,
  Rocket,
  Activity,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { firmwareService } from '@/services/firmwareService';
import type { FirmwareVersion, OTADeviceStatus } from '@/types';

// OTA status badge colors
const OtaStatusBadge: React.FC<{ status: string | null }> = ({ status }) => {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    idle: { bg: 'rgba(109, 116, 132, 0.15)', color: '#6D7484', label: 'Idle' },
    downloading: { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', label: 'Downloading' },
    updating: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166', label: 'Updating' },
    success: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B', label: 'Success' },
    failed: { bg: 'rgba(255, 45, 85, 0.15)', color: '#FF2D55', label: 'Failed' },
    rolled_back: { bg: 'rgba(255, 165, 0, 0.15)', color: '#FFA500', label: 'Rolled Back' },
  };
  const key = (status || 'idle').toLowerCase();
  const { bg, color, label } = config[key] || config.idle;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
};

export const FirmwareManagement: React.FC = () => {
  const { state } = useApp();
  const toast = useToast();
  const pageRef = useRef<HTMLDivElement>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVersion, setUploadVersion] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Firmware list state
  const [firmwareList, setFirmwareList] = useState<FirmwareVersion[]>([]);
  const [firmwareLoading, setFirmwareLoading] = useState(false);

  // OTA rollout state
  const [selectedFirmwareId, setSelectedFirmwareId] = useState<string>('');
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<number>>(new Set());
  const [rolloutLoading, setRolloutLoading] = useState(false);

  // OTA device status
  const [otaStatuses, setOtaStatuses] = useState<OTADeviceStatus[]>([]);
  const [otaStatusLoading, setOtaStatusLoading] = useState(false);

  // Animation
  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(
        pageRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power3.out' }
      );
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchFirmwareList();
    fetchOtaStatus();
  }, []);

  const fetchFirmwareList = async () => {
    setFirmwareLoading(true);
    try {
      const list = await firmwareService.getFirmwareList();
      setFirmwareList(list);
    } catch {
      // silently fail - endpoint may not exist yet
      setFirmwareList([]);
    } finally {
      setFirmwareLoading(false);
    }
  };

  const fetchOtaStatus = async () => {
    setOtaStatusLoading(true);
    try {
      const statuses = await firmwareService.getOTAStatus();
      setOtaStatuses(statuses);
    } catch {
      setOtaStatuses([]);
    } finally {
      setOtaStatusLoading(false);
    }
  };

  // Upload handler
  const handleUpload = async () => {
    if (!uploadFile || !uploadVersion.trim()) {
      toast.error('Please select a .bin file and enter a version');
      return;
    }
    setUploadLoading(true);
    setUploadProgress(0);

    // Simulate progress since we can't track multipart upload progress easily
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const firmware = await firmwareService.uploadFirmware(
        uploadFile,
        uploadVersion.trim(),
        uploadNotes.trim() || undefined,
      );
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success(`Firmware v${firmware.version} uploaded successfully`);
      setUploadFile(null);
      setUploadVersion('');
      setUploadNotes('');
      // Reset the file input
      const fileInput = document.getElementById('firmware-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      // Refresh firmware list
      await fetchFirmwareList();
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error(err?.response?.data?.detail || 'Failed to upload firmware');
    } finally {
      setUploadLoading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  // OTA rollout handler
  const handleDeploy = async () => {
    if (!selectedFirmwareId || selectedDeviceIds.size === 0) {
      toast.error('Please select a firmware version and at least one device');
      return;
    }
    setRolloutLoading(true);
    try {
      await firmwareService.triggerOTARollout(
        Number(selectedFirmwareId),
        Array.from(selectedDeviceIds),
      );
      toast.success(`OTA rollout triggered for ${selectedDeviceIds.size} device(s)`);
      setSelectedDeviceIds(new Set());
      // Refresh OTA status
      await fetchOtaStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to trigger OTA rollout');
    } finally {
      setRolloutLoading(false);
    }
  };

  const toggleDevice = (deviceId: number) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const selectAllActive = () => {
    const activeIds = state.devices
      .filter((d) => d.onlineStatus === 'ONLINE' && d.subscriptionStatus === 'ACTIVE')
      .map((d) => Number(d.id));
    setSelectedDeviceIds(new Set(activeIds));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const truncateChecksum = (checksum: string): string => {
    if (!checksum) return '-';
    return checksum.length > 16 ? `${checksum.substring(0, 16)}...` : checksum;
  };

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-iot-primary mb-1 flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-iot-cyan" />
          Firmware Management
        </h1>
        <p className="text-sm text-iot-secondary">
          Upload firmware, manage versions, and deploy OTA updates to ESP32 devices
        </p>
      </div>

      {/* Section 1: Upload Firmware */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-iot-subtle flex items-center gap-2">
          <Upload className="w-4 h-4 text-iot-cyan" />
          <h3 className="text-sm font-semibold text-iot-primary">Upload Firmware</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Firmware File (.bin) *
              </label>
              <Input
                id="firmware-file-input"
                type="file"
                accept=".bin"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="input-dark w-full file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-iot-tertiary file:text-iot-secondary hover:file:bg-iot-cyan/20 hover:file:text-iot-cyan"
              />
              {uploadFile && (
                <p className="text-xs text-iot-muted mt-1">
                  {uploadFile.name} ({formatBytes(uploadFile.size)})
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Version *
              </label>
              <Input
                type="text"
                value={uploadVersion}
                onChange={(e) => setUploadVersion(e.target.value)}
                placeholder="e.g., 2.1.0"
                className="input-dark w-full"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
              Release Notes (optional)
            </label>
            <Textarea
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              placeholder="Describe the changes in this firmware version..."
              className="input-dark w-full min-h-[80px]"
              rows={3}
            />
          </div>
          {uploadProgress > 0 && (
            <div className="space-y-1">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-iot-muted text-right">{uploadProgress}%</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={uploadLoading || !uploadFile || !uploadVersion.trim()}
              className="gradient-primary text-iot-bg-primary"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploadLoading ? 'Uploading...' : 'Upload Firmware'}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 2: Firmware History */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-iot-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-iot-cyan" />
            <h3 className="text-sm font-semibold text-iot-primary">Firmware History</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchFirmwareList}
            disabled={firmwareLoading}
            className="text-iot-secondary hover:text-iot-primary"
          >
            <RefreshCw className={`w-4 h-4 ${firmwareLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="overflow-x-auto">
          {firmwareList.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Size</th>
                  <th>Checksum (SHA-256)</th>
                  <th>Release Notes</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {firmwareList.map((fw) => (
                  <tr key={fw.firmwareId} className="hover:bg-iot-tertiary/30">
                    <td className="font-mono text-sm font-medium text-iot-primary">
                      v{fw.version}
                    </td>
                    <td className="text-xs text-iot-secondary">{formatBytes(fw.fileSize)}</td>
                    <td>
                      <span
                        className="font-mono text-xs text-iot-muted"
                        title={fw.checksumSha256}
                      >
                        {truncateChecksum(fw.checksumSha256)}
                      </span>
                    </td>
                    <td className="text-xs text-iot-secondary max-w-[200px] truncate">
                      {fw.releaseNotes || '-'}
                    </td>
                    <td className="text-xs text-iot-muted">
                      {new Date(fw.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      {fw.isActive ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: 'rgba(39, 251, 107, 0.15)',
                            color: '#27FB6B',
                          }}
                        >
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: 'rgba(109, 116, 132, 0.15)',
                            color: '#6D7484',
                          }}
                        >
                          Archived
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-iot-muted">
              {firmwareLoading ? 'Loading firmware versions...' : 'No firmware versions uploaded yet'}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: OTA Rollout */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-iot-subtle flex items-center gap-2">
          <Rocket className="w-4 h-4 text-iot-cyan" />
          <h3 className="text-sm font-semibold text-iot-primary">OTA Rollout</h3>
        </div>
        <div className="p-6 space-y-4">
          {/* Firmware selection */}
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
              Select Firmware Version
            </label>
            <Select value={selectedFirmwareId} onValueChange={setSelectedFirmwareId}>
              <SelectTrigger className="input-dark w-full max-w-sm">
                <SelectValue placeholder="Choose firmware version" />
              </SelectTrigger>
              <SelectContent className="bg-iot-secondary border-iot-subtle">
                {firmwareList.map((fw) => (
                  <SelectItem key={fw.firmwareId} value={String(fw.firmwareId)}>
                    v{fw.version} ({formatBytes(fw.fileSize)})
                    {fw.isActive ? ' - Active' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Device selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary">
                Select Devices
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllActive}
                className="text-xs text-iot-cyan hover:text-iot-cyan/80"
              >
                Select All Active
              </Button>
            </div>
            <div className="bg-iot-tertiary rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-2">
              {state.devices.length > 0 ? (
                state.devices.map((device) => {
                  const deviceNumId = Number(device.id);
                  const isChecked = selectedDeviceIds.has(deviceNumId);
                  return (
                    <label
                      key={device.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-iot-secondary/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleDevice(deviceNumId)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-iot-primary">
                          {device.name}
                        </span>
                        <span className="text-xs text-iot-muted ml-2">
                          (FW: {device.firmwareVersion || 'N/A'})
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${
                          device.onlineStatus === 'ONLINE'
                            ? 'bg-iot-green/15 text-iot-green'
                            : 'bg-iot-muted/15 text-iot-muted'
                        }`}
                      >
                        {device.onlineStatus}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-sm text-iot-muted text-center py-4">No devices registered</p>
              )}
            </div>
            {selectedDeviceIds.size > 0 && (
              <p className="text-xs text-iot-cyan mt-2">
                {selectedDeviceIds.size} device(s) selected
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleDeploy}
              disabled={rolloutLoading || !selectedFirmwareId || selectedDeviceIds.size === 0}
              className="gradient-primary text-iot-bg-primary"
            >
              <Rocket className="w-4 h-4 mr-2" />
              {rolloutLoading
                ? 'Deploying...'
                : `Deploy to ${selectedDeviceIds.size} Device(s)`}
            </Button>
          </div>
        </div>
      </div>

      {/* Section 4: Device OTA Status */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-iot-subtle flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-iot-cyan" />
            <h3 className="text-sm font-semibold text-iot-primary">Device OTA Status</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchOtaStatus}
            disabled={otaStatusLoading}
            className="text-iot-secondary hover:text-iot-primary"
          >
            <RefreshCw className={`w-4 h-4 ${otaStatusLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="overflow-x-auto">
          {otaStatuses.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>Current Firmware</th>
                  <th>OTA Status</th>
                  <th>Last OTA</th>
                </tr>
              </thead>
              <tbody>
                {otaStatuses.map((status) => (
                  <tr key={status.deviceId} className="hover:bg-iot-tertiary/30">
                    <td className="font-medium text-iot-primary">{status.deviceName}</td>
                    <td className="font-mono text-xs text-iot-secondary">
                      {status.firmwareVersion ? `v${status.firmwareVersion}` : '-'}
                    </td>
                    <td>
                      <OtaStatusBadge status={status.otaStatus} />
                    </td>
                    <td className="text-xs text-iot-muted">
                      {status.lastOtaAt
                        ? new Date(status.lastOtaAt).toLocaleString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-iot-muted">
              {otaStatusLoading ? 'Loading OTA status...' : 'No OTA status data available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FirmwareManagement;
