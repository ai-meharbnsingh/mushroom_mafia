import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  DoorOpen, Cpu, Wifi, WifiOff, AlertTriangle, Bell,
  MapPin, ArrowLeft, Thermometer, Droplets, Wind,
  TrendingUp, Award, RefreshCw, Leaf, Clock, Sprout,
  AlertCircle, Activity,
} from 'lucide-react';
import { MetricCard } from '@/components/cards/MetricCard';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { TypeBadge } from '@/components/ui-custom/TypeBadge';
import { useApp } from '@/store/AppContext';
import { dashboardService } from '@/services/dashboardService';
import { mapPlantDashboardSummary } from '@/utils/mappers';
import type { PlantDashboardSummary, PlantType, PlantRoomSummary } from '@/types';

const REFRESH_INTERVAL = 2_000;

const stageBadgeColor: Record<string, string> = {
  INOCULATION: '#B26CFF',
  SPAWN_RUN: '#FFD166',
  INCUBATION: '#2EEFFF',
  FRUITING: '#27FB6B',
  HARVEST: '#FF9F1C',
  IDLE: '#6D7484',
};

// Stale threshold: data older than 5 minutes is considered stale
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

function isStaleReading(lastReadingAt: string | null | undefined): boolean {
  if (!lastReadingAt) return false;
  return Date.now() - new Date(lastReadingAt).getTime() > STALE_THRESHOLD_MS;
}

function timeAgo(ts: string | null | undefined): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Sensor value color based on typical mushroom farm thresholds
function sensorColor(type: 'temp' | 'humidity' | 'co2', value: number | null | undefined): string {
  if (value == null) return '#6D7484';
  switch (type) {
    case 'temp':
      if (value < 14 || value > 20) return '#FF2D55'; // critical
      if (value < 15 || value > 19) return '#FFD166'; // warning
      return '#27FB6B'; // normal
    case 'humidity':
      if (value < 80 || value > 98) return '#FF2D55';
      if (value < 85 || value > 95) return '#FFD166';
      return '#27FB6B';
    case 'co2':
      if (value > 1500 || value < 800) return '#FF2D55';
      if (value > 1350 || value < 900) return '#FFD166';
      return '#27FB6B';
  }
}

// Sort priority: critical rooms first
function roomSortPriority(room: PlantRoomSummary): number {
  if (room.activeAlerts > 0) return 0; // alerts first
  if (room.hasDevice && !room.isOnline) return 1; // offline second
  if (room.isOnline && isStaleReading(room.lastReadingAt)) return 2; // stale third
  if (!room.hasDevice) return 4; // no device last
  return 3; // healthy
}

// Identify "problems" for the Top Problems section
interface Problem {
  roomName: string;
  roomId: string;
  severity: 'critical' | 'warning' | 'info';
  icon: typeof AlertTriangle;
  message: string;
  detail: string;
  timeInfo: string;
}

function detectProblems(rooms: PlantRoomSummary[]): Problem[] {
  const problems: Problem[] = [];
  for (const room of rooms) {
    // Offline device
    if (room.hasDevice && !room.isOnline) {
      problems.push({
        roomName: room.roomName,
        roomId: room.roomId,
        severity: 'critical',
        icon: WifiOff,
        message: 'Device Offline',
        detail: `${room.deviceName ?? 'Device'} not responding`,
        timeInfo: room.lastReadingAt ? timeAgo(room.lastReadingAt) : 'unknown',
      });
    }
    // High CO2
    if (room.co2Ppm != null && room.co2Ppm > 1350) {
      problems.push({
        roomName: room.roomName,
        roomId: room.roomId,
        severity: room.co2Ppm > 1500 ? 'critical' : 'warning',
        icon: Wind,
        message: `CO2 ${room.co2Ppm > 1500 ? 'CRITICAL' : 'HIGH'}`,
        detail: `${Math.round(room.co2Ppm)} ppm`,
        timeInfo: room.lastReadingAt ? timeAgo(room.lastReadingAt) : '',
      });
    }
    // Temperature issues
    if (room.roomTemp != null && (room.roomTemp < 14 || room.roomTemp > 20)) {
      problems.push({
        roomName: room.roomName,
        roomId: room.roomId,
        severity: room.roomTemp < 12 || room.roomTemp > 22 ? 'critical' : 'warning',
        icon: Thermometer,
        message: room.roomTemp < 14 ? 'TEMP LOW' : 'TEMP HIGH',
        detail: `${room.roomTemp.toFixed(1)}°C`,
        timeInfo: room.lastReadingAt ? timeAgo(room.lastReadingAt) : '',
      });
    }
    // Humidity issues
    if (room.roomHumidity != null && (room.roomHumidity < 80 || room.roomHumidity > 98)) {
      problems.push({
        roomName: room.roomName,
        roomId: room.roomId,
        severity: 'warning',
        icon: Droplets,
        message: room.roomHumidity < 80 ? 'HUMIDITY LOW' : 'HUMIDITY HIGH',
        detail: `${room.roomHumidity.toFixed(1)}%`,
        timeInfo: room.lastReadingAt ? timeAgo(room.lastReadingAt) : '',
      });
    }
    // Stale data
    if (room.isOnline && room.lastReadingAt && isStaleReading(room.lastReadingAt)) {
      problems.push({
        roomName: room.roomName,
        roomId: room.roomId,
        severity: 'info',
        icon: Clock,
        message: 'Stale Data',
        detail: `Last reading ${timeAgo(room.lastReadingAt)}`,
        timeInfo: timeAgo(room.lastReadingAt),
      });
    }
  }
  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return problems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

const severityStyle = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500' },
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-500' },
};

function RoomCard({ room, onClick }: { room: PlantRoomSummary; onClick: () => void }) {
  const hasLiveData = room.roomTemp != null || room.co2Ppm != null;
  const stageColor = stageBadgeColor[room.growthStage ?? ''] ?? '#6D7484';
  const stale = room.isOnline && isStaleReading(room.lastReadingAt);
  const hasProblems = room.activeAlerts > 0 || (room.hasDevice && !room.isOnline);

  // Card border color changes based on status
  const borderClass = hasProblems
    ? 'border-red-500/40 hover:border-red-500/60'
    : stale
      ? 'border-yellow-500/30 hover:border-yellow-500/50'
      : 'border-iot-subtle hover:border-iot-primary/40';

  return (
    <div
      onClick={onClick}
      className={`bg-iot-secondary rounded-2xl border ${borderClass} transition-all cursor-pointer group relative overflow-hidden`}
    >
      {/* Status indicator strip */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          backgroundColor: room.isOnline ? '#27FB6B' : room.hasDevice ? '#FF2D55' : '#6D7484',
        }}
      />

      <div className="p-5 pt-4">
        {/* Header row */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-iot-primary truncate group-hover:text-cyan-400 transition-colors">
                {room.roomName}
              </h3>
              {room.activeAlerts > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-500/15 text-red-400 animate-pulse">
                  <Bell className="w-2.5 h-2.5" />
                  {room.activeAlerts}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-iot-muted">{room.roomCode}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-iot-tertiary text-iot-secondary">
                {room.roomType}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {room.hasDevice ? (
              room.isOnline ? (
                stale ? (
                  <div className="flex items-center gap-1 text-xs font-medium text-yellow-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Stale</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs font-medium text-green-400">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Live</span>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-1 text-xs font-medium text-red-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </div>
              )
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-500/15 text-orange-400">
                No Device
              </span>
            )}
          </div>
        </div>

        {/* Live Sensor Readings — with contextual color coding */}
        {hasLiveData ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-iot-tertiary rounded-xl p-3 text-center relative">
              <Thermometer className="w-4 h-4 mx-auto mb-1" style={{ color: sensorColor('temp', room.roomTemp) }} />
              <p className="text-lg font-bold font-mono" style={{ color: sensorColor('temp', room.roomTemp) }}>
                {room.roomTemp != null ? room.roomTemp.toFixed(1) : '--'}
              </p>
              <p className="text-[10px] text-iot-muted uppercase">Temp °C</p>
            </div>
            <div className="bg-iot-tertiary rounded-xl p-3 text-center">
              <Droplets className="w-4 h-4 mx-auto mb-1" style={{ color: sensorColor('humidity', room.roomHumidity) }} />
              <p className="text-lg font-bold font-mono" style={{ color: sensorColor('humidity', room.roomHumidity) }}>
                {room.roomHumidity != null ? room.roomHumidity.toFixed(1) : '--'}
              </p>
              <p className="text-[10px] text-iot-muted uppercase">Humidity %</p>
            </div>
            <div className="bg-iot-tertiary rounded-xl p-3 text-center">
              <Wind className="w-4 h-4 mx-auto mb-1" style={{ color: sensorColor('co2', room.co2Ppm) }} />
              <p className="text-lg font-bold font-mono" style={{ color: sensorColor('co2', room.co2Ppm) }}>
                {room.co2Ppm != null ? Math.round(room.co2Ppm) : '--'}
              </p>
              <p className="text-[10px] text-iot-muted uppercase">CO2 ppm</p>
            </div>
          </div>
        ) : (
          <div className="bg-iot-tertiary rounded-xl p-4 mb-4 text-center">
            <p className="text-xs text-iot-muted">
              {room.hasDevice && !room.isOnline ? 'Device offline — no data' : 'No live sensor data'}
            </p>
          </div>
        )}

        {/* Bag Temperatures */}
        {room.bagTemps.length > 0 && (
          <div className="flex items-center gap-2 mb-4 px-1">
            <span className="text-[10px] text-iot-muted uppercase whitespace-nowrap">Bags:</span>
            <div className="flex gap-1.5 flex-wrap">
              {room.bagTemps.map((t, i) => (
                <span
                  key={i}
                  className="text-xs font-mono px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-300"
                >
                  {t.toFixed(1)}°
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Stale data warning */}
        {stale && room.lastReadingAt && (
          <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Clock className="w-3 h-3 text-yellow-400 flex-shrink-0" />
            <span className="text-[11px] text-yellow-400">
              Last reading {timeAgo(room.lastReadingAt)} — data may be outdated
            </span>
          </div>
        )}

        {/* Growth Stage + Yield */}
        <div className="flex items-center justify-between pt-3 border-t border-iot-subtle">
          <div className="flex items-center gap-2">
            {room.growthStage && (
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex items-center gap-1"
                style={{ backgroundColor: stageColor + '20', color: stageColor }}
              >
                <Sprout className="w-3 h-3" />
                {room.growthStage.replace('_', ' ')}
                {room.daysInStage != null && (
                  <span className="opacity-75">Day {room.daysInStage}</span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            {room.monthHarvests > 0 ? (
              <>
                <span className="flex items-center gap-1 text-iot-secondary">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  {room.monthYieldKg.toFixed(1)} kg
                </span>
                <div className="flex gap-1">
                  {room.gradeA > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-500/15 text-green-400">
                      A:{room.gradeA}
                    </span>
                  )}
                  {room.gradeB > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/15 text-yellow-400">
                      B:{room.gradeB}
                    </span>
                  )}
                  {room.gradeC > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                      C:{room.gradeC}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-iot-muted">No harvests this month</span>
            )}
          </div>
        </div>

        {/* Last reading timestamp */}
        {room.lastReadingAt && !stale && (
          <div className="flex items-center gap-1 mt-2 text-[10px] text-iot-muted">
            <Activity className="w-2.5 h-2.5" />
            <span>{timeAgo(room.lastReadingAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export const PlantDashboard: React.FC = () => {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [data, setData] = useState<PlantDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState(plantId || '');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const plantOptions = useMemo(() =>
    state.plants.map(p => ({ value: p.id, label: `${p.name} (${p.code})` })),
    [state.plants]
  );

  const fetchData = useCallback(async (showSpinner = false) => {
    if (!selectedPlantId) return;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    try {
      const raw = await dashboardService.getPlantDashboard(Number(selectedPlantId));
      setData(mapPlantDashboardSummary(raw));
      setLastRefresh(new Date());
    } catch {
      if (showSpinner) setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPlantId]);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (selectedPlantId && selectedPlantId !== plantId) {
      navigate(`/plants/${selectedPlantId}`, { replace: true });
    }
  }, [selectedPlantId, plantId, navigate]);

  useEffect(() => {
    if (plantId) {
      setSelectedPlantId(plantId);
      dispatch({ type: 'SET_SELECTED_PLANT', payload: plantId });
    }
  }, [plantId, dispatch]);

  useEffect(() => {
    if (data) {
      sectionRefs.current.forEach((ref, index) => {
        if (ref) {
          gsap.fromTo(
            ref,
            { opacity: 0, y: 12 },
            { opacity: 1, y: 0, duration: 0.5, delay: index * 0.08, ease: 'power3.out' }
          );
        }
      });
    }
  }, [data]);

  // Sort rooms: critical first
  const sortedRooms = useMemo(() => {
    if (!data) return [];
    return [...data.rooms].sort((a, b) => roomSortPriority(a) - roomSortPriority(b));
  }, [data]);

  // Detect problems
  const problems = useMemo(() => {
    if (!data) return [];
    return detectProblems(data.rooms);
  }, [data]);

  // Compute a simple plant health score (0-100)
  const healthScore = useMemo(() => {
    if (!data || data.totalDevices === 0) return null;
    let score = 100;
    // Offline penalty: -10 per offline device
    const offlineDevices = data.totalDevices - data.onlineDevices;
    score -= offlineDevices * 10;
    // Alert penalty: -5 per active, -10 per critical
    score -= (data.activeAlerts - data.criticalAlerts) * 5;
    score -= data.criticalAlerts * 10;
    return Math.max(0, Math.min(100, score));
  }, [data]);

  const healthColor = healthScore != null
    ? healthScore >= 80 ? '#27FB6B' : healthScore >= 50 ? '#FFD166' : '#FF2D55'
    : '#6D7484';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-iot-muted">Failed to load plant dashboard data.</p>
        <Button onClick={() => navigate('/plants')} variant="outline" className="mt-4">
          Back to Plants
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with plant switcher */}
      <div ref={el => { sectionRefs.current[0] = el; }}>
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plants')}
            className="text-iot-secondary hover:text-iot-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Plants
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-iot-primary">{data.plantName}</h1>
              {healthScore != null && (
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: healthColor + '1A', color: healthColor }}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {healthScore}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-sm text-iot-secondary">{data.plantCode}</span>
              <TypeBadge type={data.plantType as PlantType} variant="plant" />
              {(data.city || data.state) && (
                <span className="flex items-center gap-1 text-sm text-iot-muted">
                  <MapPin className="w-3 h-3" />
                  {[data.city, data.state].filter(Boolean).join(', ')}
                  {data.pincode && ` - ${data.pincode}`}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-iot-muted">
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
              <span>
                {refreshing ? 'Refreshing...' : `Updated ${lastRefresh.toLocaleTimeString()}`}
              </span>
            </div>
            <div className="w-64">
              <SearchableSelect
                options={plantOptions}
                value={selectedPlantId}
                onValueChange={(v) => v && setSelectedPlantId(v)}
                placeholder="Switch plant..."
                searchPlaceholder="Search plants..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div ref={el => { sectionRefs.current[1] = el; }} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard title="Rooms" value={data.totalRooms} icon={DoorOpen} color="purple" />
        <MetricCard title="Devices" value={data.totalDevices} icon={Cpu} color="cyan" />
        <MetricCard title="Online" value={data.onlineDevices} icon={Wifi} color="green" />
        <MetricCard title="Alerts" value={data.activeAlerts} icon={Bell} color={data.criticalAlerts > 0 ? 'red' : 'yellow'} />
        <MetricCard title="This Month" value={Number(data.monthYieldKg.toFixed(1))} icon={TrendingUp} color="green" suffix=" kg" />
        <MetricCard title="Harvests" value={data.monthHarvests} icon={Leaf} color="cyan" />
      </div>

      {/* Monthly Grade Breakdown bar */}
      {(data.monthGradeA + data.monthGradeB + data.monthGradeC) > 0 && (
        <div ref={el => { sectionRefs.current[2] = el; }} className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-400" />
              <h2 className="text-sm font-semibold text-iot-primary">Monthly Grading</h2>
            </div>
            <div className="text-xs text-iot-muted">
              {data.monthGradeA + data.monthGradeB + data.monthGradeC} total harvests
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-iot-tertiary rounded-full overflow-hidden flex">
              {data.monthGradeA > 0 && (
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(data.monthGradeA / (data.monthGradeA + data.monthGradeB + data.monthGradeC)) * 100}%` }}
                />
              )}
              {data.monthGradeB > 0 && (
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(data.monthGradeB / (data.monthGradeA + data.monthGradeB + data.monthGradeC)) * 100}%` }}
                />
              )}
              {data.monthGradeC > 0 && (
                <div
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${(data.monthGradeC / (data.monthGradeA + data.monthGradeB + data.monthGradeC)) * 100}%` }}
                />
              )}
            </div>
            <div className="flex gap-3 text-xs flex-shrink-0">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                A: {data.monthGradeA} ({Math.round((data.monthGradeA / (data.monthGradeA + data.monthGradeB + data.monthGradeC)) * 100)}%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                B: {data.monthGradeB}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                C: {data.monthGradeC}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Problems Now */}
      {problems.length > 0 && (
        <div ref={el => { sectionRefs.current[3] = el; }} className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h2 className="text-sm font-semibold text-iot-primary">
              Top Problems Now
            </h2>
            <span className="text-xs text-iot-muted ml-auto">
              {problems.length} issue{problems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {problems.slice(0, 5).map((p, i) => {
              const style = severityStyle[p.severity];
              return (
                <div
                  key={i}
                  onClick={() => navigate(`/rooms/${p.roomId}`)}
                  className={`flex items-center gap-3 p-3 rounded-xl ${style.bg} border ${style.border} cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  <div className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0 ${p.severity === 'critical' ? 'animate-pulse' : ''}`} />
                  <p.icon className={`w-4 h-4 ${style.text} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${style.text}`}>{p.roomName}</span>
                      <span className="text-[10px] text-iot-muted">—</span>
                      <span className={`text-xs font-semibold ${style.text}`}>{p.message}</span>
                    </div>
                    <p className="text-[11px] text-iot-muted truncate">{p.detail}</p>
                  </div>
                  <span className="text-[10px] text-iot-muted flex-shrink-0">{p.timeInfo}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Room Cards Grid */}
      <div ref={el => { sectionRefs.current[4] = el; }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-iot-primary">
            Room Health Grid ({data.rooms.length})
          </h2>
          <span className="text-xs text-iot-muted">
            Click a room for detailed controls
          </span>
        </div>
        {sortedRooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedRooms.map((room) => (
              <RoomCard
                key={room.roomId}
                room={room}
                onClick={() => navigate(`/rooms/${room.roomId}`)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-iot-secondary rounded-2xl p-8 text-center border border-iot-subtle">
            <p className="text-iot-muted">No rooms found for this plant.</p>
          </div>
        )}
      </div>

      {/* Alert Summary */}
      {data.activeAlerts > 0 && (
        <div ref={el => { sectionRefs.current[5] = el; }} className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-iot-primary">Alerts</h2>
          </div>
          <p className="text-sm text-iot-secondary">
            {data.activeAlerts} active alert{data.activeAlerts !== 1 ? 's' : ''}
            {data.criticalAlerts > 0 && (
              <span className="text-red-400 ml-1">
                ({data.criticalAlerts} critical)
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-iot-subtle text-iot-secondary"
            onClick={() => navigate('/alerts')}
          >
            View All Alerts
          </Button>
        </div>
      )}
    </div>
  );
};

export default PlantDashboard;
