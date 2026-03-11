import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  Cpu,
  Usb,
  Zap,
  ClipboardList,
  UserPlus,
  Tag,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  ScanLine,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { deviceService } from '@/services/deviceService';
import { firmwareService } from '@/services/firmwareService';
import { DeviceSticker } from '@/components/ui-custom/DeviceSticker';
import { QrScanner } from '@/components/ui-custom/QrScanner';
import type { FirmwareVersion, QrScanResult } from '@/types';

interface ProvisionedDevice {
  deviceId: number;
  licenseKey: string;
  macAddress: string;
  deviceName: string;
  firmwareVersion: string;
}

type WizardStep = 'connect' | 'flash' | 'info' | 'register' | 'sticker';

const STEPS: { key: WizardStep; label: string; icon: React.ElementType }[] = [
  { key: 'connect', label: 'Connect', icon: Usb },
  { key: 'flash', label: 'Flash', icon: Zap },
  { key: 'info', label: 'Device Info', icon: ClipboardList },
  { key: 'register', label: 'Register', icon: UserPlus },
  { key: 'sticker', label: 'Sticker', icon: Tag },
];

export const FlashDevice: React.FC = () => {
  const toast = useToast();
  const pageRef = useRef<HTMLDivElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('connect');
  const [macAddress, setMacAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [provisioned, setProvisioned] = useState<ProvisionedDevice | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);

  // Firmware state
  const [latestFirmware, setLatestFirmware] = useState<FirmwareVersion | null>(null);
  const [firmwareLoading, setFirmwareLoading] = useState(false);

  // Web Serial placeholder state
  const [serialConnected, setSerialConnected] = useState(false);
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashComplete, setFlashComplete] = useState(false);

  // QR Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);

  // Entrance animation
  useEffect(() => {
    if (pageRef.current) {
      gsap.fromTo(
        pageRef.current.children,
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'power3.out' }
      );
    }
  }, []);

  // Fetch latest firmware
  useEffect(() => {
    const fetchFirmware = async () => {
      setFirmwareLoading(true);
      try {
        const fw = await firmwareService.getLatestFirmware();
        setLatestFirmware(fw);
      } catch {
        // Firmware endpoint might not exist yet
        setLatestFirmware(null);
      } finally {
        setFirmwareLoading(false);
      }
    };
    fetchFirmware();
  }, []);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].key);
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].key);
    }
  };

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  // Placeholder: Web Serial connect
  const handleSerialConnect = () => {
    toast.info('Web Serial support coming soon. Please enter MAC address manually in Step 3.');
    setSerialConnected(true);
    goNext();
  };

  // Placeholder: Flash firmware
  const handleFlash = () => {
    toast.info('Web Serial flashing coming soon. Proceeding to device info.');
    setFlashProgress(100);
    setFlashComplete(true);
    setTimeout(() => goNext(), 500);
  };

  // Register device via API
  const handleRegister = async () => {
    if (!macAddress.trim()) {
      setRegisterError('MAC address is required');
      return;
    }
    if (!deviceName.trim()) {
      setRegisterError('Device name is required');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);

    try {
      const result = await deviceService.provision({
        mac_address: macAddress.trim(),
        device_name: deviceName.trim(),
        device_type: 'ESP32',
      });

      const device: ProvisionedDevice = {
        deviceId: result.device_id ?? result.id,
        licenseKey: result.license_key ?? result.licenseKey,
        macAddress: result.mac_address ?? result.macAddress ?? macAddress.trim(),
        deviceName: result.device_name ?? result.deviceName ?? result.name ?? deviceName.trim(),
        firmwareVersion: latestFirmware?.version || '3.0.0',
      };

      setProvisioned(device);
      toast.success(`Device "${device.deviceName}" registered successfully!`);
      goNext();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const message = axiosErr?.response?.data?.detail || 'Failed to register device';
      setRegisterError(message);
      toast.error(message);
    } finally {
      setIsRegistering(false);
    }
  };

  // QR scan handler
  const handleQrScan = (data: QrScanResult) => {
    setScannerOpen(false);
    if (data.lic) {
      toast.success(`Scanned license key: ${data.lic}`);
    }
  };

  // MAC address validation
  const isValidMac = (mac: string): boolean => {
    return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac.trim());
  };

  const formatMacAddress = (value: string): string => {
    // Auto-format as user types: add colons
    const clean = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const parts = clean.match(/.{1,2}/g);
    return parts ? parts.join(':').substring(0, 17) : clean;
  };

  return (
    <div ref={pageRef} className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-iot-primary mb-1 flex items-center gap-3">
          <Cpu className="w-6 h-6 text-iot-cyan" />
          Flash &amp; Provision Device
        </h1>
        <p className="text-sm text-iot-secondary">
          Connect, flash firmware, and register new ESP32 devices
        </p>
      </div>

      {/* Step Progress Bar */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle p-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isComplete = index < currentStepIndex;
            const isPast = index <= currentStepIndex;

            return (
              <React.Fragment key={step.key}>
                <button
                  onClick={() => {
                    // Allow going back to completed steps or current
                    if (index <= currentStepIndex || provisioned) {
                      goToStep(step.key);
                    }
                  }}
                  className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${
                    isPast ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                      isActive
                        ? 'bg-iot-cyan/20 border-2 border-iot-cyan'
                        : isComplete
                        ? 'bg-emerald-500/20 border-2 border-emerald-500'
                        : 'bg-iot-tertiary border-2 border-iot-subtle'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? 'text-iot-cyan' : 'text-iot-muted'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      isActive
                        ? 'text-iot-cyan'
                        : isComplete
                        ? 'text-emerald-500'
                        : 'text-iot-muted'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-200 ${
                      index < currentStepIndex ? 'bg-emerald-500' : 'bg-iot-subtle'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        {/* Step 1: Connect Device */}
        {currentStep === 'connect' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Usb className="w-5 h-5 text-iot-cyan" />
              <h3 className="text-lg font-semibold text-iot-primary">Connect Device</h3>
            </div>
            <p className="text-sm text-iot-secondary">
              Connect your ESP32 device via USB to flash firmware and read device information.
            </p>

            <div className="bg-iot-tertiary rounded-xl p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-iot-cyan/10 border-2 border-dashed border-iot-cyan/30 flex items-center justify-center mx-auto">
                <Usb className="w-8 h-8 text-iot-cyan" />
              </div>
              <div>
                <p className="text-sm font-medium text-iot-primary">Web Serial Connection</p>
                <p className="text-xs text-iot-muted mt-1">
                  Requires Chrome/Edge browser with Web Serial API support
                </p>
              </div>
              <Button
                onClick={handleSerialConnect}
                className="gradient-primary text-iot-bg-primary"
              >
                <Usb className="w-4 h-4 mr-2" />
                {serialConnected ? 'Connected' : 'Connect via USB'}
              </Button>
              <p className="text-xs text-iot-muted">
                Or skip to Step 3 to manually enter device information
              </p>
              <Button
                variant="ghost"
                onClick={() => goToStep('info')}
                className="text-iot-cyan hover:text-iot-cyan/80 text-xs"
              >
                Skip to Manual Entry
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Flash Firmware */}
        {currentStep === 'flash' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-iot-cyan" />
              <h3 className="text-lg font-semibold text-iot-primary">Flash Firmware</h3>
            </div>

            {/* Latest firmware info */}
            <div className="bg-iot-tertiary rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-iot-secondary">
                  Latest Firmware
                </span>
                {firmwareLoading && (
                  <Loader2 className="w-4 h-4 text-iot-cyan animate-spin" />
                )}
              </div>
              {latestFirmware ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-iot-primary font-mono font-medium">
                      v{latestFirmware.version}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase"
                      style={{
                        backgroundColor: latestFirmware.isActive
                          ? 'rgba(39, 251, 107, 0.15)'
                          : 'rgba(109, 116, 132, 0.15)',
                        color: latestFirmware.isActive ? '#27FB6B' : '#6D7484',
                      }}
                    >
                      {latestFirmware.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  {latestFirmware.releaseNotes && (
                    <p className="text-xs text-iot-muted">{latestFirmware.releaseNotes}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-iot-muted">
                  {firmwareLoading ? 'Loading...' : 'No firmware uploaded yet'}
                </p>
              )}
            </div>

            {/* Flash controls */}
            <div className="bg-iot-tertiary rounded-xl p-6 text-center space-y-4">
              {flashProgress > 0 && (
                <div className="space-y-2">
                  <div className="w-full bg-iot-subtle rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-iot-cyan to-iot-purple rounded-full transition-all duration-300"
                      style={{ width: `${flashProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-iot-muted">{flashProgress}%</p>
                </div>
              )}

              {flashComplete ? (
                <div className="flex items-center justify-center gap-2 text-emerald-500">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">Flash Complete</span>
                </div>
              ) : (
                <Button
                  onClick={handleFlash}
                  disabled={!latestFirmware}
                  className="gradient-primary text-iot-bg-primary"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Flash Firmware
                </Button>
              )}

              <p className="text-xs text-iot-muted">
                Web Serial flashing is a placeholder. Use esptool.py for now.
              </p>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={goPrev} className="text-iot-secondary">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button variant="ghost" onClick={goNext} className="text-iot-cyan">
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Device Info */}
        {currentStep === 'info' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <ClipboardList className="w-5 h-5 text-iot-cyan" />
              <h3 className="text-lg font-semibold text-iot-primary">Device Information</h3>
            </div>
            <p className="text-sm text-iot-secondary">
              Enter the MAC address and a name for this device.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  MAC Address *
                </label>
                <Input
                  type="text"
                  value={macAddress}
                  onChange={(e) => setMacAddress(formatMacAddress(e.target.value))}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="input-dark w-full font-mono"
                  maxLength={17}
                />
                {macAddress && !isValidMac(macAddress) && (
                  <p className="text-xs text-amber-400 mt-1">
                    Enter a valid MAC address (e.g., AA:BB:CC:DD:EE:FF)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Device Name *
                </label>
                <Input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., ESP32-Sensor-03"
                  className="input-dark w-full"
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={goPrev} className="text-iot-secondary">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={goNext}
                disabled={!macAddress.trim() || !deviceName.trim()}
                className="gradient-primary text-iot-bg-primary"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Register Device */}
        {currentStep === 'register' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-5 h-5 text-iot-cyan" />
              <h3 className="text-lg font-semibold text-iot-primary">Register Device</h3>
            </div>
            <p className="text-sm text-iot-secondary">
              Provision this device in the system to generate a license key.
            </p>

            {/* Summary */}
            <div className="bg-iot-tertiary rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-iot-muted">MAC Address</span>
                <span className="font-mono text-iot-primary">{macAddress || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-iot-muted">Device Name</span>
                <span className="text-iot-primary">{deviceName || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-iot-muted">Device Type</span>
                <span className="text-iot-primary">ESP32</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-iot-muted">Firmware</span>
                <span className="font-mono text-iot-primary">
                  v{latestFirmware?.version || '3.0.0'}
                </span>
              </div>
            </div>

            {registerError && (
              <div className="flex items-start gap-2 p-3 bg-iot-red/10 border border-iot-red/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-iot-red flex-shrink-0 mt-0.5" />
                <p className="text-xs text-iot-red">{registerError}</p>
              </div>
            )}

            {provisioned ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-500">Device Registered</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-iot-muted">License Key</span>
                  <span className="font-mono font-bold text-iot-primary">
                    {provisioned.licenseKey}
                  </span>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleRegister}
                disabled={isRegistering || !macAddress.trim() || !deviceName.trim()}
                className="w-full gradient-primary text-iot-bg-primary"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Register Device
                  </>
                )}
              </Button>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={goPrev} className="text-iot-secondary">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              {provisioned && (
                <Button onClick={goNext} className="gradient-primary text-iot-bg-primary">
                  View Sticker
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Device Sticker */}
        {currentStep === 'sticker' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-5 h-5 text-iot-cyan" />
              <h3 className="text-lg font-semibold text-iot-primary">Device Sticker</h3>
            </div>
            <p className="text-sm text-iot-secondary">
              Print this sticker and attach it to the device enclosure.
            </p>

            {provisioned ? (
              <DeviceSticker
                licenseKey={provisioned.licenseKey}
                macAddress={provisioned.macAddress}
                deviceName={provisioned.deviceName}
                firmwareVersion={provisioned.firmwareVersion}
              />
            ) : (
              <div className="bg-iot-tertiary rounded-xl p-10 text-center">
                <p className="text-sm text-iot-muted">
                  Register a device first to generate a sticker.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => goToStep('register')}
                  className="mt-3 text-iot-cyan"
                >
                  Go to Register Step
                </Button>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={goPrev} className="text-iot-secondary">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  // Reset wizard for next device
                  setCurrentStep('connect');
                  setMacAddress('');
                  setDeviceName('');
                  setProvisioned(null);
                  setSerialConnected(false);
                  setFlashProgress(0);
                  setFlashComplete(false);
                  setRegisterError(null);
                }}
                className="text-iot-cyan"
              >
                Flash Another Device
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Tool */}
      <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        <div className="px-6 py-4 border-b border-iot-subtle flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-iot-cyan" />
          <h3 className="text-sm font-semibold text-iot-primary">QR Scanner</h3>
        </div>
        <div className="p-6">
          {scannerOpen ? (
            <QrScanner
              onScan={handleQrScan}
              onError={(msg) => toast.error(msg)}
              onClose={() => setScannerOpen(false)}
            />
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-iot-secondary">
                Scan a device QR code to look up its license key and provisioning info.
              </p>
              <Button
                onClick={() => setScannerOpen(true)}
                className="gradient-primary text-iot-bg-primary"
              >
                <ScanLine className="w-4 h-4 mr-2" />
                Open QR Scanner
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlashDevice;
