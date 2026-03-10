import React, { useEffect, useState } from 'react';
import { QrCode, Download, Printer, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deviceService } from '@/services/deviceService';

interface ViewQrDialogProps {
  deviceId: string;
  deviceName: string;
  open: boolean;
  onClose: () => void;
}

export const ViewQrDialog: React.FC<ViewQrDialogProps> = ({
  deviceId,
  deviceName,
  open,
  onClose,
}) => {
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !deviceId) return;

    setIsLoading(true);
    setError(null);
    setQrImage(null);

    deviceService.getQrImage(deviceId)
      .then((data) => {
        if (data?.image) {
          setQrImage(data.image);
        } else {
          setError('No QR code image available for this device.');
        }
      })
      .catch((err: any) => {
        const detail = err?.response?.data?.detail;
        const message = typeof detail === 'string' ? detail : 'Failed to load QR image';
        setError(message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, deviceId]);

  const handleDownload = () => {
    if (!qrImage) return;

    // Create a data URL if not already one
    const dataUrl = qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${deviceName.replace(/\s+/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!qrImage) return;

    const dataUrl = qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${deviceName}</title>
            <style>
              body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: sans-serif; }
              img { max-width: 400px; width: 100%; }
              h2 { margin-bottom: 8px; }
              p { color: #666; margin-top: 0; }
            </style>
          </head>
          <body>
            <h2>${deviceName}</h2>
            <p>Device QR Code</p>
            <img src="${dataUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="bg-iot-secondary border-iot-subtle max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-iot-primary flex items-center gap-2">
            <QrCode className="w-5 h-5 text-iot-cyan" />
            Device QR Code
          </DialogTitle>
          <DialogDescription className="text-iot-muted">
            {deviceName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          {isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="w-8 h-8 text-iot-cyan animate-spin" />
              <p className="text-sm text-iot-muted">Loading QR code...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="w-8 h-8 text-iot-muted" />
              <p className="text-sm text-iot-muted text-center">{error}</p>
            </div>
          )}

          {qrImage && !isLoading && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-4">
                <img
                  src={qrImage.startsWith('data:') ? qrImage : `data:image/png;base64,${qrImage}`}
                  alt={`QR Code for ${deviceName}`}
                  className="w-64 h-64 object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {qrImage && !isLoading && (
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="border-iot-subtle text-iot-secondary flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-iot-subtle text-iot-secondary flex-1"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewQrDialog;
