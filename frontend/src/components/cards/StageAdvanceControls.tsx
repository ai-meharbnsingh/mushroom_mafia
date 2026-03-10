import React, { useState } from 'react';
import { ArrowRight, Play, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { GrowthCycle, ClimateAdvisory, GrowthStage } from '@/types';

interface StageAdvanceControlsProps {
  growthCycle: GrowthCycle | null;
  advisory: ClimateAdvisory | null;
  onAdvanceStage: () => void;
  onStartCycle: (data: { roomId: number }) => void;
  isAdvancing?: boolean;
  roomId: number;
}

const STAGE_ORDER: GrowthStage[] = [
  'INOCULATION',
  'SPAWN_RUN',
  'INCUBATION',
  'FRUITING',
  'HARVEST',
  'IDLE',
];

const STAGE_LABELS: Record<GrowthStage, string> = {
  INOCULATION: 'Inoculation',
  SPAWN_RUN: 'Spawn Run',
  INCUBATION: 'Incubation',
  FRUITING: 'Fruiting',
  HARVEST: 'Harvest',
  IDLE: 'Idle',
};

function formatRange(min: number | null, max: number | null, unit: string): string {
  if (min === null && max === null) return 'N/A';
  if (min === null) return `<= ${max}${unit}`;
  if (max === null) return `>= ${min}${unit}`;
  return `${min}-${max}${unit}`;
}

export const StageAdvanceControls: React.FC<StageAdvanceControlsProps> = ({
  growthCycle,
  advisory,
  onAdvanceStage,
  onStartCycle,
  isAdvancing = false,
  roomId,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // No growth cycle -> show start button
  if (!growthCycle) {
    return (
      <Button
        onClick={() => onStartCycle({ roomId })}
        className="gradient-primary text-iot-bg-primary text-sm"
      >
        <Play className="w-4 h-4 mr-2" />
        Start Growth Cycle
      </Button>
    );
  }

  // At IDLE stage -> cycle is complete, can start a new one
  if (growthCycle.currentStage === 'IDLE') {
    return (
      <Button
        onClick={() => onStartCycle({ roomId })}
        className="gradient-primary text-iot-bg-primary text-sm"
      >
        <Play className="w-4 h-4 mr-2" />
        Start New Cycle
      </Button>
    );
  }

  // Determine next stage
  const currentIdx = STAGE_ORDER.indexOf(growthCycle.currentStage);
  const nextStage = currentIdx < STAGE_ORDER.length - 1 ? STAGE_ORDER[currentIdx + 1] : null;

  if (!nextStage) return null;

  const autoAdjust = growthCycle.autoAdjustThresholds;
  const nextPreview = advisory?.nextStagePreview;

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={isAdvancing}
        variant="outline"
        className="border-iot-cyan/30 text-iot-cyan hover:bg-iot-cyan/10 text-sm"
      >
        {isAdvancing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Advancing...
          </>
        ) : (
          <>
            <ArrowRight className="w-4 h-4 mr-2" />
            Advance to {STAGE_LABELS[nextStage]}
          </>
        )}
      </Button>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-iot-secondary border-iot-subtle text-iot-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-iot-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-iot-yellow" />
              Advance Growth Stage
            </DialogTitle>
            <DialogDescription className="text-iot-muted">
              Advance from{' '}
              <span className="text-iot-primary font-semibold">
                {STAGE_LABELS[growthCycle.currentStage]}
              </span>{' '}
              to{' '}
              <span className="text-iot-primary font-semibold">
                {STAGE_LABELS[nextStage]}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Threshold change preview */}
            {autoAdjust && nextPreview ? (
              <div className="bg-iot-tertiary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-iot-cyan">
                  Thresholds will auto-adjust to:
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-iot-muted">Temperature</p>
                    <p className="text-iot-primary font-mono">
                      {formatRange(nextPreview.tempMin, nextPreview.tempMax, '\u00B0C')}
                    </p>
                  </div>
                  <div>
                    <p className="text-iot-muted">Humidity</p>
                    <p className="text-iot-primary font-mono">
                      {formatRange(nextPreview.humidityMin, nextPreview.humidityMax, '%')}
                    </p>
                  </div>
                  <div>
                    <p className="text-iot-muted">CO2</p>
                    <p className="text-iot-primary font-mono">
                      {formatRange(nextPreview.co2Min, nextPreview.co2Max, ' ppm')}
                    </p>
                  </div>
                </div>
              </div>
            ) : autoAdjust ? (
              <div className="bg-iot-tertiary/30 rounded-lg p-3">
                <p className="text-xs text-iot-secondary">
                  Thresholds will auto-adjust for the new stage if guidelines are configured.
                </p>
              </div>
            ) : (
              <div className="bg-iot-yellow/5 border border-iot-yellow/15 rounded-lg p-3">
                <p className="text-xs text-iot-secondary">
                  Auto-adjust is <span className="text-iot-yellow font-semibold">OFF</span>.
                  Thresholds will not change automatically. You can apply recommendations
                  manually from the Climate Advisory panel.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
              disabled={isAdvancing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                onAdvanceStage();
              }}
              disabled={isAdvancing}
              className="gradient-primary text-iot-bg-primary"
            >
              {isAdvancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Advancing...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Confirm Advance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
