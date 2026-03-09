import React from 'react';
import type { UserRole } from '@/types';

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const config: Record<string, { bg: string; color: string }> = {
    SUPER_ADMIN: { bg: 'rgba(255, 59, 48, 0.15)', color: '#FF3B30' },
    ADMIN: { bg: 'rgba(178, 108, 255, 0.15)', color: '#B26CFF' },
    MANAGER: { bg: 'rgba(46, 239, 255, 0.15)', color: '#2EEFFF' },
    OPERATOR: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B' },
    VIEWER: { bg: 'rgba(109, 116, 132, 0.15)', color: '#6D7484' },
  };

  const { bg, color } = config[role] ?? config.VIEWER;
  
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: bg, color }}
    >
      {role}
    </span>
  );
};

export default RoleBadge;
