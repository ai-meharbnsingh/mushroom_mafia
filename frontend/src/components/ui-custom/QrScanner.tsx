import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { QrScanResult } from '@/types';

interface QrScannerProps {
  onScan: (data: QrScanResult) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}

const LICENSE_KEY_PATTERN = /^LIC-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

function isValidQrPayload(data: unknown): data is QrScanResult {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.v === 'number' &&
    typeof obj.lic === 'string' &&
    typeof obj.ap === 'string' &&
    typeof obj.pw === 'string'
  );
}

export const QrScanner: React.FC<QrScannerProps> = ({ onScan, onError, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isStarting, setIsStarting] = useState(true);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (manualMode) return;

    mountedRef.current = true;
    const elementId = 'qr-reader-container';
    let scanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        scanner = new Html5Qrcode(elementId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Try JSON format first (provisioning QR)
            try {
              const parsed = JSON.parse(decodedText);
              if (isValidQrPayload(parsed)) {
                if (scanner?.isScanning) {
                  scanner.stop().catch(() => {});
                }
                onScan(parsed);
                return;
              }
            } catch {
              // Not JSON - try plain license key format
            }

            // Try plain license key format (LIC-XXXX-YYYY-ZZZZ)
            const text = decodedText.trim().toUpperCase();
            if (LICENSE_KEY_PATTERN.test(text)) {
              if (scanner?.isScanning) {
                scanner.stop().catch(() => {});
              }
              onScan({
                v: 1,
                lic: text,
                ap: `MUSH_${text.slice(-4)}`,
                pw: '123456',
              });
              return;
            }

            setScanError('Invalid QR code. Expected device provisioning QR or license key.');
          },
          () => {
            // Scan failure callback (no QR found yet) -- silent
          }
        );

        if (mountedRef.current) {
          setIsStarting(false);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to start camera';
        if (mountedRef.current) {
          setIsStarting(false);
          setScanError(message);
          onError(message);
        }
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [onScan, onError, manualMode]);

  const handleManualSubmit = () => {
    const key = manualKey.trim().toUpperCase();
    if (!LICENSE_KEY_PATTERN.test(key)) {
      setManualError('Invalid format. Expected: LIC-XXXX-YYYY-ZZZZ');
      return;
    }
    setManualError(null);
    onScan({
      v: 1,
      lic: key,
      ap: `MUSH_${key.slice(-4)}`,
      pw: '123456',
    });
  };

  const switchToManual = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    scannerRef.current = null;
    setManualMode(true);
    setScanError(null);
  };

  const switchToCamera = () => {
    setManualMode(false);
    setManualKey('');
    setManualError(null);
    setIsStarting(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-iot-primary">
          <Camera className="w-5 h-5 text-iot-cyan" />
          <span className="text-sm font-medium">
            {manualMode ? 'Enter License Key' : 'Scan Device QR Code'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-iot-secondary hover:text-iot-primary"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {manualMode ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wider text-iot-secondary mb-2">
              License Key
            </label>
            <Input
              type="text"
              value={manualKey}
              onChange={(e) => {
                setManualKey(e.target.value.toUpperCase());
                setManualError(null);
              }}
              placeholder="LIC-XXXX-YYYY-ZZZZ"
              className="input-dark w-full font-mono"
              onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            />
            {manualError && (
              <p className="text-xs text-red-400 mt-1">{manualError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleManualSubmit}
              disabled={!manualKey.trim()}
              className="flex-1 gradient-primary text-iot-bg-primary"
            >
              Submit
            </Button>
            <Button
              variant="ghost"
              onClick={switchToCamera}
              className="text-iot-secondary hover:text-iot-primary"
            >
              <Camera className="w-4 h-4 mr-2" />
              Use Camera
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative bg-iot-tertiary rounded-xl overflow-hidden"
            style={{ minHeight: '300px' }}
          >
            <div id="qr-reader-container" className="w-full" />

            {isStarting && (
              <div className="absolute inset-0 flex items-center justify-center bg-iot-tertiary">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-iot-cyan border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-iot-muted">Starting camera...</p>
                </div>
              </div>
            )}
          </div>

          {scanError && (
            <div className="flex items-start gap-2 p-3 bg-iot-red/10 border border-iot-red/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-iot-red flex-shrink-0 mt-0.5" />
              <p className="text-xs text-iot-red">{scanError}</p>
            </div>
          )}

          <p className="text-xs text-iot-muted text-center">
            Point your camera at the QR code on the device label
          </p>

          <Button
            variant="ghost"
            onClick={switchToManual}
            className="w-full text-iot-secondary hover:text-iot-primary"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Enter Manually Instead
          </Button>
        </>
      )}
    </div>
  );
};

export default QrScanner;
