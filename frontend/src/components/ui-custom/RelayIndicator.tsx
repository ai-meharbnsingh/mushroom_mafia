import React from 'react';
import type { RelayState, TriggerType } from '@/types';

interface RelayIndicatorProps {
  label: string;
  state: RelayState;
  trigger: TriggerType;
}

export const RelayIndicator: React.FC<RelayIndicatorProps> = ({
  label,
  state,
  trigger,
}) => {
  const isOn = state === 'ON';
  
  const triggerColors: Record<TriggerType, string> = {
    AUTO: '#2EEFFF',
    MANUAL: '#B26CFF',
    SCHEDULE: '#FFD166',
  };
  
  return (
    <div className="flex flex-col items-center">
      <div
        className="w-3 h-3 rounded-full mb-1"
        style={{
          backgroundColor: isOn ? '#27FB6B' : '#6D7484',
          boxShadow: isOn ? '0 0 8px #27FB6B' : 'none',
          opacity: isOn ? 1 : 0.5,
        }}
      />
      <span className="text-[9px] text-iot-secondary">{label}</span>
      <span
        className="text-[8px] font-medium uppercase"
        style={{ color: triggerColors[trigger] }}
      >
        {trigger}
      </span>
    </div>
  );
};

export default RelayIndicator;
