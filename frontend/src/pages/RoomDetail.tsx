import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CircularGauge } from '@/components/gauges/CircularGauge';
import { BagTemperatureStrip } from '@/components/gauges/BagTemperatureStrip';
import { RelayToggle } from '@/components/ui-custom/RelayToggle';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { useWebSocketSimulation } from '@/hooks/useWebSocket';
import { readingService } from '@/services/readingService';
import { thresholdService } from '@/services/thresholdService';
import type { RelayState, TriggerType } from '@/types';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';

export const RoomDetail: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { state } = useApp();
  const toast = useToast();
  const { sendRelayCommand } = useWebSocketSimulation();
  
  const [activeChart, setActiveChart] = useState<'co2' | 'temperature' | 'humidity'>('co2');
  const [relayTriggers, setRelayTriggers] = useState<Record<string, TriggerType>>({
    co2: 'AUTO',
    humidity: 'AUTO',
    temperature: 'AUTO',
  });
  
  const room = state.rooms.find(r => r.id === roomId);
  const reading = roomId ? state.sensorReadings.get(roomId) : undefined;
  const thresholds = roomId ? state.thresholds.get(roomId) : undefined;
  const device = room?.deviceId ? state.devices.find(d => d.id === room.deviceId) : undefined;
  
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!roomId) return;
    readingService.getByRoom(Number(roomId), { limit: 24 })
      .then((data: any[]) => {
        setChartData(Array.isArray(data) ? data.map((d: any) => ({
          timestamp: d.recorded_at ?? d.timestamp,
          co2: d.co2_ppm ?? d.co2 ?? 0,
          temperature: d.room_temp ?? d.temperature ?? 0,
          humidity: d.room_humidity ?? d.humidity ?? 0,
        })) : []);
      })
      .catch(() => setChartData([]));
  }, [roomId]);
  
  useEffect(() => {
    if (!room) {
      navigate('/rooms');
    }
  }, [room, navigate]);
  
  if (!room) return null;
  
  const handleRelayToggle = (relay: 'co2' | 'humidity' | 'temperature', newState: RelayState) => {
    sendRelayCommand(room.id, relay, newState);
    setRelayTriggers(prev => ({
      ...prev,
      [relay]: 'MANUAL',
    }));
    toast.success(`${relay.charAt(0).toUpperCase() + relay.slice(1)} relay turned ${newState}`);
  };
  
  const handleThresholdSave = async () => {
    if (!roomId) return;
    try {
      const thresholdsPayload = [
        { parameter: 'co2', min_value: thresholds?.co2.min ?? 1200, max_value: thresholds?.co2.max ?? 1300, hysteresis: thresholds?.co2.hysteresis ?? 100 },
        { parameter: 'temperature', min_value: thresholds?.temperature.min ?? 16, max_value: thresholds?.temperature.max ?? 17, hysteresis: thresholds?.temperature.hysteresis ?? 1 },
        { parameter: 'humidity', min_value: thresholds?.humidity.min ?? 87.5, max_value: thresholds?.humidity.max ?? 90, hysteresis: thresholds?.humidity.hysteresis ?? 2.5 },
      ];
      await thresholdService.updateByRoom(Number(roomId), thresholdsPayload);
      toast.success('Thresholds saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save thresholds');
    }
  };
  
  const isOnline = reading && room.deviceId && state.wsConnected;
  
  // Get colors based on thresholds
  const getCO2Color = (co2: number) => {
    if (!thresholds) return '#27FB6B';
    const { min, max } = thresholds.co2;
    if (co2 >= min && co2 <= max) return '#27FB6B';
    if ((co2 >= min - 100 && co2 < min) || (co2 > max && co2 <= max + 100)) return '#FFD166';
    return '#FF2D55';
  };
  
  const getTempColor = (temp: number) => {
    if (!thresholds) return '#27FB6B';
    const { min, max } = thresholds.temperature;
    if (temp >= min && temp <= max) return '#27FB6B';
    if ((temp >= min - 1 && temp < min) || (temp > max && temp <= max + 1)) return '#FFD166';
    return '#FF2D55';
  };
  
  const getHumidityColor = (hum: number) => {
    if (!thresholds) return '#27FB6B';
    const { min, max } = thresholds.humidity;
    if (hum >= min && hum <= max) return '#27FB6B';
    if ((hum >= min - 2.5 && hum < min) || (hum > max && hum <= max + 2.5)) return '#FFD166';
    return '#FF2D55';
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/rooms')}
          className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-iot-primary">{room.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-iot-secondary font-mono">{room.code}</span>
            <StatusBadge status={isOnline ? 'online' : 'offline'} />
          </div>
        </div>
      </div>
      
      {/* Live Gauges */}
      {reading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CO2 Gauge */}
          <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
            <h3 className="text-sm font-medium text-iot-secondary mb-4 text-center">CO2 Level</h3>
            <div className="flex justify-center">
              <CircularGauge
                value={reading.co2}
                min={thresholds?.co2.min || 1000}
                max={thresholds?.co2.max || 1500}
                unit="ppm"
                size={180}
                strokeWidth={12}
                getColor={getCO2Color}
              />
            </div>
          </div>
          
          {/* Temperature Gauge */}
          <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
            <h3 className="text-sm font-medium text-iot-secondary mb-4 text-center">Temperature</h3>
            <div className="flex justify-center">
              <CircularGauge
                value={reading.temperature}
                min={10}
                max={30}
                unit="°C"
                size={180}
                strokeWidth={12}
                getColor={getTempColor}
              />
            </div>
          </div>
          
          {/* Humidity Gauge */}
          <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
            <h3 className="text-sm font-medium text-iot-secondary mb-4 text-center">Humidity</h3>
            <div className="flex justify-center">
              <CircularGauge
                value={reading.humidity}
                min={60}
                max={100}
                unit="%"
                size={180}
                strokeWidth={12}
                getColor={getHumidityColor}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Bag Temperature & Relays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bag Temperature Heatmap */}
        <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
          <h3 className="text-sm font-medium text-iot-secondary mb-4">Bag Temperatures</h3>
          {reading ? (
            <BagTemperatureStrip bags={reading.bagTemperatures} maxBags={20} />
          ) : (
            <p className="text-sm text-iot-muted">No data available</p>
          )}
        </div>
        
        {/* Relay Controls */}
        <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
          <h3 className="text-sm font-medium text-iot-secondary mb-4">Relay Controls</h3>
          {reading ? (
            <div className="flex items-center justify-around">
              <RelayToggle
                label="CO2"
                state={reading.relayStates.co2}
                trigger={relayTriggers.co2}
                onToggle={(state) => handleRelayToggle('co2', state)}
              />
              <RelayToggle
                label="Humidity"
                state={reading.relayStates.humidity}
                trigger={relayTriggers.humidity}
                onToggle={(state) => handleRelayToggle('humidity', state)}
              />
              <RelayToggle
                label="Temperature"
                state={reading.relayStates.temperature}
                trigger={relayTriggers.temperature}
                onToggle={(state) => handleRelayToggle('temperature', state)}
              />
            </div>
          ) : (
            <p className="text-sm text-iot-muted">No data available</p>
          )}
        </div>
      </div>
      
      {/* Threshold Settings */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <h3 className="text-lg font-semibold text-iot-primary mb-4">Threshold Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CO2 Thresholds */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-iot-cyan">CO2 (ppm)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-iot-muted">Min</label>
                <Input
                  type="number"
                  defaultValue={thresholds?.co2.min || 1200}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-iot-muted">Max</label>
                <Input
                  type="number"
                  defaultValue={thresholds?.co2.max || 1300}
                  className="input-dark w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iot-muted">Hysteresis</label>
              <Input
                type="number"
                defaultValue={thresholds?.co2.hysteresis || 100}
                className="input-dark w-full"
              />
            </div>
          </div>
          
          {/* Temperature Thresholds */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-iot-green">Temperature (°C)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-iot-muted">Min</label>
                <Input
                  type="number"
                  defaultValue={thresholds?.temperature.min || 16}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-iot-muted">Max</label>
                <Input
                  type="number"
                  defaultValue={thresholds?.temperature.max || 17}
                  className="input-dark w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iot-muted">Hysteresis</label>
              <Input
                type="number"
                defaultValue={thresholds?.temperature.hysteresis || 1}
                className="input-dark w-full"
              />
            </div>
          </div>
          
          {/* Humidity Thresholds */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-iot-purple">Humidity (%)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-iot-muted">Min</label>
                <Input
                  type="number"
                  defaultValue={thresholds?.humidity.min || 87.5}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-iot-muted">Max</label>
                <Input
                  type="number"
                  defaultValue={thresholds?.humidity.max || 90}
                  className="input-dark w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iot-muted">Hysteresis</label>
              <Input
                type="number"
                defaultValue={thresholds?.humidity.hysteresis || 2.5}
                className="input-dark w-full"
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleThresholdSave}
            className="gradient-primary text-iot-bg-primary"
          >
            Save Thresholds
          </Button>
        </div>
      </div>
      
      {/* Historical Chart */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-iot-primary">Historical Data (24h)</h3>
          <div className="flex items-center gap-2">
            {(['co2', 'temperature', 'humidity'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setActiveChart(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${
                  activeChart === type
                    ? 'bg-iot-cyan/20 text-iot-cyan'
                    : 'text-iot-muted hover:text-iot-primary'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => new Date(value).getHours() + ':00'}
                stroke="#6D7484"
                fontSize={10}
              />
              <YAxis stroke="#6D7484" fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#11131A',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                }}
              />
              {activeChart === 'co2' && thresholds && (
                <ReferenceArea y1={thresholds.co2.min} y2={thresholds.co2.max} fill="#27FB6B" fillOpacity={0.1} />
              )}
              {activeChart === 'temperature' && thresholds && (
                <ReferenceArea y1={thresholds.temperature.min} y2={thresholds.temperature.max} fill="#27FB6B" fillOpacity={0.1} />
              )}
              {activeChart === 'humidity' && thresholds && (
                <ReferenceArea y1={thresholds.humidity.min} y2={thresholds.humidity.max} fill="#27FB6B" fillOpacity={0.1} />
              )}
              <Line
                type="monotone"
                dataKey={activeChart}
                stroke={activeChart === 'co2' ? '#2EEFFF' : activeChart === 'temperature' ? '#27FB6B' : '#B26CFF'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Device Info */}
      {device && (
        <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
          <h3 className="text-lg font-semibold text-iot-primary mb-4">Device Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-iot-muted mb-1">Device Name</p>
              <p className="text-sm font-medium text-iot-primary">{device.name}</p>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">MAC Address</p>
              <p className="text-sm font-mono text-iot-primary">{device.macAddress}</p>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">IP Address</p>
              <p className="text-sm font-mono text-iot-primary">{device.ipAddress || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">WiFi Signal</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`w-1.5 rounded-sm ${
                        bar <= Math.ceil((device.wifiSignal + 100) / 25)
                          ? 'bg-iot-green'
                          : 'bg-iot-tertiary'
                      }`}
                      style={{ height: `${bar * 4 + 4}px` }}
                    />
                  ))}
                </div>
                <span className="text-sm text-iot-primary">{device.wifiSignal} dBm</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">Firmware</p>
              <p className="text-sm text-iot-primary">{device.firmwareVersion}</p>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">Hardware</p>
              <p className="text-sm text-iot-primary">{device.hardwareVersion}</p>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">Free Heap</p>
              <p className="text-sm text-iot-primary">{(device.freeHeap / 1024).toFixed(1)} KB</p>
            </div>
            <div>
              <p className="text-xs text-iot-muted mb-1">Uptime</p>
              <p className="text-sm text-iot-primary">{Math.floor((device.uptime || 0) / 86400)} days</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetail;
