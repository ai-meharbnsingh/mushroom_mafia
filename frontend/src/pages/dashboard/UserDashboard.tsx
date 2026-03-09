import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Leaf, DoorOpen, Cpu, Bell } from 'lucide-react';
import { MetricCard } from '@/components/cards/MetricCard';
import { RoomCard } from '@/components/cards/RoomCard';
import { SeverityBadge } from '@/components/ui-custom/SeverityBadge';
import { Button } from '@/components/ui/button';
import { useApp } from '@/store/AppContext';
import { useNavigate } from 'react-router-dom';
import type { Alert, HistoricalDataPoint } from '@/types';
import { readingService } from '@/services/readingService';
import { alertService } from '@/services/alertService';
import { mapAlert } from '@/utils/mappers';

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
import { generateHistoricalData } from '@/lib/mockData';

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number}>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-iot-secondary border border-iot-subtle rounded-lg p-3">
        <p className="text-xs text-iot-muted mb-1">{label}</p>
        <p className="text-sm font-mono text-iot-primary">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export const UserDashboard: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [chartData, setChartData] = useState<HistoricalDataPoint[]>([]);

  const recentAlerts = state.alerts
    .filter(a => a.status === 'ACTIVE')
    .slice(0, 5);

  const roomsWithReadings = state.rooms.map(room => ({
    room,
    reading: state.sensorReadings.get(room.id),
    thresholds: state.thresholds.get(room.id),
  }));

  useEffect(() => {
    if (!state.rooms[0]) {
      setChartData([]);
      return;
    }
    const roomId = state.rooms[0].id;
    readingService
      .getByRoom(Number(roomId), { limit: 24 })
      .then((readings: any[]) => {
        if (readings && readings.length > 0) {
          const mapped: HistoricalDataPoint[] = readings.map((r: any) => ({
            timestamp: r.timestamp ?? r.created_at ?? new Date().toISOString(),
            co2: r.co2_ppm ?? r.co2 ?? 0,
            temperature: r.room_temp ?? r.temperature ?? 0,
            humidity: r.room_humidity ?? r.humidity ?? 0,
          }));
          setChartData(mapped);
        } else {
          setChartData(generateHistoricalData(roomId, 24));
        }
      })
      .catch(() => {
        setChartData(generateHistoricalData(roomId, 24));
      });
  }, [state.rooms]);

  useEffect(() => {
    sectionRefs.current.forEach((ref, index) => {
      if (ref) {
        gsap.fromTo(
          ref,
          { opacity: 0, y: 12 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            delay: index * 0.08,
            ease: 'power3.out',
          }
        );
      }
    });
  }, []);

  const handleAcknowledge = async (alert: Alert) => {
    try {
      const res = await alertService.acknowledge(Number(alert.id));
      dispatch({
        type: 'UPDATE_ALERT',
        payload: mapAlert(res, state.rooms, state.devices),
      });
    } catch {
      console.error('Failed to acknowledge alert:', alert.id);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div ref={el => { sectionRefs.current[0] = el; }}>
        <h1 className="text-2xl font-bold text-iot-primary mb-1">Dashboard</h1>
        <p className="text-sm text-iot-secondary">Real-time monitoring overview</p>
      </div>

      {/* Summary Cards */}
      <div ref={el => { sectionRefs.current[1] = el; }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Plants"
          value={state.dashboardSummary.totalPlants}
          icon={Leaf}
          color="cyan"
        />
        <MetricCard
          title="Total Rooms"
          value={state.dashboardSummary.totalRooms}
          icon={DoorOpen}
          color="purple"
        />
        <MetricCard
          title="Active Devices"
          value={state.dashboardSummary.activeDevices}
          icon={Cpu}
          color="green"
        />
        <MetricCard
          title="Active Alerts"
          value={state.dashboardSummary.activeAlerts}
          icon={Bell}
          color={state.dashboardSummary.activeAlerts > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Room Sensor Grid */}
      <div ref={el => { sectionRefs.current[2] = el; }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-iot-primary">Live Room Sensors</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/rooms')}
            className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
          >
            View All Rooms
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roomsWithReadings.slice(0, 6).map(({ room, reading, thresholds }, index) => (
            <RoomCard
              key={room.id}
              room={room}
              reading={reading}
              thresholds={thresholds}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* Historical Charts */}
      <div ref={el => { sectionRefs.current[3] = el; }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-iot-primary">Historical Data</h2>
          <select className="input-dark text-sm py-1.5 px-3">
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CO2 Chart */}
          <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
            <h3 className="text-sm font-medium text-iot-secondary mb-4">CO2 (ppm)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                    stroke="#6D7484"
                    fontSize={10}
                  />
                  <YAxis stroke="#6D7484" fontSize={10} domain={[1000, 1500]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceArea y1={1200} y2={1300} fill="#27FB6B" fillOpacity={0.1} />
                  <Line
                    type="monotone"
                    dataKey="co2"
                    stroke="#2EEFFF"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#2EEFFF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temperature Chart */}
          <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
            <h3 className="text-sm font-medium text-iot-secondary mb-4">Temperature (°C)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                    stroke="#6D7484"
                    fontSize={10}
                  />
                  <YAxis stroke="#6D7484" fontSize={10} domain={[15, 25]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceArea y1={16} y2={17} fill="#27FB6B" fillOpacity={0.1} />
                  <Line
                    type="monotone"
                    dataKey="temperature"
                    stroke="#27FB6B"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#27FB6B' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Humidity Chart */}
          <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
            <h3 className="text-sm font-medium text-iot-secondary mb-4">Humidity (%)</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                    stroke="#6D7484"
                    fontSize={10}
                  />
                  <YAxis stroke="#6D7484" fontSize={10} domain={[70, 95]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceArea y1={87.5} y2={90} fill="#27FB6B" fillOpacity={0.1} />
                  <Line
                    type="monotone"
                    dataKey="humidity"
                    stroke="#B26CFF"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#B26CFF' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div ref={el => { sectionRefs.current[4] = el; }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-iot-primary">Recent Alerts</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/alerts')}
            className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
          >
            View All Alerts
          </Button>
        </div>

        <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
          {recentAlerts.length > 0 ? (
            <div className="divide-y divide-iot-subtle">
              {recentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-4 hover:bg-iot-tertiary/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <SeverityBadge severity={alert.severity} />
                    <div>
                      <p className="text-sm text-iot-primary">{alert.message}</p>
                      <p className="text-xs text-iot-muted mt-0.5">
                        {alert.roomName} • {new Date(alert.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAcknowledge(alert)}
                    className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
                  >
                    Acknowledge
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-iot-muted">No active alerts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
