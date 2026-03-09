import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Search, Filter, ChevronRight, Cpu, Plus, Copy, Check, ShieldAlert, ShieldOff, Ban } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { deviceService } from '@/services/deviceService';
import { mapDevice } from '@/utils/mappers';
import type { Device, SubscriptionStatus } from '@/types';


// Subscription status badge component
const SubscriptionBadge: React.FC<{ status: SubscriptionStatus }> = ({ status }) => {
  const config: Record<SubscriptionStatus, { bg: string; color: string; label: string }> = {
    PENDING: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166', label: 'Pending' },
    ACTIVE: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B', label: 'Active' },
    SUSPENDED: { bg: 'rgba(255, 45, 85, 0.15)', color: '#FF2D55', label: 'Suspended' },
    EXPIRED: { bg: 'rgba(109, 116, 132, 0.15)', color: '#6D7484', label: 'Expired' },
  };
  const { bg, color, label } = config[status] || config.PENDING;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
};

// Communication mode badge
const CommModeBadge: React.FC<{ mode: string }> = ({ mode }) => {
  const isMQTT = mode === 'MQTT';
  return (
    <span className={`badge ${isMQTT ? 'badge-purple' : 'badge-cyan'}`}>
      {mode}
    </span>
  );
};

// Copyable license key display
const LicenseKeyCell: React.FC<{ licenseKey: string }> = ({ licenseKey }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!licenseKey) return;
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!licenseKey) return <span className="text-iot-muted">-</span>;

  const truncated = licenseKey.length > 14
    ? `${licenseKey.substring(0, 14)}...`
    : licenseKey;

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 font-mono text-xs text-iot-secondary hover:text-iot-cyan transition-colors group"
      title={`Click to copy: ${licenseKey}`}
    >
      <span>{truncated}</span>
      {copied ? (
        <Check className="w-3 h-3 text-iot-green" />
      ) : (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
};


export const Devices: React.FC = () => {
  const { state, dispatch } = useApp();
  const { checkPermission } = useAuth();
  const toast = useToast();
  const tableRef = useRef<HTMLDivElement>(null);

  const isAdmin = checkPermission('ADMIN');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFLINE'>('ALL');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'ALL' | SubscriptionStatus>('ALL');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Provision dialog state
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({ mac_address: '', device_name: '', device_type: 'ESP32' });
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionResult, setProvisionResult] = useState<{ license_key: string } | null>(null);

  // Assign dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignDevice, setAssignDevice] = useState<Device | null>(null);
  const [assignPlantId, setAssignPlantId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // Kill switch confirmation state
  const [killSwitchOpen, setKillSwitchOpen] = useState(false);
  const [killSwitchDevice, setKillSwitchDevice] = useState<Device | null>(null);
  const [killSwitchAction, setKillSwitchAction] = useState<'ENABLE' | 'DISABLE'>('ENABLE');
  const [killSwitchLoading, setKillSwitchLoading] = useState(false);

  // Revoke confirmation state
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [revokeDevice, setRevokeDevice] = useState<Device | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  useEffect(() => {
    if (tableRef.current) {
      gsap.fromTo(
        tableRef.current.querySelectorAll('tr'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power3.out' }
      );
    }
  }, []);

  // Filter devices
  const filteredDevices = state.devices.filter(device => {
    const matchesSearch =
      searchQuery === '' ||
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.macAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.licenseKey.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || device.onlineStatus === statusFilter;
    const matchesSubscription = subscriptionFilter === 'ALL' || device.subscriptionStatus === subscriptionFilter;

    return matchesSearch && matchesStatus && matchesSubscription;
  });

  // -- Handlers --

  const handleAssignRoom = async (roomId: string) => {
    if (!selectedDevice) return;
    try {
      const updatedRaw = await deviceService.update(Number(selectedDevice.id), { room_id: Number(roomId) });
      const updatedDevice = mapDevice(updatedRaw, state.rooms);
      dispatch({ type: 'UPDATE_DEVICE', payload: updatedDevice });
      toast.success('Device assigned to room');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to assign device');
    }
  };

  const handleProvision = async () => {
    if (!provisionForm.mac_address || !provisionForm.device_name) {
      toast.error('Please fill in MAC Address and Device Name');
      return;
    }
    setProvisionLoading(true);
    try {
      const result = await deviceService.provision(provisionForm);
      const newDevice = mapDevice(result, state.rooms);
      dispatch({ type: 'ADD_DEVICE', payload: newDevice });
      setProvisionResult({ license_key: result.license_key ?? result.licenseKey ?? newDevice.licenseKey });
      toast.success('Device provisioned successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to provision device');
    } finally {
      setProvisionLoading(false);
    }
  };

  const handleProvisionClose = () => {
    setProvisionOpen(false);
    setProvisionForm({ mac_address: '', device_name: '', device_type: 'ESP32' });
    setProvisionResult(null);
  };

  const handleAssignToPlant = async () => {
    if (!assignDevice || !assignPlantId) return;
    setAssignLoading(true);
    try {
      const result = await deviceService.assign(Number(assignDevice.id), { plant_id: Number(assignPlantId) });
      const updatedDevice = mapDevice(result, state.rooms);
      dispatch({ type: 'UPDATE_DEVICE', payload: updatedDevice });
      toast.success('Device assigned to plant successfully');
      setAssignOpen(false);
      setAssignDevice(null);
      setAssignPlantId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to assign device');
    } finally {
      setAssignLoading(false);
    }
  };

  const openAssignDialog = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignDevice(device);
    setAssignPlantId(device.assignedPlantId || '');
    setAssignOpen(true);
  };

  const handleKillSwitch = async () => {
    if (!killSwitchDevice) return;
    setKillSwitchLoading(true);
    try {
      const result = await deviceService.killSwitch(Number(killSwitchDevice.id), killSwitchAction);
      const updatedDevice = mapDevice(result, state.rooms);
      dispatch({ type: 'UPDATE_DEVICE', payload: updatedDevice });
      toast.success(`Kill switch ${killSwitchAction === 'ENABLE' ? 'enabled' : 'disabled'} successfully`);
      setKillSwitchOpen(false);
      setKillSwitchDevice(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to toggle kill switch');
    } finally {
      setKillSwitchLoading(false);
    }
  };

  const openKillSwitch = (device: Device, action: 'ENABLE' | 'DISABLE', e: React.MouseEvent) => {
    e.stopPropagation();
    setKillSwitchDevice(device);
    setKillSwitchAction(action);
    setKillSwitchOpen(true);
  };

  const handleRevoke = async () => {
    if (!revokeDevice) return;
    setRevokeLoading(true);
    try {
      const result = await deviceService.revoke(Number(revokeDevice.id));
      const updatedDevice = mapDevice(result, state.rooms);
      dispatch({ type: 'UPDATE_DEVICE', payload: updatedDevice });
      toast.success('Device subscription revoked');
      setRevokeOpen(false);
      setRevokeDevice(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to revoke device');
    } finally {
      setRevokeLoading(false);
    }
  };

  const openRevoke = (device: Device, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevokeDevice(device);
    setRevokeOpen(true);
  };

  const [licenseCopied, setLicenseCopied] = useState(false);
  const copyLicenseKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setLicenseCopied(true);
    setTimeout(() => setLicenseCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-iot-primary mb-1">Devices</h1>
          <p className="text-sm text-iot-secondary">Manage ESP32 sensor devices</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              onClick={() => setProvisionOpen(true)}
              className="gradient-primary text-iot-bg-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Provision Device
            </Button>
          )}
          <div className="flex items-center gap-2 text-sm text-iot-muted">
            <Cpu className="w-4 h-4" />
            <span>Devices self-register from hardware</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iot-muted" />
          <Input
            type="text"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark pl-10 w-full"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="input-dark w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
            <SelectItem value="OFFLINE">Offline</SelectItem>
          </SelectContent>
        </Select>

        <Select value={subscriptionFilter} onValueChange={(v) => setSubscriptionFilter(v as typeof subscriptionFilter)}>
          <SelectTrigger className="input-dark w-44">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Subscription" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            <SelectItem value="ALL">All Subscriptions</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredDevices.length > 0 ? (
        <div
          ref={tableRef}
          className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Name</th>
                  <th>MAC Address</th>
                  <th>License Key</th>
                  <th>Subscription</th>
                  <th>Mode</th>
                  <th>Assigned Room</th>
                  <th>Status</th>
                  <th>Last Seen</th>
                  <th>WiFi</th>
                  <th>Heap</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const canKillSwitch = device.subscriptionStatus === 'ACTIVE' || device.subscriptionStatus === 'SUSPENDED';
                  const canRevoke = device.subscriptionStatus !== 'EXPIRED';
                  const isSuspended = device.subscriptionStatus === 'SUSPENDED';

                  return (
                    <tr key={device.id} className="hover:bg-iot-tertiary/30">
                      <td className="font-mono text-xs text-iot-secondary">{device.id}</td>
                      <td className="font-medium">{device.name}</td>
                      <td className="font-mono text-xs">{device.macAddress}</td>
                      <td>
                        <LicenseKeyCell licenseKey={device.licenseKey} />
                      </td>
                      <td>
                        <SubscriptionBadge status={device.subscriptionStatus} />
                      </td>
                      <td>
                        <CommModeBadge mode={device.communicationMode} />
                      </td>
                      <td>
                        {device.assignedRoomName ? (
                          device.assignedRoomName
                        ) : (
                          <span className="badge badge-orange">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={device.onlineStatus === 'ONLINE' ? 'online' : 'offline'}
                        />
                      </td>
                      <td className="text-iot-muted text-xs">
                        {device.lastSeen
                          ? new Date(device.lastSeen).toLocaleTimeString()
                          : '-'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <div className="flex gap-px">
                            {[1, 2, 3, 4].map((bar) => (
                              <div
                                key={bar}
                                className={`w-1 rounded-sm ${
                                  bar <= Math.ceil((device.wifiSignal + 100) / 25)
                                    ? 'bg-iot-green'
                                    : 'bg-iot-tertiary'
                                }`}
                                style={{ height: `${bar * 3 + 3}px` }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-iot-muted ml-1">{device.wifiSignal}</span>
                        </div>
                      </td>
                      <td className="text-xs">{Math.round(device.freeHeap / 1024)}K</td>
                      <td>
                        <div className="flex items-center gap-1">
                          {/* Detail */}
                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-primary hover:bg-iot-tertiary transition-colors"
                            title="View details"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              {/* Assign to plant */}
                              <button
                                onClick={(e) => openAssignDialog(device, e)}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-cyan hover:bg-iot-cyan/10 transition-colors"
                                title="Assign to plant"
                              >
                                <Plus className="w-4 h-4" />
                              </button>

                              {/* Kill Switch */}
                              {canKillSwitch && (
                                <button
                                  onClick={(e) => openKillSwitch(device, isSuspended ? 'DISABLE' : 'ENABLE', e)}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    isSuspended
                                      ? 'text-iot-green hover:bg-iot-green/10'
                                      : 'text-iot-orange hover:bg-iot-orange/10'
                                  }`}
                                  title={isSuspended ? 'Re-enable device' : 'Suspend device (kill switch)'}
                                >
                                  {isSuspended ? (
                                    <ShieldOff className="w-4 h-4" />
                                  ) : (
                                    <ShieldAlert className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {/* Revoke */}
                              {canRevoke && (
                                <button
                                  onClick={(e) => openRevoke(device, e)}
                                  className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-red hover:bg-iot-red/10 transition-colors"
                                  title="Revoke subscription"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Cpu}
          title="No devices found"
          description="Devices appear here after ESP32 registration on-site."
        />
      )}

      {/* ==================== DIALOGS ==================== */}

      {/* Device Detail Dialog */}
      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="bg-iot-secondary border-iot-subtle max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-iot-primary flex items-center gap-3">
              <Cpu className="w-5 h-5 text-iot-cyan" />
              {selectedDevice?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-6">
              {/* Connection Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-iot-tertiary rounded-lg p-3">
                  <p className="text-xs text-iot-muted mb-1">IP Address</p>
                  <p className="text-sm font-mono text-iot-primary">{selectedDevice.ipAddress || '-'}</p>
                </div>
                <div className="bg-iot-tertiary rounded-lg p-3">
                  <p className="text-xs text-iot-muted mb-1">WiFi Signal</p>
                  <p className="text-sm text-iot-primary">{selectedDevice.wifiSignal} dBm</p>
                </div>
                <div className="bg-iot-tertiary rounded-lg p-3">
                  <p className="text-xs text-iot-muted mb-1">Free Heap</p>
                  <p className="text-sm text-iot-primary">{Math.round(selectedDevice.freeHeap / 1024)} KB</p>
                </div>
                <div className="bg-iot-tertiary rounded-lg p-3">
                  <p className="text-xs text-iot-muted mb-1">Uptime</p>
                  <p className="text-sm text-iot-primary">{Math.floor((selectedDevice.uptime || 0) / 86400)} days</p>
                </div>
              </div>

              {/* Device Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-iot-muted mb-1">MAC Address</p>
                  <p className="text-sm font-mono text-iot-primary">{selectedDevice.macAddress}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted mb-1">Type</p>
                  <p className="text-sm text-iot-primary">{selectedDevice.type}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted mb-1">Firmware Version</p>
                  <p className="text-sm text-iot-primary">{selectedDevice.firmwareVersion}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted mb-1">Hardware Version</p>
                  <p className="text-sm text-iot-primary">{selectedDevice.hardwareVersion || '-'}</p>
                </div>
              </div>

              {/* Subscription & Communication */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-iot-muted mb-1">License Key</p>
                  <p className="text-sm font-mono text-iot-primary">{selectedDevice.licenseKey || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted mb-1">Subscription Status</p>
                  <SubscriptionBadge status={selectedDevice.subscriptionStatus} />
                </div>
                <div>
                  <p className="text-xs text-iot-muted mb-1">Communication Mode</p>
                  <CommModeBadge mode={selectedDevice.communicationMode} />
                </div>
                <div>
                  <p className="text-xs text-iot-muted mb-1">Assigned Plant</p>
                  <p className="text-sm text-iot-primary">{selectedDevice.assignedPlantName || 'None'}</p>
                </div>
              </div>

              {/* Assignment */}
              <div>
                <p className="text-xs text-iot-muted mb-2">Assign to Room</p>
                <Select
                  value={selectedDevice.assignedRoomId || ''}
                  onValueChange={(roomId) => handleAssignRoom(roomId)}
                >
                  <SelectTrigger className="input-dark w-full">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent className="bg-iot-secondary border-iot-subtle">
                    {state.rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Registration Info */}
              <div className="pt-4 border-t border-iot-subtle">
                <p className="text-xs text-iot-muted">
                  Registered: {new Date(selectedDevice.registeredAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Provision Device Dialog */}
      <Dialog open={provisionOpen} onOpenChange={(open) => { if (!open) handleProvisionClose(); }}>
        <DialogContent className="bg-iot-secondary border-iot-subtle max-w-md">
          <DialogHeader>
            <DialogTitle className="text-iot-primary">Provision New Device</DialogTitle>
            <DialogDescription className="text-iot-muted">
              Register a new ESP32 device and generate a license key.
            </DialogDescription>
          </DialogHeader>

          {provisionResult ? (
            <div className="space-y-4">
              <div className="bg-iot-tertiary rounded-lg p-4">
                <p className="text-xs text-iot-muted mb-2">Generated License Key</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-mono text-iot-cyan font-bold flex-1 break-all">
                    {provisionResult.license_key}
                  </p>
                  <button
                    onClick={() => copyLicenseKey(provisionResult.license_key)}
                    className="p-2 rounded-lg hover:bg-iot-secondary transition-colors flex-shrink-0"
                    title="Copy license key"
                  >
                    {licenseCopied ? (
                      <Check className="w-5 h-5 text-iot-green" />
                    ) : (
                      <Copy className="w-5 h-5 text-iot-muted" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-iot-orange mt-2">
                  Save this key -- it is needed to configure the device firmware.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={handleProvisionClose} className="gradient-primary text-iot-bg-primary">
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  MAC Address *
                </label>
                <Input
                  type="text"
                  value={provisionForm.mac_address}
                  onChange={(e) => setProvisionForm({ ...provisionForm, mac_address: e.target.value })}
                  placeholder="e.g., AA:BB:CC:DD:EE:FF"
                  className="input-dark w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Device Name *
                </label>
                <Input
                  type="text"
                  value={provisionForm.device_name}
                  onChange={(e) => setProvisionForm({ ...provisionForm, device_name: e.target.value })}
                  placeholder="e.g., Room-1-Sensor"
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Device Type
                </label>
                <Select
                  value={provisionForm.device_type}
                  onValueChange={(v) => setProvisionForm({ ...provisionForm, device_type: v })}
                >
                  <SelectTrigger className="input-dark w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-iot-secondary border-iot-subtle">
                    <SelectItem value="ESP32">ESP32</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter className="gap-3">
                <Button
                  variant="outline"
                  onClick={handleProvisionClose}
                  className="border-iot-subtle text-iot-secondary"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProvision}
                  disabled={provisionLoading}
                  className="gradient-primary text-iot-bg-primary"
                >
                  {provisionLoading ? 'Provisioning...' : 'Provision'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign to Plant Dialog */}
      <Dialog open={assignOpen} onOpenChange={(open) => { if (!open) { setAssignOpen(false); setAssignDevice(null); } }}>
        <DialogContent className="bg-iot-secondary border-iot-subtle max-w-md">
          <DialogHeader>
            <DialogTitle className="text-iot-primary">Assign Device to Plant</DialogTitle>
            <DialogDescription className="text-iot-muted">
              Assign <span className="text-iot-cyan">{assignDevice?.name}</span> to a plant.
              This generates MQTT credentials for the device.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                Select Plant *
              </label>
              <Select value={assignPlantId} onValueChange={setAssignPlantId}>
                <SelectTrigger className="input-dark w-full">
                  <SelectValue placeholder="Choose a plant" />
                </SelectTrigger>
                <SelectContent className="bg-iot-secondary border-iot-subtle">
                  {state.plants.map(plant => (
                    <SelectItem key={plant.id} value={plant.id}>{plant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => { setAssignOpen(false); setAssignDevice(null); }}
                className="border-iot-subtle text-iot-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAssignToPlant}
                disabled={assignLoading || !assignPlantId}
                className="gradient-primary text-iot-bg-primary"
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Kill Switch Confirmation */}
      <AlertDialog open={killSwitchOpen} onOpenChange={(open) => { if (!open) { setKillSwitchOpen(false); setKillSwitchDevice(null); } }}>
        <AlertDialogContent className="bg-iot-secondary border-iot-subtle">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-iot-primary">
              {killSwitchAction === 'ENABLE' ? 'Suspend Device?' : 'Re-enable Device?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-iot-muted">
              {killSwitchAction === 'ENABLE'
                ? `This will suspend "${killSwitchDevice?.name}" immediately. The device will stop sending data and its MQTT connection will be terminated.`
                : `This will re-enable "${killSwitchDevice?.name}" and restore its MQTT connection. The device will resume normal operation.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-iot-subtle text-iot-secondary bg-transparent hover:bg-iot-tertiary"
              disabled={killSwitchLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKillSwitch}
              disabled={killSwitchLoading}
              className={killSwitchAction === 'ENABLE'
                ? 'bg-iot-orange hover:bg-iot-orange/80 text-white'
                : 'bg-iot-green hover:bg-iot-green/80 text-white'}
            >
              {killSwitchLoading
                ? 'Processing...'
                : killSwitchAction === 'ENABLE' ? 'Suspend' : 'Re-enable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={revokeOpen} onOpenChange={(open) => { if (!open) { setRevokeOpen(false); setRevokeDevice(null); } }}>
        <AlertDialogContent className="bg-iot-secondary border-iot-subtle">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-iot-primary">Revoke Device Subscription?</AlertDialogTitle>
            <AlertDialogDescription className="text-iot-muted">
              This will permanently expire the subscription for "{revokeDevice?.name}".
              The device license key will become invalid and the device will need to be re-provisioned.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-iot-subtle text-iot-secondary bg-transparent hover:bg-iot-tertiary"
              disabled={revokeLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revokeLoading}
              className="bg-iot-red hover:bg-iot-red/80 text-white"
            >
              {revokeLoading ? 'Revoking...' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;
