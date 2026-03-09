import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { Wifi, WifiOff } from 'lucide-react';
import { CircularGauge } from '@/components/gauges/CircularGauge';
import { SmallGauge } from '@/components/gauges/SmallGauge';
import { BagTemperatureStrip } from '@/components/gauges/BagTemperatureStrip';
import { RelayIndicator } from '@/components/ui-custom/RelayIndicator';
import { useApp } from '@/store/AppContext';
import type { Room, SensorReading, RoomThresholds } from '@/types';

interface RoomCardProps {
  room: Room;
  reading?: SensorReading;
  thresholds?: RoomThresholds;
  index?: number;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  reading,
  thresholds,
  index = 0,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDataPulse, setIsDataPulse] = useState(false);
  const { state } = useApp();
  
  const isOnline = reading && room.deviceId && state.wsConnected;
  
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay: index * 0.08,
          ease: 'power3.out',
        }
      );
    }
  }, [index]);
  
  // Data pulse animation when reading updates
  useEffect(() => {
    if (reading) {
      setIsDataPulse(true);
      const timer = setTimeout(() => setIsDataPulse(false), 400);
      return () => clearTimeout(timer);
    }
  }, [reading?.timestamp]);
  
  const handleClick = () => {
    navigate(`/rooms/${room.id}`);
  };
  
  // Get color for temperature based on thresholds
  const getTempColor = (temp: number) => {
    if (!thresholds) return '#27FB6B';
    const { min, max } = thresholds.temperature;
    if (temp >= min && temp <= max) return '#27FB6B';
    if ((temp >= min - 1 && temp < min) || (temp > max && temp <= max + 1)) return '#FFD166';
    return '#FF2D55';
  };
  
  // Get color for humidity based on thresholds
  const getHumidityColor = (hum: number) => {
    if (!thresholds) return '#27FB6B';
    const { min, max } = thresholds.humidity;
    if (hum >= min && hum <= max) return '#27FB6B';
    if ((hum >= min - 2.5 && hum < min) || (hum > max && hum <= max + 2.5)) return '#FFD166';
    return '#FF2D55';
  };
  
  // Get color for CO2 based on thresholds
  const getCO2Color = (co2: number) => {
    if (!thresholds) return '#27FB6B';
    const { min, max } = thresholds.co2;
    if (co2 >= min && co2 <= max) return '#27FB6B';
    if ((co2 >= min - 100 && co2 < min) || (co2 > max && co2 <= max + 100)) return '#FFD166';
    return '#FF2D55';
  };
  
  const lastUpdated = reading
    ? Math.floor((Date.now() - new Date(reading.timestamp).getTime()) / 1000)
    : null;
  
  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={`
        bg-iot-secondary rounded-2xl p-5 border cursor-pointer
        transition-all duration-200 card-hover
        ${isDataPulse ? 'border-iot-cyan/60' : 'border-iot-subtle'}
      `}
      style={{
        boxShadow: isDataPulse ? '0 0 20px rgba(46, 239, 255, 0.15)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-iot-primary">{room.name}</h3>
          <p className="text-xs text-iot-muted">{room.code}</p>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-iot-green" />
              <div
                className="w-2 h-2 rounded-full animate-pulse-glow"
                style={{ backgroundColor: '#27FB6B', boxShadow: '0 0 6px #27FB6B' }}
              />
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-iot-red" />
              <div className="w-2 h-2 rounded-full bg-iot-red" />
            </>
          )}
        </div>
      </div>
      
      {reading ? (
        <>
          {/* Gauges */}
          <div className="flex items-center justify-center mb-4">
            <CircularGauge
              value={reading.co2}
              min={thresholds?.co2.min || 1000}
              max={thresholds?.co2.max || 1500}
              unit="ppm"
              size={110}
              strokeWidth={8}
              getColor={getCO2Color}
            />
          </div>
          
          {/* Small Gauges */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <SmallGauge
              value={reading.temperature}
              min={10}
              max={30}
              unit="°C"
              size={65}
              label="Temp"
              getColor={getTempColor}
            />
            <SmallGauge
              value={reading.humidity}
              min={60}
              max={100}
              unit="%"
              size={65}
              label="Humidity"
              getColor={getHumidityColor}
            />
          </div>
          
          {/* Bag Temperature Strip */}
          <div className="mb-3">
            <BagTemperatureStrip bags={reading.bagTemperatures} maxBags={10} />
          </div>
          
          {/* Outdoor Readings */}
          <div className="text-[10px] text-iot-muted mb-3">
            Outdoor: {reading.outdoorTemperature?.toFixed(1)}°C / {reading.outdoorHumidity}% RH
          </div>
          
          {/* Relay Indicators */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <RelayIndicator
              label="CO2"
              state={reading.relayStates.co2}
              trigger="AUTO"
            />
            <RelayIndicator
              label="Humidity"
              state={reading.relayStates.humidity}
              trigger="AUTO"
            />
            <RelayIndicator
              label="Temp"
              state={reading.relayStates.temperature}
              trigger="AUTO"
            />
          </div>
          
          {/* Last Updated */}
          <div className="text-center">
            <span className="text-[10px] text-iot-muted">
              {lastUpdated !== null ? `${lastUpdated}s ago` : 'No data'}
            </span>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-iot-muted">
          <WifiOff className="w-8 h-8 mb-2 opacity-50" />
          <span className="text-xs">Waiting for sensor data...</span>
          {room.deviceId && (
            <span className="text-[10px] mt-1">
              Last seen: {room.deviceName}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomCard;
