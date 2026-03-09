import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BagTemperature } from '@/types';

interface BagTemperatureStripProps {
  bags: BagTemperature[];
  maxBags?: number;
}

export const BagTemperatureStrip: React.FC<BagTemperatureStripProps> = ({
  bags,
  maxBags = 10,
}) => {
  const [hoveredBag, setHoveredBag] = useState<number | null>(null);
  
  const getColor = (temp: number) => {
    if (temp >= 15 && temp <= 18) return '#27FB6B';
    if ((temp >= 14 && temp < 15) || (temp > 18 && temp <= 20)) return '#FFD166';
    return '#FF2D55';
  };
  
  const displayBags = bags.slice(0, maxBags);
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-iot-muted mr-1">Bags:</span>
        {displayBags.map((bag) => (
          <Tooltip key={bag.bagId}>
            <TooltipTrigger asChild>
              <div
                className="w-4 h-4 rounded-sm cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: getColor(bag.temperature),
                  opacity: hoveredBag === bag.bagId ? 1 : 0.8,
                  boxShadow: hoveredBag === bag.bagId ? `0 0 6px ${getColor(bag.temperature)}` : 'none',
                }}
                onMouseEnter={() => setHoveredBag(bag.bagId)}
                onMouseLeave={() => setHoveredBag(null)}
              />
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-iot-secondary border-iot-subtle text-iot-primary"
            >
              <div className="text-xs">
                <span className="text-iot-muted">Bag {bag.bagId}:</span>{' '}
                <span className="font-mono font-medium">{bag.temperature.toFixed(1)}°C</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
        {bags.length > maxBags && (
          <span className="text-[10px] text-iot-muted ml-1">+{bags.length - maxBags}</span>
        )}
      </div>
    </TooltipProvider>
  );
};

export default BagTemperatureStrip;
