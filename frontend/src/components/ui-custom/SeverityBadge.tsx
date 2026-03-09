import React from 'react';
import type { AlertSeverity } from '@/types';

interface SeverityBadgeProps {
  severity: AlertSeverity;
  text?: string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  text,
}) => {
  const config = {
    CRITICAL: { bg: 'rgba(255, 45, 85, 0.15)', color: '#FF2D55', glow: '0 0 8px rgba(255, 45, 85, 0.4)' },
    WARNING: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166', glow: '0 0 8px rgba(255, 209, 102, 0.4)' },
    INFO: { bg: 'rgba(46, 239, 255, 0.15)', color: '#2EEFFF', glow: '0 0 8px rgba(46, 239, 255, 0.4)' },
  };
  
  const { bg, color, glow } = config[severity];
  
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide"
      style={{
        backgroundColor: bg,
        color,
        boxShadow: severity === 'CRITICAL' ? glow : 'none',
      }}
    >
      {text || severity}
    </span>
  );
};

export default SeverityBadge;
