import React from 'react';

interface SmallGaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  size?: number;
  label?: string;
  getColor?: (value: number) => string;
}

export const SmallGauge: React.FC<SmallGaugeProps> = ({
  value,
  min,
  max,
  unit,
  size = 70,
  label,
  getColor,
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const strokeDashoffset = circumference * (1 - percentage);
  
  // Default color function
  const defaultGetColor = (v: number) => {
    const range = max - min;
    const warningLow = min + range * 0.15;
    const warningHigh = max - range * 0.15;
    
    if (v < warningLow || v > warningHigh) {
      return v < min || v > max ? '#FF2D55' : '#FFD166';
    }
    return '#27FB6B';
  };
  
  const color = getColor ? getColor(value) : defaultGetColor(value);
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="gauge-ring"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 4px ${color}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold mono" style={{ color: '#F5F7FF' }}>
            {value.toFixed(unit === '%' ? 1 : 0)}
          </span>
          <span className="text-[10px] text-iot-muted">{unit}</span>
        </div>
      </div>
      {label && (
        <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-iot-secondary">
          {label}
        </span>
      )}
    </div>
  );
};

export default SmallGauge;
