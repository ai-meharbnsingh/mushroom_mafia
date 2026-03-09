import React, { useState } from 'react';
import type { RelayState, TriggerType } from '@/types';

interface RelayToggleProps {
  label: string;
  state: RelayState;
  trigger: TriggerType;
  onToggle: (state: RelayState) => void;
  disabled?: boolean;
}

export const RelayToggle: React.FC<RelayToggleProps> = ({
  label,
  state,
  trigger,
  onToggle,
  disabled = false,
}) => {
  const [isPending, setIsPending] = useState(false);
  const isOn = state === 'ON';
  
  const triggerColors: Record<TriggerType, string> = {
    AUTO: '#2EEFFF',
    MANUAL: '#B26CFF',
    SCHEDULE: '#FFD166',
  };
  
  const handleToggle = () => {
    if (disabled || isPending) return;
    
    setIsPending(true);
    const newState = isOn ? 'OFF' : 'ON';
    onToggle(newState);
    
    // Simulate confirmation delay
    setTimeout(() => {
      setIsPending(false);
    }, 500);
  };
  
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-iot-secondary mb-2">{label}</span>
      
      <button
        onClick={handleToggle}
        disabled={disabled || isPending}
        className={`
          relative w-12 h-6 rounded-full transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOn ? 'bg-iot-green' : 'bg-iot-tertiary'}
        `}
        style={{
          boxShadow: isOn ? '0 0 10px rgba(39, 251, 107, 0.4)' : 'none',
        }}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
            ${isOn ? 'translate-x-7' : 'translate-x-1'}
          `}
          style={{
            animation: isPending ? 'pulse 0.5s ease-in-out infinite' : 'none',
          }}
        />
      </button>
      
      <span
        className="text-[9px] font-medium uppercase mt-1.5"
        style={{ color: triggerColors[trigger] }}
      >
        {isPending ? 'Pending...' : trigger}
      </span>
      
      <span className="text-[9px] text-iot-muted mt-0.5">
        {isOn ? 'ON' : 'OFF'}
      </span>
    </div>
  );
};

export default RelayToggle;
