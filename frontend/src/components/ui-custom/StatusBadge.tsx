import React from 'react';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'active' | 'inactive' | 'locked' | 'unassigned';
  text?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  showDot = true,
}) => {
  const config = {
    online: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B', dot: '#27FB6B', label: 'Online' },
    offline: { bg: 'rgba(255, 45, 85, 0.15)', color: '#FF2D55', dot: '#FF2D55', label: 'Offline' },
    warning: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166', dot: '#FFD166', label: 'Warning' },
    active: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B', dot: '#27FB6B', label: 'Active' },
    inactive: { bg: 'rgba(109, 116, 132, 0.15)', color: '#6D7484', dot: '#6D7484', label: 'Inactive' },
    locked: { bg: 'rgba(255, 45, 85, 0.15)', color: '#FF2D55', dot: '#FF2D55', label: 'Locked' },
    unassigned: { bg: 'rgba(255, 165, 0, 0.15)', color: '#FFA500', dot: '#FFA500', label: 'Unassigned' },
  };
  
  const { bg, color, dot, label } = config[status];
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color }}
    >
      {showDot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: dot,
            boxShadow: status === 'online' || status === 'active' ? `0 0 4px ${dot}` : 'none',
          }}
        />
      )}
      {text || label}
    </span>
  );
};

export default StatusBadge;
