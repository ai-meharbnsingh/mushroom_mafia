import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, QrCode, Plus, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CircularGauge } from '@/components/gauges/CircularGauge';
import { BagTemperatureStrip } from '@/components/gauges/BagTemperatureStrip';
import { RelayToggle } from '@/components/ui-custom/RelayToggle';
import { ScheduleEditor } from '@/components/ui-custom/ScheduleEditor';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { LinkDeviceDialog } from '@/components/ui-custom/LinkDeviceDialog';
import { StageTimeline } from '@/components/cards/StageTimeline';
import { RoomYieldSummary } from '@/components/cards/RoomYieldSummary';
import { ClimateAdvisoryCard } from '@/components/cards/ClimateAdvisoryCard';
import { StageAdvanceControls } from '@/components/cards/StageAdvanceControls';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useApp } from '@/store/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useWebSocketSimulation } from '@/hooks/useWebSocket';
import { readingService } from '@/services/readingService';
import { thresholdService } from '@/services/thresholdService';
import { liveService } from '@/services/liveService';
import { harvestService } from '@/services/harvestService';
import { advisoryService } from '@/services/advisoryService';
import { reportService } from '@/services/reportService';
import type { RelayState, TriggerType, RelayType, RelayMode, RelayConfig, RelayScheduleItem, GrowthCycle, Harvest, HarvestGrade, ClimateAdvisory } from '@/types';

import {
  AreaChart,
  Area,
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
  const { checkPermission } = useAuth();
  const toast = useToast();
  const { sendRelayCommand } = useWebSocketSimulation();

  const isAdmin = checkPermission('ADMIN');
  const [linkDeviceOpen, setLinkDeviceOpen] = useState(false);

  const [activeChart, setActiveChart] = useState<'co2' | 'temperature' | 'humidity'>('co2');
  const [relayTriggers, setRelayTriggers] = useState<Record<string, TriggerType>>({
    co2: 'AUTO',
    humidity: 'AUTO',
    temperature: 'AUTO',
    ahu: 'AUTO',
    humidifier: 'AUTO',
    duct_fan: 'AUTO',
    extra: 'AUTO',
  });

  // Relay config & schedule state
  const [relayConfigs, setRelayConfigs] = useState<Record<string, RelayConfig>>({});
  const [relaySchedules, setRelaySchedules] = useState<RelayScheduleItem[]>([]);
  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [editingScheduleRelay, setEditingScheduleRelay] = useState<RelayType | null>(null);

  // Growth cycle & harvest state
  const [growthCycle, setGrowthCycle] = useState<GrowthCycle | null>(null);
  const [recentHarvests, setRecentHarvests] = useState<Harvest[]>([]);
  const [harvestsLoading, setHarvestsLoading] = useState(true);

  // Climate advisory state
  const [advisory, setAdvisory] = useState<ClimateAdvisory | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(true);
  const [isApplyingAdvisory, setIsApplyingAdvisory] = useState(false);
  const [isAdvancingStage, setIsAdvancingStage] = useState(false);

  // Export CSV dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFrom, setExportFrom] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  );
  const [exportTo, setExportTo] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [exporting, setExporting] = useState(false);

  // Log Harvest dialog state
  const [logHarvestOpen, setLogHarvestOpen] = useState(false);
  const [harvestWeight, setHarvestWeight] = useState('');
  const [harvestGrade, setHarvestGrade] = useState<HarvestGrade>('A');
  const [harvestNotes, setHarvestNotes] = useState('');
  const [submittingHarvest, setSubmittingHarvest] = useState(false);

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

  // Fetch growth cycle
  const fetchGrowthCycle = useCallback(() => {
    if (!roomId) return;
    harvestService.getCurrentGrowthCycle(Number(roomId))
      .then((cycle) => setGrowthCycle(cycle))
      .catch(() => setGrowthCycle(null));
  }, [roomId]);

  useEffect(() => {
    fetchGrowthCycle();
  }, [fetchGrowthCycle]);

  // Fetch climate advisory
  const fetchAdvisory = useCallback(() => {
    if (!roomId) return;
    setAdvisoryLoading(true);
    advisoryService.getAdvisory(Number(roomId))
      .then((data) => setAdvisory(data))
      .catch(() => setAdvisory(null))
      .finally(() => setAdvisoryLoading(false));
  }, [roomId]);

  useEffect(() => {
    fetchAdvisory();
  }, [fetchAdvisory]);

  // Fetch recent harvests
  const fetchRecentHarvests = useCallback(() => {
    if (!roomId) return;
    setHarvestsLoading(true);
    harvestService.getHarvestsByRoom(Number(roomId), 5)
      .then((data) => setRecentHarvests(data))
      .catch(() => setRecentHarvests([]))
      .finally(() => setHarvestsLoading(false));
  }, [roomId]);

  useEffect(() => {
    fetchRecentHarvests();
  }, [fetchRecentHarvests]);

  // Fetch relay configs and schedules when device is available
  const fetchRelayConfigs = useCallback(async () => {
    if (!device) return;
    try {
      const data = await liveService.getRelayConfig(Number(device.id));
      const configs: Record<string, RelayConfig> = {};
      if (Array.isArray(data)) {
        data.forEach((c: any) => {
          const relayType = c.relay_type ?? c.relayType;
          configs[relayType] = {
            relayType,
            mode: c.mode ?? 'MANUAL',
            thresholdParam: c.threshold_param ?? c.thresholdParam ?? null,
            actionOnHigh: c.action_on_high ?? c.actionOnHigh ?? 'ON',
            actionOnLow: c.action_on_low ?? c.actionOnLow ?? 'OFF',
          };
        });
      }
      setRelayConfigs(configs);
    } catch {
      // Relay config endpoint may not exist yet -- default to MANUAL
    }
  }, [device]);

  const fetchRelaySchedules = useCallback(async () => {
    if (!device) return;
    try {
      const data = await liveService.getRelaySchedules(Number(device.id));
      if (Array.isArray(data)) {
        setRelaySchedules(data.map((s: any) => ({
          scheduleId: s.schedule_id ?? s.scheduleId,
          relayType: s.relay_type ?? s.relayType,
          daysOfWeek: s.days_of_week ?? s.daysOfWeek,
          timeOn: s.time_on ?? s.timeOn,
          timeOff: s.time_off ?? s.timeOff,
          isActive: s.is_active ?? s.isActive ?? true,
        })));
      }
    } catch {
      // Schedule endpoint may not exist yet
    }
  }, [device]);

  useEffect(() => {
    fetchRelayConfigs();
    fetchRelaySchedules();
  }, [fetchRelayConfigs, fetchRelaySchedules]);

  useEffect(() => {
    if (!room) {
      navigate('/rooms');
    }
  }, [room, navigate]);

  if (!room) return null;

  const relayLabels: Record<RelayType, string> = {
    co2: 'CO2',
    humidity: 'Humidity',
    temperature: 'Temperature',
    ahu: 'AHU',
    humidifier: 'Humidifier',
    duct_fan: 'Duct/Fan',
    extra: 'Extra',
  };

  const handleRelayToggle = (relay: RelayType, newState: RelayState) => {
    if (!device) {
      toast.error('No device linked to this room');
      return;
    }
    sendRelayCommand(device.id, relay, newState);
    setRelayTriggers(prev => ({
      ...prev,
      [relay]: 'MANUAL',
    }));
    toast.success(`${relayLabels[relay]} relay turned ${newState}`);
  };

  const handleModeChange = async (relay: RelayType, newMode: RelayMode) => {
    if (!device) return;
    const currentConfig = relayConfigs[relay];
    const updatedConfig = {
      relay_type: relay,
      mode: newMode,
      threshold_param: currentConfig?.thresholdParam ?? null,
      action_on_high: currentConfig?.actionOnHigh ?? 'ON',
      action_on_low: currentConfig?.actionOnLow ?? 'OFF',
    };
    try {
      await liveService.updateRelayConfig(Number(device.id), [updatedConfig]);
      setRelayConfigs(prev => ({
        ...prev,
        [relay]: {
          relayType: relay,
          mode: newMode,
          thresholdParam: updatedConfig.threshold_param,
          actionOnHigh: updatedConfig.action_on_high,
          actionOnLow: updatedConfig.action_on_low,
        },
      }));
      toast.success(`${relayLabels[relay]} mode set to ${newMode}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || `Failed to change mode for ${relayLabels[relay]}`);
    }
  };

  const handleSetAllAuto = async () => {
    if (!device) return;
    try {
      await liveService.setAllAuto(Number(device.id));
      await fetchRelayConfigs();
      toast.success('All relays set to AUTO mode');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to set all relays to AUTO');
    }
  };

  const handleSetAllManual = async () => {
    if (!device) return;
    try {
      await liveService.setAllManual(Number(device.id));
      await fetchRelayConfigs();
      toast.success('All relays set to MANUAL mode');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to set all relays to MANUAL');
    }
  };

  const handleEditSchedule = (relay: RelayType) => {
    setEditingScheduleRelay(relay);
    setScheduleEditorOpen(true);
  };

  const handleScheduleSave = async (scheduleData: Omit<RelayScheduleItem, 'scheduleId'> & { scheduleId?: number }) => {
    if (!device) return;
    try {
      if (scheduleData.scheduleId) {
        await liveService.updateRelaySchedule(scheduleData.scheduleId, {
          relay_type: scheduleData.relayType,
          days_of_week: scheduleData.daysOfWeek,
          time_on: scheduleData.timeOn,
          time_off: scheduleData.timeOff,
          is_active: scheduleData.isActive,
        });
        toast.success('Schedule updated');
      } else {
        await liveService.createRelaySchedule(Number(device.id), {
          relay_type: scheduleData.relayType,
          days_of_week: scheduleData.daysOfWeek,
          time_on: scheduleData.timeOn,
          time_off: scheduleData.timeOff,
          is_active: scheduleData.isActive,
        });
        toast.success('Schedule created');
      }
      await fetchRelaySchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to save schedule');
    }
  };

  const handleScheduleDelete = async (scheduleId: number) => {
    try {
      await liveService.deleteRelaySchedule(scheduleId);
      toast.success('Schedule deleted');
      await fetchRelaySchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete schedule');
    }
  };

  const getRelayMode = (relay: RelayType): RelayMode => {
    return relayConfigs[relay]?.mode ?? 'MANUAL';
  };

  const getScheduleInfo = (relay: RelayType): string => {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const schedules = relaySchedules.filter(s => s.relayType === relay && s.isActive);
    if (schedules.length === 0) return '';
    const s = schedules[0];
    const days = dayLabels.filter((_, i) => s.daysOfWeek & (1 << i));
    const dayStr = days.length === 5 && !days.includes('Sat') && !days.includes('Sun')
      ? 'Mon-Fri'
      : days.length === 7
        ? 'Every day'
        : days.join(',');
    return `${dayStr} ${s.timeOn}-${s.timeOff}`;
  };

  const getScheduleForRelay = (relay: RelayType): RelayScheduleItem | null => {
    return relaySchedules.find(s => s.relayType === relay) ?? null;
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

  // Log harvest handler
  const handleLogHarvest = async () => {
    if (!roomId) return;
    const weight = parseFloat(harvestWeight);
    if (isNaN(weight) || weight <= 0) {
      toast.error('Please enter a valid weight');
      return;
    }
    setSubmittingHarvest(true);
    try {
      await harvestService.logHarvest({
        roomId: Number(roomId),
        weightKg: weight,
        grade: harvestGrade,
        notes: harvestNotes.trim() || undefined,
      });
      toast.success('Harvest logged successfully');
      setLogHarvestOpen(false);
      setHarvestWeight('');
      setHarvestGrade('A');
      setHarvestNotes('');
      // Refresh harvest list
      fetchRecentHarvests();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to log harvest');
    } finally {
      setSubmittingHarvest(false);
    }
  };

  // Apply recommended thresholds handler
  const handleApplyRecommended = async () => {
    if (!roomId) return;
    setIsApplyingAdvisory(true);
    try {
      await advisoryService.applyRecommended(Number(roomId));
      toast.success('Recommended thresholds applied successfully');
      // Refetch advisory and thresholds
      fetchAdvisory();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to apply recommended thresholds');
    } finally {
      setIsApplyingAdvisory(false);
    }
  };

  // Toggle auto-adjust handler
  const handleToggleAutoAdjust = async (enabled: boolean) => {
    if (!growthCycle) return;
    try {
      const updated = await harvestService.updateGrowthCycle(growthCycle.cycleId, {
        autoAdjustThresholds: enabled,
      });
      setGrowthCycle(updated);
      fetchAdvisory();
      toast.success(`Auto-adjust ${enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to toggle auto-adjust');
    }
  };

  // Advance growth stage handler
  const handleAdvanceStage = async () => {
    if (!growthCycle) return;
    setIsAdvancingStage(true);
    try {
      const updated = await harvestService.advanceGrowthCycle(growthCycle.cycleId);
      setGrowthCycle(updated);
      fetchAdvisory();
      toast.success(`Advanced to ${updated.currentStage.replace(/_/g, ' ')}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to advance growth stage');
    } finally {
      setIsAdvancingStage(false);
    }
  };

  // Start growth cycle handler
  const handleStartCycle = async (data: { roomId: number }) => {
    try {
      const cycle = await harvestService.startGrowthCycle({ roomId: data.roomId });
      setGrowthCycle(cycle);
      fetchAdvisory();
      toast.success('Growth cycle started');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to start growth cycle');
    }
  };

  // Export CSV handler
  const handleExportCsv = async () => {
    if (!roomId) return;
    setExporting(true);
    try {
      await reportService.exportReadings(Number(roomId), exportFrom, exportTo);
      toast.success('CSV exported successfully');
      setExportDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to export readings');
    } finally {
      setExporting(false);
    }
  };

  const formatHarvestDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setLogHarvestOpen(true)}
            className="gradient-primary text-iot-bg-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Log Harvest
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setLinkDeviceOpen(true)}
              variant="outline"
              className="border-iot-cyan/30 text-iot-cyan hover:bg-iot-cyan/10"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Link Device
            </Button>
          )}
        </div>
      </div>

      {/* Stage Timeline + Advance Controls */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div /> {/* Spacer */}
          <StageAdvanceControls
            growthCycle={growthCycle}
            advisory={advisory}
            onAdvanceStage={handleAdvanceStage}
            onStartCycle={handleStartCycle}
            isAdvancing={isAdvancingStage}
            roomId={Number(roomId)}
          />
        </div>
        <StageTimeline
          currentStage={room.roomType}
          growthCycle={growthCycle}
          daysInStage={advisory?.daysInStage}
          durationMin={advisory?.stageDurationMin}
          durationMax={advisory?.stageDurationMax}
          transitionReminder={advisory?.transitionReminder}
        />
      </div>

      {/* Climate Advisory Card */}
      {advisoryLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 text-iot-cyan animate-spin" />
          <span className="ml-2 text-sm text-iot-muted">Loading climate advisory...</span>
        </div>
      ) : (
        <ClimateAdvisoryCard
          advisory={advisory}
          onApplyRecommended={handleApplyRecommended}
          onToggleAutoAdjust={handleToggleAutoAdjust}
          isApplying={isApplyingAdvisory}
        />
      )}

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
                unit="C"
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

      {/* Analytics Row: Historical Chart & Yield Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Historical Chart */}
        <div className="lg:col-span-2 bg-iot-secondary rounded-2xl p-6 border border-iot-subtle flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-iot-primary">Historical Data (24h)</h3>
            <div className="flex items-center gap-2">
              {(['co2', 'temperature', 'humidity'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveChart(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${activeChart === type
                    ? 'bg-iot-cyan/20 text-iot-cyan border border-iot-cyan/30'
                    : 'text-iot-muted hover:text-iot-primary border border-transparent'
                    }`}
                >
                  {type}
                </button>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setExportDialogOpen(true)}
                className="ml-2 text-xs h-8 border-iot-cyan/30 text-iot-cyan hover:bg-iot-cyan/10"
              >
                <Download className="w-3 h-3 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2EEFFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2EEFFF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#27FB6B" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#27FB6B" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B26CFF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#B26CFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).getHours() + ':00'}
                  stroke="#6D7484"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis stroke="#6D7484" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#11131A',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                  }}
                />
                {activeChart === 'co2' && thresholds && (
                  <ReferenceArea y1={thresholds.co2.min} y2={thresholds.co2.max} fill="#27FB6B" fillOpacity={0.05} />
                )}
                {activeChart === 'temperature' && thresholds && (
                  <ReferenceArea y1={thresholds.temperature.min} y2={thresholds.temperature.max} fill="#27FB6B" fillOpacity={0.05} />
                )}
                {activeChart === 'humidity' && thresholds && (
                  <ReferenceArea y1={thresholds.humidity.min} y2={thresholds.humidity.max} fill="#27FB6B" fillOpacity={0.05} />
                )}
                <Area
                  type="monotone"
                  dataKey={activeChart}
                  stroke={activeChart === 'co2' ? '#2EEFFF' : activeChart === 'temperature' ? '#27FB6B' : '#B26CFF'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill={`url(#color${activeChart === 'co2' ? 'Co2' : activeChart === 'temperature' ? 'Temp' : 'Hum'})`}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#FFFFFF' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Room Yield Summary */}
        <div className="lg:col-span-1">
          <RoomYieldSummary roomName={room.name} roomId={Number(roomId)} growthCycle={growthCycle} />
        </div>
      </div>

      {/* Harvest History Table */}
      <div className="bg-iot-secondary rounded-2xl p-6 border border-iot-subtle">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-iot-primary">Recent Harvests</h3>
          <Button
            size="sm"
            onClick={() => setLogHarvestOpen(true)}
            className="gradient-primary text-iot-bg-primary text-xs h-8"
          >
            <Plus className="w-3 h-3 mr-1" />
            Log Harvest
          </Button>
        </div>
        {harvestsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-iot-cyan animate-spin" />
          </div>
        ) : recentHarvests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-iot-muted">No harvests recorded yet</p>
            <p className="text-xs text-iot-muted mt-1">Click "Log Harvest" to add the first entry</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-iot-subtle">
                  <th className="text-left py-2 px-3 text-xs font-medium text-iot-muted uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-iot-muted uppercase tracking-wider">Weight</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-iot-muted uppercase tracking-wider">Grade</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-iot-muted uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody>
                {recentHarvests.map((h) => (
                  <tr key={h.harvestId} className="border-b border-iot-subtle/50 hover:bg-iot-tertiary/30 transition-colors">
                    <td className="py-2.5 px-3 text-iot-secondary">{formatHarvestDate(h.harvestedAt)}</td>
                    <td className="py-2.5 px-3 text-iot-primary font-medium">
                      {h.weightKg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        h.grade === 'A' ? 'bg-iot-green/10 text-iot-green border border-iot-green/20'
                        : h.grade === 'B' ? 'bg-iot-yellow/10 text-iot-yellow border border-iot-yellow/20'
                        : 'bg-iot-red/10 text-iot-red border border-iot-red/20'
                      }`}>
                        Grade {h.grade}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-iot-muted text-xs max-w-[200px] truncate">
                      {h.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-iot-secondary">Relay Controls</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetAllManual}
                className="text-[10px] h-7 px-2 border-[rgba(178,108,255,0.3)] text-[#B26CFF] hover:bg-[rgba(178,108,255,0.1)]"
              >
                All Manual
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSetAllAuto}
                className="text-[10px] h-7 px-2 border-[rgba(46,239,255,0.3)] text-[#2EEFFF] hover:bg-[rgba(46,239,255,0.1)]"
              >
                All Auto
              </Button>
            </div>
          </div>
          {reading ? (
            <div className="grid grid-cols-4 gap-3">
              {(Object.keys(relayLabels) as RelayType[]).map((relay) => (
                <RelayToggle
                  key={relay}
                  relay={relay}
                  label={relayLabels[relay]}
                  isOn={(reading.relayStates[relay] ?? 'OFF') === 'ON'}
                  mode={getRelayMode(relay)}
                  triggerType={relayTriggers[relay] ?? 'AUTO'}
                  thresholdParam={relayConfigs[relay]?.thresholdParam}
                  scheduleInfo={getScheduleInfo(relay)}
                  onToggle={(newState) => handleRelayToggle(relay, newState)}
                  onModeChange={(newMode) => handleModeChange(relay, newMode)}
                  onEditSchedule={() => handleEditSchedule(relay)}
                />
              ))}
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
            <h4 className="text-sm font-medium text-iot-green">Temperature (C)</h4>
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
                      className={`w-1.5 rounded-sm ${bar <= Math.ceil((device.wifiSignal + 100) / 25)
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

      {/* Link Device Dialog */}
      {roomId && (
        <LinkDeviceDialog
          roomId={roomId}
          roomName={room.name}
          open={linkDeviceOpen}
          onClose={() => setLinkDeviceOpen(false)}
        />
      )}

      {/* Schedule Editor Dialog */}
      {editingScheduleRelay && (
        <ScheduleEditor
          open={scheduleEditorOpen}
          onClose={() => {
            setScheduleEditorOpen(false);
            setEditingScheduleRelay(null);
          }}
          relay={editingScheduleRelay}
          relayLabel={relayLabels[editingScheduleRelay]}
          schedule={getScheduleForRelay(editingScheduleRelay)}
          onSave={handleScheduleSave}
          onDelete={handleScheduleDelete}
        />
      )}

      {/* Export CSV Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="bg-iot-secondary border-iot-subtle text-iot-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-iot-primary">Export Readings CSV</DialogTitle>
            <DialogDescription className="text-iot-muted">
              Export sensor readings for {room.name} as a CSV file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-iot-secondary mb-1 block">From</label>
                <Input
                  type="date"
                  value={exportFrom}
                  onChange={(e) => setExportFrom(e.target.value)}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-iot-secondary mb-1 block">To</label>
                <Input
                  type="date"
                  value={exportTo}
                  onChange={(e) => setExportTo(e.target.value)}
                  className="input-dark w-full"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExportDialogOpen(false)}
              className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
              disabled={exporting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExportCsv}
              disabled={exporting || !exportFrom || !exportTo}
              className="gradient-primary text-iot-bg-primary"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Harvest Dialog */}
      <Dialog open={logHarvestOpen} onOpenChange={setLogHarvestOpen}>
        <DialogContent className="bg-iot-secondary border-iot-subtle text-iot-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-iot-primary">Log Harvest</DialogTitle>
            <DialogDescription className="text-iot-muted">
              Record a new harvest for {room.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-iot-secondary mb-1 block">Weight (kg)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 12.5"
                value={harvestWeight}
                onChange={(e) => setHarvestWeight(e.target.value)}
                className="input-dark w-full"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-iot-secondary mb-1 block">Grade</label>
              <Select value={harvestGrade} onValueChange={(v) => setHarvestGrade(v as HarvestGrade)}>
                <SelectTrigger className="w-full bg-iot-bg-primary border-iot-subtle text-iot-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-iot-bg-primary border-iot-subtle">
                  <SelectItem value="A" className="text-iot-primary">Grade A - Premium</SelectItem>
                  <SelectItem value="B" className="text-iot-primary">Grade B - Standard</SelectItem>
                  <SelectItem value="C" className="text-iot-primary">Grade C - Economy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-iot-secondary mb-1 block">Notes (optional)</label>
              <Input
                placeholder="Any observations..."
                value={harvestNotes}
                onChange={(e) => setHarvestNotes(e.target.value)}
                className="input-dark w-full"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLogHarvestOpen(false)}
              className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogHarvest}
              disabled={submittingHarvest || !harvestWeight}
              className="gradient-primary text-iot-bg-primary"
            >
              {submittingHarvest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Harvest'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoomDetail;
