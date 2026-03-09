import React, { useState, useEffect, useCallback } from 'react';
import { CircularGauge } from '@/components/gauges/CircularGauge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { thresholdService } from '@/services/thresholdService';
import { mapThresholds } from '@/utils/mappers';

export const Settings: React.FC = () => {
  const { state, dispatch } = useApp();
  const toast = useToast();
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>(state.rooms[0]?.id || '');
  
  const reading = selectedRoomId ? state.sensorReadings.get(selectedRoomId) : undefined;
  const thresholds = selectedRoomId ? state.thresholds.get(selectedRoomId) : undefined;
  
  const [co2Thresholds, setCo2Thresholds] = useState({
    min: thresholds?.co2.min || 1200,
    max: thresholds?.co2.max || 1300,
    hysteresis: thresholds?.co2.hysteresis || 100,
  });
  
  const [tempThresholds, setTempThresholds] = useState({
    min: thresholds?.temperature.min || 16,
    max: thresholds?.temperature.max || 17,
    hysteresis: thresholds?.temperature.hysteresis || 1,
  });
  
  const [humidityThresholds, setHumidityThresholds] = useState({
    min: thresholds?.humidity.min || 87.5,
    max: thresholds?.humidity.max || 90,
    hysteresis: thresholds?.humidity.hysteresis || 2.5,
  });

  // Fetch thresholds from API when selectedRoomId changes
  useEffect(() => {
    if (!selectedRoomId) return;
    const fetchThresholds = async () => {
      try {
        const res = await thresholdService.getByRoom(Number(selectedRoomId));
        const mapped = mapThresholds(selectedRoomId, res);
        dispatch({ type: 'SET_THRESHOLD', payload: { roomId: selectedRoomId, threshold: mapped } });
        setCo2Thresholds({ min: mapped.co2.min, max: mapped.co2.max, hysteresis: mapped.co2.hysteresis });
        setTempThresholds({ min: mapped.temperature.min, max: mapped.temperature.max, hysteresis: mapped.temperature.hysteresis });
        setHumidityThresholds({ min: mapped.humidity.min, max: mapped.humidity.max, hysteresis: mapped.humidity.hysteresis });
      } catch (err: any) {
        toast.error(err?.response?.data?.detail || 'Failed to load thresholds');
      }
    };
    fetchThresholds();
  }, [selectedRoomId]);

  const buildThresholdsPayload = useCallback(
    (
      co2: typeof co2Thresholds,
      temp: typeof tempThresholds,
      humidity: typeof humidityThresholds
    ) => [
      { parameter: 'CO2', min_value: co2.min, max_value: co2.max, hysteresis: co2.hysteresis },
      { parameter: 'TEMPERATURE', min_value: temp.min, max_value: temp.max, hysteresis: temp.hysteresis },
      { parameter: 'HUMIDITY', min_value: humidity.min, max_value: humidity.max, hysteresis: humidity.hysteresis },
    ],
    []
  );

  const handleSaveCO2 = async () => {
    try {
      const payload = buildThresholdsPayload(co2Thresholds, tempThresholds, humidityThresholds);
      const res = await thresholdService.updateByRoom(Number(selectedRoomId), payload);
      const mapped = mapThresholds(selectedRoomId, res);
      dispatch({ type: 'SET_THRESHOLD', payload: { roomId: selectedRoomId, threshold: mapped } });
      toast.success('CO2 thresholds saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save CO2 thresholds');
    }
  };

  const handleSaveTemp = async () => {
    try {
      const payload = buildThresholdsPayload(co2Thresholds, tempThresholds, humidityThresholds);
      const res = await thresholdService.updateByRoom(Number(selectedRoomId), payload);
      const mapped = mapThresholds(selectedRoomId, res);
      dispatch({ type: 'SET_THRESHOLD', payload: { roomId: selectedRoomId, threshold: mapped } });
      toast.success('Temperature thresholds saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save temperature thresholds');
    }
  };

  const handleSaveHumidity = async () => {
    try {
      const payload = buildThresholdsPayload(co2Thresholds, tempThresholds, humidityThresholds);
      const res = await thresholdService.updateByRoom(Number(selectedRoomId), payload);
      const mapped = mapThresholds(selectedRoomId, res);
      dispatch({ type: 'SET_THRESHOLD', payload: { roomId: selectedRoomId, threshold: mapped } });
      toast.success('Humidity thresholds saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save humidity thresholds');
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-iot-primary mb-1">Settings</h1>
        <p className="text-sm text-iot-secondary">Configure sensor thresholds</p>
      </div>
      
      {/* Room Selector */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <label className="block text-sm font-medium text-iot-secondary mb-2">
          Select Room
        </label>
        <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
          <SelectTrigger className="input-dark w-full max-w-md">
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent className="bg-iot-secondary border-iot-subtle">
            {state.rooms.map(room => (
              <SelectItem key={room.id} value={room.id}>
                {room.name} ({room.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Threshold Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CO2 Thresholds */}
        <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
          <div className="flex items-center justify-center mb-6">
            {reading && (
              <CircularGauge
                value={reading.co2}
                min={co2Thresholds.min}
                max={co2Thresholds.max}
                unit="ppm"
                size={120}
                strokeWidth={8}
              />
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-iot-cyan text-center mb-4">CO2 Thresholds</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-iot-muted mb-1 block">Min (ppm)</label>
                <Input
                  type="number"
                  value={co2Thresholds.min}
                  onChange={(e) => setCo2Thresholds({ ...co2Thresholds, min: parseInt(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-iot-muted mb-1 block">Max (ppm)</label>
                <Input
                  type="number"
                  value={co2Thresholds.max}
                  onChange={(e) => setCo2Thresholds({ ...co2Thresholds, max: parseInt(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iot-muted mb-1 block">Hysteresis (ppm)</label>
              <Input
                type="number"
                value={co2Thresholds.hysteresis}
                onChange={(e) => setCo2Thresholds({ ...co2Thresholds, hysteresis: parseInt(e.target.value) || 0 })}
                className="input-dark w-full"
              />
            </div>
          </div>
          
          <Button
            onClick={handleSaveCO2}
            className="w-full mt-4 gradient-primary text-iot-bg-primary"
          >
            Save CO2 Thresholds
          </Button>
          
          <p className="text-xs text-iot-muted text-center mt-3">
            Last updated by admin at {new Date().toLocaleTimeString()}
          </p>
        </div>
        
        {/* Temperature Thresholds */}
        <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
          <div className="flex items-center justify-center mb-6">
            {reading && (
              <CircularGauge
                value={reading.temperature}
                min={10}
                max={30}
                unit="°C"
                size={120}
                strokeWidth={8}
              />
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-iot-green text-center mb-4">Temperature Thresholds</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-iot-muted mb-1 block">Min (°C)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={tempThresholds.min}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, min: parseFloat(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-iot-muted mb-1 block">Max (°C)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={tempThresholds.max}
                  onChange={(e) => setTempThresholds({ ...tempThresholds, max: parseFloat(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iot-muted mb-1 block">Hysteresis (°C)</label>
              <Input
                type="number"
                step="0.1"
                value={tempThresholds.hysteresis}
                onChange={(e) => setTempThresholds({ ...tempThresholds, hysteresis: parseFloat(e.target.value) || 0 })}
                className="input-dark w-full"
              />
            </div>
          </div>
          
          <Button
            onClick={handleSaveTemp}
            className="w-full mt-4 gradient-primary text-iot-bg-primary"
          >
            Save Temp Thresholds
          </Button>
          
          <p className="text-xs text-iot-muted text-center mt-3">
            Last updated by admin at {new Date().toLocaleTimeString()}
          </p>
        </div>
        
        {/* Humidity Thresholds */}
        <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
          <div className="flex items-center justify-center mb-6">
            {reading && (
              <CircularGauge
                value={reading.humidity}
                min={60}
                max={100}
                unit="%"
                size={120}
                strokeWidth={8}
              />
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-iot-purple text-center mb-4">Humidity Thresholds</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-iot-muted mb-1 block">Min (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={humidityThresholds.min}
                  onChange={(e) => setHumidityThresholds({ ...humidityThresholds, min: parseFloat(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs text-iot-muted mb-1 block">Max (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={humidityThresholds.max}
                  onChange={(e) => setHumidityThresholds({ ...humidityThresholds, max: parseFloat(e.target.value) || 0 })}
                  className="input-dark w-full"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-iot-muted mb-1 block">Hysteresis (%)</label>
              <Input
                type="number"
                step="0.1"
                value={humidityThresholds.hysteresis}
                onChange={(e) => setHumidityThresholds({ ...humidityThresholds, hysteresis: parseFloat(e.target.value) || 0 })}
                className="input-dark w-full"
              />
            </div>
          </div>
          
          <Button
            onClick={handleSaveHumidity}
            className="w-full mt-4 gradient-primary text-iot-bg-primary"
          >
            Save Humidity Thresholds
          </Button>
          
          <p className="text-xs text-iot-muted text-center mt-3">
            Last updated by admin at {new Date().toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
