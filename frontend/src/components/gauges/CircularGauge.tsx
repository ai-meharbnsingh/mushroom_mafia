import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface CircularGaugeProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  getColor?: (value: number) => string;
  animate?: boolean;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  min,
  max,
  unit,
  size = 120,
  strokeWidth = 8,
  label,
  getColor,
  animate = true,
}) => {
  const valueRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const strokeDashoffset = circumference * (1 - percentage);
  
  // Determine color
  const color = getColor ? getColor(value) : '#27FB6B';
  
  useEffect(() => {
    if (animate && valueRef.current) {
      gsap.to(valueRef.current, {
        innerText: value,
        duration: 0.8,
        ease: 'power2.out',
        snap: { innerText: unit === 'ppm' ? 1 : 0.1 },
      });
    }
    
    if (animate && ringRef.current) {
      gsap.to(ringRef.current, {
        strokeDashoffset,
        duration: 0.8,
        ease: 'power2.out',
      });
    }
  }, [value, strokeDashoffset, animate, unit]);
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="gauge-ring"
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Value ring */}
          <circle
            ref={ringRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 6px ${color}40)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            ref={valueRef}
            className="text-2xl font-semibold mono"
            style={{ color: '#F5F7FF' }}
          >
            {animate ? 0 : value}
          </span>
          <span className="text-xs text-iot-muted">{unit}</span>
        </div>
      </div>
      {label && (
        <span className="mt-2 text-xs font-medium uppercase tracking-wider text-iot-secondary">
          {label}
        </span>
      )}
    </div>
  );
};

export default CircularGauge;
