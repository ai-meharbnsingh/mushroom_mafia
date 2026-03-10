import React, { useState } from 'react';
import type { RelayType, RelayMode } from '@/types';

interface RelayToggleProps {
  relay: RelayType;
  label: string;
  isOn: boolean;
  mode: RelayMode;
  triggerType: string;
  thresholdParam?: string | null;
  scheduleInfo?: string;
  onToggle: (state: 'ON' | 'OFF') => void;
  onModeChange: (mode: RelayMode) => void;
  onEditSchedule?: () => void;
}

const modeColors: Record<RelayMode, { bg: string; text: string; border: string; glow: string }> = {
  MANUAL: {
    bg: 'rgba(178, 108, 255, 0.15)',
    text: '#B26CFF',
    border: 'rgba(178, 108, 255, 0.3)',
    glow: 'rgba(178, 108, 255, 0.2)',
  },
  AUTO: {
    bg: 'rgba(46, 239, 255, 0.15)',
    text: '#2EEFFF',
    border: 'rgba(46, 239, 255, 0.3)',
    glow: 'rgba(46, 239, 255, 0.2)',
  },
  SCHEDULE: {
    bg: 'rgba(255, 209, 102, 0.15)',
    text: '#FFD166',
    border: 'rgba(255, 209, 102, 0.3)',
    glow: 'rgba(255, 209, 102, 0.2)',
  },
};

export const RelayToggle: React.FC<RelayToggleProps> = ({
  relay,
  label,
  isOn,
  mode,
  triggerType,
  thresholdParam,
  scheduleInfo,
  onToggle,
  onModeChange,
  onEditSchedule,
}) => {
  const [isPending, setIsPending] = useState(false);
  const colors = modeColors[mode];

  const handleToggle = () => {
    if (mode !== 'MANUAL' || isPending) return;
    setIsPending(true);
    const newState = isOn ? 'OFF' : 'ON';
    onToggle(newState);
    setTimeout(() => setIsPending(false), 500);
  };

  const handleModeChange = (newMode: RelayMode) => {
    if (newMode === mode) return;
    onModeChange(newMode);
  };

  const triggerColors: Record<string, string> = {
    AUTO: '#2EEFFF',
    MANUAL: '#B26CFF',
    SCHEDULE: '#FFD166',
  };

  return (
    <div
      className="rounded-xl p-3 flex flex-col gap-2 transition-all duration-200"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Mode selector tabs */}
      <div className="flex gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
        {(['MANUAL', 'AUTO', 'SCHEDULE'] as RelayMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className="flex-1 text-[8px] font-bold uppercase py-1 rounded-md transition-all duration-150"
            style={{
              backgroundColor: mode === m ? modeColors[m].bg : 'transparent',
              color: mode === m ? modeColors[m].text : '#6D7484',
              border: mode === m ? `1px solid ${modeColors[m].border}` : '1px solid transparent',
            }}
          >
            {m === 'SCHEDULE' ? 'SCHED' : m}
          </button>
        ))}
      </div>

      {/* Relay name + state indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-iot-primary truncate">{label}</span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isOn ? '#27FB6B' : '#6D7484',
              boxShadow: isOn ? '0 0 6px rgba(39, 251, 107, 0.5)' : 'none',
            }}
          />
          <span
            className="text-[10px] font-bold"
            style={{ color: isOn ? '#27FB6B' : '#6D7484' }}
          >
            {isOn ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>

      {/* Mode-specific content */}
      <div className="min-h-[40px] flex flex-col justify-center">
        {mode === 'MANUAL' && (
          <button
            onClick={handleToggle}
            disabled={isPending}
            className="relative w-full h-7 rounded-full transition-all duration-200"
            style={{
              backgroundColor: isOn ? 'rgba(39, 251, 107, 0.2)' : 'rgba(109, 116, 132, 0.2)',
              border: `1px solid ${isOn ? 'rgba(39, 251, 107, 0.3)' : 'rgba(109, 116, 132, 0.3)'}`,
              cursor: isPending ? 'wait' : 'pointer',
            }}
          >
            <div
              className="absolute top-0.5 w-6 h-6 rounded-full transition-transform duration-200 flex items-center justify-center"
              style={{
                backgroundColor: isOn ? '#27FB6B' : '#6D7484',
                transform: isOn ? 'translateX(calc(100% + 14px))' : 'translateX(2px)',
                boxShadow: isOn ? '0 0 8px rgba(39, 251, 107, 0.4)' : 'none',
                animation: isPending ? 'pulse 0.5s ease-in-out infinite' : 'none',
              }}
            >
              <span className="text-[8px] font-bold text-iot-bg-primary">
                {isPending ? '...' : isOn ? 'ON' : 'OFF'}
              </span>
            </div>
          </button>
        )}

        {mode === 'AUTO' && (
          <div className="space-y-1">
            <div
              className="text-[9px] font-medium px-2 py-1 rounded-md text-center"
              style={{ backgroundColor: modeColors.AUTO.bg, color: modeColors.AUTO.text }}
            >
              Auto Control
            </div>
            {thresholdParam && (
              <div className="text-[8px] text-iot-muted text-center">
                Linked: <span style={{ color: modeColors.AUTO.text }}>{thresholdParam}</span>
              </div>
            )}
            <div className="text-[8px] text-iot-muted text-center">
              High&#8594;ON / Low&#8594;OFF
            </div>
          </div>
        )}

        {mode === 'SCHEDULE' && (
          <div className="space-y-1">
            <div
              className="text-[9px] font-medium px-2 py-1 rounded-md text-center"
              style={{ backgroundColor: modeColors.SCHEDULE.bg, color: modeColors.SCHEDULE.text }}
            >
              {scheduleInfo || 'No schedule set'}
            </div>
            {onEditSchedule && (
              <button
                onClick={onEditSchedule}
                className="text-[9px] w-full text-center py-0.5 rounded transition-colors"
                style={{ color: modeColors.SCHEDULE.text }}
              >
                Edit Schedule
              </button>
            )}
          </div>
        )}
      </div>

      {/* Trigger type badge */}
      <div className="flex justify-center">
        <span
          className="text-[8px] font-medium uppercase px-2 py-0.5 rounded-full"
          style={{
            color: triggerColors[triggerType] || '#6D7484',
            backgroundColor: `${triggerColors[triggerType] || '#6D7484'}15`,
            border: `1px solid ${triggerColors[triggerType] || '#6D7484'}30`,
          }}
        >
          {triggerType}
        </span>
      </div>
    </div>
  );
};

export default RelayToggle;
