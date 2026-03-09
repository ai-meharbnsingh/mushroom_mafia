import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'purple';
  suffix?: string;
  animate?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'cyan',
  suffix = '',
  animate = true,
}) => {
  const valueRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const colorMap = {
    cyan: { text: '#2EEFFF', bg: 'rgba(46, 239, 255, 0.1)' },
    green: { text: '#27FB6B', bg: 'rgba(39, 251, 107, 0.1)' },
    yellow: { text: '#FFD166', bg: 'rgba(255, 209, 102, 0.1)' },
    red: { text: '#FF2D55', bg: 'rgba(255, 45, 85, 0.1)' },
    purple: { text: '#B26CFF', bg: 'rgba(178, 108, 255, 0.1)' },
  };
  
  const colors = colorMap[color];
  
  useEffect(() => {
    if (animate && valueRef.current) {
      gsap.fromTo(
        valueRef.current,
        { innerText: 0 },
        {
          innerText: value,
          duration: 0.8,
          ease: 'power2.out',
          snap: { innerText: 1 },
        }
      );
    }
    
    if (animate && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 16 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          ease: 'power3.out',
        }
      );
    }
  }, [value, animate]);
  
  return (
    <div
      ref={cardRef}
      className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle shadow-iot-card card-hover"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: colors.bg }}
          >
            <Icon className="w-6 h-6" style={{ color: colors.text }} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-iot-secondary">
              {title}
            </p>
            <div className="flex items-baseline gap-1">
              <span
                ref={valueRef}
                className="text-2xl font-bold mono"
                style={{ color: '#F5F7FF' }}
              >
                {animate ? 0 : value}
              </span>
              {suffix && (
                <span className="text-sm text-iot-muted">{suffix}</span>
              )}
            </div>
          </div>
        </div>
        {color === 'red' && value > 0 && (
          <div
            className="w-3 h-3 rounded-full animate-pulse-glow"
            style={{ backgroundColor: colors.text, boxShadow: `0 0 8px ${colors.text}` }}
          />
        )}
      </div>
    </div>
  );
};

export default MetricCard;
