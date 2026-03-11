import React, { useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeviceStickerProps {
  licenseKey: string;
  macAddress: string;
  deviceName: string;
  firmwareVersion: string;
}

export const DeviceSticker: React.FC<DeviceStickerProps> = ({
  licenseKey,
  macAddress,
  deviceName,
  firmwareVersion,
}) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const wifiApName = `MUSH_${licenseKey.slice(-4)}`;
  const wifiPassword = '123456';

  useEffect(() => {
    if (barcodeRef.current && licenseKey) {
      JsBarcode(barcodeRef.current, licenseKey, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: false,
        margin: 0,
      });
    }
  }, [licenseKey]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Print button - hidden in print */}
      <div className="print:hidden flex justify-end">
        <Button onClick={handlePrint} className="gradient-primary text-iot-bg-primary">
          <Printer className="w-4 h-4 mr-2" />
          Print Sticker
        </Button>
      </div>

      {/* Sticker container - 62mm wide for thermal printers */}
      <div
        id="device-sticker"
        className="mx-auto bg-white text-black rounded-xl p-4 shadow-lg print:shadow-none print:rounded-none"
        style={{ width: '62mm', minHeight: '80mm' }}
      >
        {/* Header */}
        <div className="text-center border-b border-gray-300 pb-2 mb-3">
          <h3 className="text-sm font-bold tracking-wide uppercase">MushroomIoT</h3>
          <p className="text-[10px] text-gray-500">{deviceName}</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-3">
          <QRCodeSVG
            value={licenseKey}
            size={120}
            level="M"
            includeMargin={false}
          />
        </div>

        {/* License Key */}
        <div className="text-center mb-3">
          <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">License Key</p>
          <p className="text-xs font-mono font-bold tracking-wide">{licenseKey}</p>
        </div>

        {/* Barcode */}
        <div className="flex justify-center mb-3">
          <svg ref={barcodeRef} className="w-full max-w-[200px]" />
        </div>

        {/* Device Info Grid */}
        <div className="space-y-1.5 text-[10px] border-t border-gray-300 pt-2">
          <div className="flex justify-between">
            <span className="text-gray-500">MAC</span>
            <span className="font-mono font-medium">{macAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Firmware</span>
            <span className="font-mono font-medium">v{firmwareVersion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">WiFi AP</span>
            <span className="font-mono font-medium">{wifiApName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">WiFi Pass</span>
            <span className="font-mono font-medium">{wifiPassword}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-3 pt-2 border-t border-gray-300">
          <p className="text-[8px] text-gray-400">Scan QR to onboard device</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #device-sticker,
          #device-sticker * {
            visibility: visible;
          }
          #device-sticker {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 8mm;
          }
        }
      `}</style>
    </div>
  );
};

export default DeviceSticker;
