import React, { useState } from 'react';
import { QrCode, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrScanner } from '@/components/ui-custom/QrScanner';
import { deviceService } from '@/services/deviceService';
import { useToast } from '@/hooks/useToast';
import type { QrScanResult } from '@/types';

interface LinkDeviceDialogProps {
  roomId: string;
  roomName: string;
  open: boolean;
  onClose: () => void;
}

type LinkStep = 'scan' | 'confirm' | 'success';

export const LinkDeviceDialog: React.FC<LinkDeviceDialogProps> = ({
  roomId,
  roomName,
  open,
  onClose,
}) => {
  const toast = useToast();
  const [step, setStep] = useState<LinkStep>('scan');
  const [scannedData, setScannedData] = useState<QrScanResult | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const handleScan = (data: QrScanResult) => {
    setScannedData(data);
    setStep('confirm');
  };

  const handleScanError = (msg: string) => {
    toast.error('Camera Error', msg);
  };

  const handleConfirmLink = async () => {
    if (!scannedData) return;

    setIsLinking(true);
    try {
      await deviceService.linkDevice({
        license_key: scannedData.lic,
        room_id: Number(roomId),
      });
      setStep('success');
      toast.success('Device Linked', `Device linked to ${roomName} successfully. Awaiting admin approval.`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : 'Failed to link device';
      toast.error('Link Failed', message);
    } finally {
      setIsLinking(false);
    }
  };

  const handleClose = () => {
    setStep('scan');
    setScannedData(null);
    setIsLinking(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="bg-iot-secondary border-iot-subtle max-w-md">
        <DialogHeader>
          <DialogTitle className="text-iot-primary flex items-center gap-2">
            <QrCode className="w-5 h-5 text-iot-cyan" />
            Link Device to Room
          </DialogTitle>
          <DialogDescription className="text-iot-muted">
            Scan the QR code on the device to link it to <span className="text-iot-cyan font-medium">{roomName}</span>
          </DialogDescription>
        </DialogHeader>

        {step === 'scan' && (
          <QrScanner
            onScan={handleScan}
            onError={handleScanError}
            onClose={handleClose}
          />
        )}

        {step === 'confirm' && scannedData && (
          <div className="space-y-4">
            <div className="bg-iot-tertiary rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-iot-primary">Device Found</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-iot-muted">License Key</p>
                  <p className="text-sm font-mono text-iot-cyan">{scannedData.lic}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted">AP Name</p>
                  <p className="text-sm font-mono text-iot-primary">{scannedData.ap}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted">Target Room</p>
                  <p className="text-sm text-iot-primary">{roomName}</p>
                </div>
                <div>
                  <p className="text-xs text-iot-muted">QR Version</p>
                  <p className="text-sm text-iot-primary">v{scannedData.v}</p>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button
                variant="outline"
                onClick={() => { setStep('scan'); setScannedData(null); }}
                className="border-iot-subtle text-iot-secondary"
              >
                Re-scan
              </Button>
              <Button
                onClick={handleConfirmLink}
                disabled={isLinking}
                className="gradient-primary text-iot-bg-primary"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Linking...
                  </>
                ) : (
                  'Confirm Link'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-4 text-center py-4">
            <div className="w-16 h-16 rounded-full bg-iot-green/20 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-iot-green" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-iot-primary">Device Linked</h4>
              <p className="text-sm text-iot-muted mt-1">
                The device has been linked to {roomName} and is pending admin approval.
              </p>
            </div>
            <DialogFooter>
              <Button
                onClick={handleClose}
                className="gradient-primary text-iot-bg-primary w-full"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LinkDeviceDialog;
