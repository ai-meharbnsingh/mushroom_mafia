import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import type { RelayScheduleItem, RelayType } from '@/types';

interface ScheduleEditorProps {
  open: boolean;
  onClose: () => void;
  relay: RelayType;
  relayLabel: string;
  schedule?: RelayScheduleItem | null;
  onSave: (schedule: Omit<RelayScheduleItem, 'scheduleId'> & { scheduleId?: number }) => void;
  onDelete?: (scheduleId: number) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// daysOfWeek is a bitmask: bit 0 = Mon, bit 1 = Tue, ..., bit 6 = Sun
function daysToMask(days: boolean[]): number {
  return days.reduce((mask, checked, i) => (checked ? mask | (1 << i) : mask), 0);
}

function maskToDays(mask: number): boolean[] {
  return DAY_LABELS.map((_, i) => Boolean(mask & (1 << i)));
}

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  open,
  onClose,
  relay,
  relayLabel,
  schedule,
  onSave,
  onDelete,
}) => {
  const [days, setDays] = useState<boolean[]>(new Array(7).fill(false));
  const [timeOn, setTimeOn] = useState('08:00');
  const [timeOff, setTimeOff] = useState('18:00');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (schedule) {
      setDays(maskToDays(schedule.daysOfWeek));
      setTimeOn(schedule.timeOn);
      setTimeOff(schedule.timeOff);
      setIsActive(schedule.isActive);
    } else {
      // Default: Mon-Fri selected
      setDays([true, true, true, true, true, false, false]);
      setTimeOn('08:00');
      setTimeOff('18:00');
      setIsActive(true);
    }
  }, [schedule, open]);

  const toggleDay = (index: number) => {
    setDays((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const handleSave = () => {
    const scheduleData: Omit<RelayScheduleItem, 'scheduleId'> & { scheduleId?: number } = {
      relayType: relay,
      daysOfWeek: daysToMask(days),
      timeOn,
      timeOff,
      isActive,
    };
    if (schedule) {
      scheduleData.scheduleId = schedule.scheduleId;
    }
    onSave(scheduleData);
    onClose();
  };

  const handleDelete = () => {
    if (schedule && onDelete) {
      onDelete(schedule.scheduleId);
      onClose();
    }
  };

  const hasAnyDay = days.some(Boolean);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-[#11131A] border-[rgba(255,255,255,0.06)] text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-iot-primary">
            {schedule ? 'Edit' : 'Create'} Schedule - {relayLabel}
          </DialogTitle>
          <DialogDescription className="text-iot-muted">
            Set the days and times for automatic relay control.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Day of week checkboxes */}
          <div>
            <label className="text-xs font-medium text-iot-secondary mb-2 block">Days of Week</label>
            <div className="flex gap-2">
              {DAY_LABELS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all duration-150"
                    style={{
                      backgroundColor: days[i] ? 'rgba(255, 209, 102, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${days[i] ? 'rgba(255, 209, 102, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                      color: days[i] ? '#FFD166' : '#6D7484',
                    }}
                  >
                    {day}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-iot-secondary mb-1.5 block">Time ON</label>
              <Input
                type="time"
                value={timeOn}
                onChange={(e) => setTimeOn(e.target.value)}
                className="input-dark"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-iot-secondary mb-1.5 block">Time OFF</label>
              <Input
                type="time"
                value={timeOff}
                onChange={(e) => setTimeOff(e.target.value)}
                className="input-dark"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-iot-primary">Active</label>
              <p className="text-xs text-iot-muted">Enable or disable this schedule</p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {schedule && onDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 mr-auto"
            >
              Delete
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasAnyDay}
            className="gradient-primary text-iot-bg-primary"
          >
            {schedule ? 'Update' : 'Create'} Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleEditor;
