import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  WifiOff,
  Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { deviceService } from '@/services/deviceService';
import { firmwareService } from '@/services/firmwareService';
import { DeviceSticker } from '@/components/ui-custom/DeviceSticker';
import { QrScanner } from '@/components/ui-custom/QrScanner';
import type { FirmwareVersion, FlashStage, QrScanResult } from '@/types';

// Web Serial API type declarations
declare global {
  interface Navigator {
    serial?: {
      requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
      getPorts(): Promise<SerialPort[]>;
    };
  }

  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }

  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }

  interface SerialPort {
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    getInfo(): SerialPortInfo;
  }

  interface SerialOptions {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: ParityType;
    bufferSize?: number;
    flowControl?: FlowControlType;
  }

  type ParityType = 'none' | 'even' | 'odd';
  type FlowControlType = 'none' | 'hardware';

  interface SerialPortInfo {
    usbVendorId?: number;
    usbProductId?: number;
  }
}

// Known ESP32 USB vendor/product IDs
const ESP32_FILTERS: SerialPortFilter[] = [
  { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
  { usbVendorId: 0x1a86 }, // QinHeng CH340
  { usbVendorId: 0x0403 }, // FTDI
  { usbVendorId: 0x303a }, // Espressif native USB
];

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

/** Check if the browser supports Web Serial API. */
const isWebSerialSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
};

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
  const [firmwareBin, setFirmwareBin] = useState<ArrayBuffer | null>(null);
  const [firmwareDownloading, setFirmwareDownloading] = useState(false);

  // Web Serial state
  const [serialSupported] = useState(isWebSerialSupported());
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [serialConnected, setSerialConnected] = useState(false);
  const [serialConnecting, setSerialConnecting] = useState(false);
  const [serialLog, setSerialLog] = useState<string[]>([]);

  // Flash progress state
  const [flashStage, setFlashStage] = useState<FlashStage>('idle');
  const [flashProgress, setFlashProgress] = useState(0);
  const [flashComplete, setFlashComplete] = useState(false);
  const [flashError, setFlashError] = useState<string | null>(null);

  // QR Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);

  // Append to serial log
  const appendLog = useCallback((msg: string) => {
    setSerialLog((prev) => [...prev.slice(-49), msg]);
  }, []);

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

  // Fetch latest firmware metadata
  useEffect(() => {
    const fetchFirmware = async () => {
      setFirmwareLoading(true);
      try {
        const fw = await firmwareService.getLatestFirmware();
        setLatestFirmware(fw);
      } catch {
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

  // --- Web Serial: Connect ---
  const handleSerialConnect = async () => {
    if (!serialSupported) {
      toast.error('Web Serial API is not supported in this browser. Use Chrome or Edge.');
      return;
    }

    setSerialConnecting(true);
    appendLog('Requesting serial port...');

    try {
      const port = await navigator.serial!.requestPort({ filters: ESP32_FILTERS });
      appendLog('Port selected. Opening at 115200 baud...');

      await port.open({ baudRate: 115200 });
      setSerialPort(port);
      setSerialConnected(true);
      appendLog('Serial port connected successfully.');

      // Try to read MAC address from the device via serial output
      const portInfo = port.getInfo();
      appendLog(
        `Device info: vendorId=0x${(portInfo.usbVendorId ?? 0).toString(16)}, productId=0x${(portInfo.usbProductId ?? 0).toString(16)}`
      );

      toast.success('ESP32 connected via USB serial.');
      goNext();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      if (message.includes('No port selected')) {
        appendLog('Port selection cancelled by user.');
      } else {
        appendLog(`Connection error: ${message}`);
        toast.error(`Serial connection failed: ${message}`);
      }
    } finally {
      setSerialConnecting(false);
    }
  };

  // --- Web Serial: Disconnect ---
  const handleSerialDisconnect = async () => {
    if (serialPort) {
      try {
        await serialPort.close();
        appendLog('Serial port closed.');
      } catch {
        // Port may already be closed
      }
      setSerialPort(null);
      setSerialConnected(false);
    }
  };

  // --- Download firmware binary ---
  const handleDownloadFirmware = async () => {
    setFirmwareDownloading(true);
    appendLog('Downloading firmware binary...');
    try {
      const result = await firmwareService.downloadLatestFirmwareBin();
      setFirmwareBin(result.data);
      appendLog(
        `Firmware downloaded: v${result.version}, ${result.data.byteLength} bytes, sha256=${result.checksum.substring(0, 16)}...`
      );
      toast.success(`Firmware v${result.version} downloaded (${(result.data.byteLength / 1024).toFixed(1)} KB)`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed';
      appendLog(`Firmware download error: ${message}`);
      toast.error('Failed to download firmware binary.');
    } finally {
      setFirmwareDownloading(false);
    }
  };

  // --- Flash firmware via Web Serial ---
  const handleFlash = async () => {
    if (!serialPort) {
      toast.error('No serial port connected. Go back to Step 1.');
      return;
    }

    // Download firmware if not already cached
    let bin = firmwareBin;
    if (!bin) {
      setFirmwareDownloading(true);
      appendLog('Downloading firmware binary before flashing...');
      try {
        const result = await firmwareService.downloadLatestFirmwareBin();
        bin = result.data;
        setFirmwareBin(bin);
        appendLog(`Firmware downloaded: ${bin.byteLength} bytes`);
      } catch {
        toast.error('Failed to download firmware. Cannot flash.');
        setFirmwareDownloading(false);
        return;
      } finally {
        setFirmwareDownloading(false);
      }
    }

    setFlashError(null);
    setFlashStage('connecting');
    setFlashProgress(0);
    appendLog('Starting flash process...');

    try {
      // NOTE: esptool-js is not yet in package.json.
      // When installed, replace this block with:
      //
      //   import { ESPLoader, Transport } from 'esptool-js';
      //   const transport = new Transport(serialPort);
      //   const loader = new ESPLoader({ transport, baudrate: 460800 });
      //   await loader.main();
      //   await loader.flashData(bin, 0x10000, (pct) => {
      //     setFlashProgress(Math.round(pct));
      //     setFlashStage('flashing');
      //   });
      //
      // For now we simulate the flash process to validate the UI flow.

      // Check if esptool-js is available
      let esptoolAvailable = false;
      try {
        // Dynamic import to avoid build errors when package is not installed
        await import('esptool-js');
        esptoolAvailable = true;
      } catch {
        esptoolAvailable = false;
      }

      if (esptoolAvailable) {
        // Real esptool-js flashing
        const { ESPLoader, Transport } = await import('esptool-js');

        appendLog('Initializing esptool transport...');
        setFlashStage('connecting');
        setFlashProgress(5);

        const transport = new Transport(serialPort as any);
        const loader = new ESPLoader({
          transport,
          baudrate: 460800,
          romBaudrate: 115200,
        });

        appendLog('Connecting to ESP32 bootloader...');
        await loader.main();
        appendLog(`Connected. Chip: ${loader.chipName}, MAC: ${loader.macAddr()}`);
        setFlashProgress(10);

        // Auto-fill MAC address if empty
        const detectedMac = loader.macAddr();
        if (detectedMac && !macAddress) {
          setMacAddress(detectedMac.toUpperCase());
          appendLog(`Auto-detected MAC: ${detectedMac.toUpperCase()}`);
        }

        appendLog('Erasing flash...');
        setFlashStage('erasing');
        setFlashProgress(15);

        // Flash the firmware binary at the standard app partition offset (0x10000)
        appendLog('Writing firmware to flash at 0x10000...');
        setFlashStage('flashing');

        const binArray = new Uint8Array(bin);
        const fileArray = [{ data: binArray, address: 0x10000 }];

        await loader.writeFlash({
          fileArray,
          flashSize: 'keep',
          flashMode: 'keep',
          flashFreq: 'keep',
          eraseAll: false,
          compress: true,
          reportProgress: (_fileIndex: number, written: number, total: number) => {
            const pct = Math.round(15 + (written / total) * 80);
            setFlashProgress(pct);
            appendLog(`Flashing: ${written}/${total} bytes (${pct}%)`);
          },
        });

        appendLog('Verifying...');
        setFlashStage('verifying');
        setFlashProgress(97);

        // Hard reset the device
        await transport.setDTR(false);
        await new Promise((r) => setTimeout(r, 100));
        await transport.setDTR(true);

        appendLog('Flash complete. Device reset.');
        setFlashStage('done');
        setFlashProgress(100);
        setFlashComplete(true);
        toast.success('Firmware flashed successfully!');

        // Disconnect transport (not the serial port)
        await transport.disconnect();
      } else {
        // Simulated flash (esptool-js not installed)
        appendLog('esptool-js not installed. Running simulated flash for UI validation.');
        appendLog('To enable real flashing, run: npm install esptool-js');

        setFlashStage('connecting');
        setFlashProgress(5);
        await new Promise((r) => setTimeout(r, 400));

        setFlashStage('erasing');
        setFlashProgress(15);
        appendLog('Simulated: Erasing flash...');
        await new Promise((r) => setTimeout(r, 600));

        setFlashStage('flashing');
        const totalBytes = bin.byteLength;
        const chunkSize = Math.ceil(totalBytes / 20);
        for (let i = 0; i < 20; i++) {
          const written = Math.min((i + 1) * chunkSize, totalBytes);
          const pct = Math.round(15 + (written / totalBytes) * 80);
          setFlashProgress(pct);
          appendLog(`Simulated: ${written}/${totalBytes} bytes (${pct}%)`);
          await new Promise((r) => setTimeout(r, 150));
        }

        setFlashStage('verifying');
        setFlashProgress(97);
        appendLog('Simulated: Verifying...');
        await new Promise((r) => setTimeout(r, 400));

        setFlashStage('done');
        setFlashProgress(100);
        setFlashComplete(true);
        appendLog('Simulated flash complete.');
        toast.success('Simulated flash complete. Install esptool-js for real flashing.');
      }

      setTimeout(() => goNext(), 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Flash failed';
      setFlashStage('error');
      setFlashError(message);
      appendLog(`Flash error: ${message}`);
      toast.error(`Flash failed: ${message}`);
    }
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
    const clean = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
    const parts = clean.match(/.{1,2}/g);
    return parts ? parts.join(':').substring(0, 17) : clean;
  };

  // Flash stage label
  const getFlashStageLabel = (stage: FlashStage): string => {
    switch (stage) {
      case 'idle': return 'Ready';
      case 'connecting': return 'Connecting to bootloader...';
      case 'erasing': return 'Erasing flash...';
      case 'flashing': return 'Writing firmware...';
      case 'verifying': return 'Verifying...';
      case 'done': return 'Flash complete!';
      case 'error': return 'Flash failed';
      default: return '';
    }
  };

  // Cleanup serial port on unmount
  useEffect(() => {
    return () => {
      if (serialPort) {
        serialPort.close().catch(() => {});
      }
    };
  }, [serialPort]);

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

      {/* Web Serial Support Warning */}
      {!serialSupported && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <WifiOff className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">Web Serial not supported</p>
            <p className="text-xs text-iot-muted mt-1">
              Your browser does not support the Web Serial API. Use Google Chrome or Microsoft Edge
              to connect to ESP32 devices via USB. You can still skip to Step 3 and register devices manually.
            </p>
          </div>
        </div>
      )}

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
                <p className="text-sm font-medium text-iot-primary">
                  {serialConnected ? 'Device Connected' : 'Web Serial Connection'}
                </p>
                <p className="text-xs text-iot-muted mt-1">
                  {serialSupported
                    ? 'Click below to select your ESP32 USB port'
                    : 'Web Serial requires Chrome or Edge browser'}
                </p>
              </div>

              {serialConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-500">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleSerialDisconnect}
                      className="text-iot-muted hover:text-iot-red text-xs"
                    >
                      Disconnect
                    </Button>
                    <Button
                      onClick={goNext}
                      className="gradient-primary text-iot-bg-primary"
                    >
                      Next: Flash Firmware
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleSerialConnect}
                  disabled={!serialSupported || serialConnecting}
                  className="gradient-primary text-iot-bg-primary"
                >
                  {serialConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Usb className="w-4 h-4 mr-2" />
                      Connect via USB
                    </>
                  )}
                </Button>
              )}

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

            {/* Serial Log */}
            {serialLog.length > 0 && (
              <div className="bg-iot-tertiary rounded-xl p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Serial Log
                </p>
                <div className="bg-black/30 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-[11px] text-iot-muted space-y-0.5">
                  {serialLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}
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
                  <div className="flex items-center gap-3 text-xs text-iot-muted">
                    <span>{(latestFirmware.fileSize / 1024).toFixed(1)} KB</span>
                    {firmwareBin && (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Binary cached
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-iot-muted">
                  {firmwareLoading ? 'Loading...' : 'No firmware uploaded yet'}
                </p>
              )}
            </div>

            {/* Download firmware binary button */}
            {latestFirmware && !firmwareBin && (
              <Button
                onClick={handleDownloadFirmware}
                disabled={firmwareDownloading}
                variant="ghost"
                className="w-full border border-iot-subtle text-iot-secondary hover:text-iot-primary"
              >
                {firmwareDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Downloading binary...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Pre-download Firmware Binary
                  </>
                )}
              </Button>
            )}

            {/* Flash controls */}
            <div className="bg-iot-tertiary rounded-xl p-6 text-center space-y-4">
              {/* Progress bar */}
              {flashStage !== 'idle' && (
                <div className="space-y-2">
                  <div className="w-full bg-iot-subtle rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        flashStage === 'error'
                          ? 'bg-red-500'
                          : flashStage === 'done'
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-iot-cyan to-iot-purple'
                      }`}
                      style={{ width: `${flashProgress}%` }}
                    />
                  </div>
                  <p className={`text-xs ${flashStage === 'error' ? 'text-red-400' : 'text-iot-muted'}`}>
                    {getFlashStageLabel(flashStage)} {flashStage !== 'done' && flashStage !== 'error' && `${flashProgress}%`}
                  </p>
                </div>
              )}

              {/* Error display */}
              {flashError && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-left">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">{flashError}</p>
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
                  disabled={
                    !latestFirmware ||
                    flashStage === 'connecting' ||
                    flashStage === 'erasing' ||
                    flashStage === 'flashing' ||
                    flashStage === 'verifying'
                  }
                  className="gradient-primary text-iot-bg-primary"
                >
                  {flashStage !== 'idle' && flashStage !== 'error' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Flashing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      {!serialConnected ? 'Flash Firmware (Simulated)' : 'Flash Firmware'}
                    </>
                  )}
                </Button>
              )}

              {!serialConnected && (
                <p className="text-xs text-amber-400">
                  No serial port connected. Flash will run in simulation mode.
                  {!serialSupported && ' Install Chrome or Edge for real flashing.'}
                </p>
              )}
            </div>

            {/* Serial Log */}
            {serialLog.length > 0 && (
              <div className="bg-iot-tertiary rounded-xl p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
                  Flash Log
                </p>
                <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-[11px] text-iot-muted space-y-0.5">
                  {serialLog.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              </div>
            )}

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
              {macAddress
                ? 'MAC address was auto-detected. Verify and enter a device name.'
                : 'Enter the MAC address and a name for this device.'}
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
                  setSerialPort(null);
                  setFlashProgress(0);
                  setFlashComplete(false);
                  setFlashStage('idle');
                  setFlashError(null);
                  setRegisterError(null);
                  setSerialLog([]);
                  setFirmwareBin(null);
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
