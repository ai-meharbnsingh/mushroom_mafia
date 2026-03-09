import React from 'react';
import type { PlantType, RoomType, ReportType, ReportFormat } from '@/types';

interface TypeBadgeProps {
  type: PlantType | RoomType | ReportType | ReportFormat;
  variant: 'plant' | 'room' | 'report' | 'format';
}

export const TypeBadge: React.FC<TypeBadgeProps> = ({ type, variant }) => {
  const plantColors: Record<PlantType, { bg: string; color: string }> = {
    OYSTER: { bg: 'rgba(109, 116, 132, 0.15)', color: '#A7ACB8' },
    BUTTON: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166' },
    SHIITAKE: { bg: 'rgba(178, 108, 255, 0.15)', color: '#B26CFF' },
    MIXED: { bg: 'rgba(46, 239, 255, 0.15)', color: '#2EEFFF' },
  };
  
  const roomColors: Record<RoomType, { bg: string; color: string }> = {
    SPAWN_RUN: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B' },
    FRUITING: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166' },
    INCUBATION: { bg: 'rgba(46, 239, 255, 0.15)', color: '#2EEFFF' },
    STORAGE: { bg: 'rgba(109, 116, 132, 0.15)', color: '#A7ACB8' },
  };
  
  const reportColors: Record<ReportType, { bg: string; color: string }> = {
    DAILY: { bg: 'rgba(46, 239, 255, 0.15)', color: '#2EEFFF' },
    WEEKLY: { bg: 'rgba(178, 108, 255, 0.15)', color: '#B26CFF' },
    MONTHLY: { bg: 'rgba(255, 209, 102, 0.15)', color: '#FFD166' },
    CUSTOM: { bg: 'rgba(109, 116, 132, 0.15)', color: '#A7ACB8' },
  };
  
  const formatColors: Record<ReportFormat, { bg: string; color: string }> = {
    PDF: { bg: 'rgba(255, 45, 85, 0.15)', color: '#FF2D55' },
    EXCEL: { bg: 'rgba(39, 251, 107, 0.15)', color: '#27FB6B' },
    CSV: { bg: 'rgba(46, 239, 255, 0.15)', color: '#2EEFFF' },
  };
  
  let colors;
  switch (variant) {
    case 'plant':
      colors = plantColors[type as PlantType];
      break;
    case 'room':
      colors = roomColors[type as RoomType];
      break;
    case 'report':
      colors = reportColors[type as ReportType];
      break;
    case 'format':
      colors = formatColors[type as ReportFormat];
      break;
    default:
      colors = { bg: 'rgba(109, 116, 132, 0.15)', color: '#6D7484' };
  }
  
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: colors.bg, color: colors.color }}
    >
      {type}
    </span>
  );
};

export default TypeBadge;
