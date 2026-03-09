import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import {
  Leaf, DoorOpen, Cpu, Users, Bell, AlertTriangle, CheckCircle, Wifi, WifiOff,
  ArrowRight, Clock, CircleDot,
} from 'lucide-react';
import { MetricCard } from '@/components/cards/MetricCard';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '@/services/dashboardService';
import { mapAdminDashboardSummary } from '@/utils/mappers';
import type { AdminDashboardSummary } from '@/types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from 'recharts';

const COLORS = {
  online: '#27FB6B',
  offline: '#FF2D55',
  unassigned: '#6D7484',
  active: '#27FB6B',
  pending: '#FFD166',
  suspended: '#FF2D55',
  expired: '#6D7484',
  fruiting: '#2EEFFF',
  spawnRun: '#B26CFF',
  incubation: '#FFD166',
  storage: '#6D7484',
  critical: '#FF2D55',
  warning: '#FFD166',
  acknowledged: '#2EEFFF',
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-iot-secondary border border-iot-subtle rounded-lg p-3">
        <p className="text-xs text-iot-muted">{payload[0].name}</p>
        <p className="text-sm font-mono text-iot-primary">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [data, setData] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getAdminSummary()
      .then(raw => setData(mapAdminDashboardSummary(raw)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    sectionRefs.current.forEach((ref, index) => {
      if (ref) {
        gsap.fromTo(
          ref,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.5, delay: index * 0.08, ease: 'power3.out' }
        );
      }
    });
  }, [data]);

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
        <p className="text-iot-muted">Failed to load admin dashboard data.</p>
      </div>
    );
  }

  // Prepare chart data
  const devicePieData = [
    { name: 'Online', value: data.deviceStatus.online, color: COLORS.online },
    { name: 'Offline', value: data.deviceStatus.offline, color: COLORS.offline },
    { name: 'Unassigned', value: data.deviceStatus.unassigned, color: COLORS.unassigned },
  ].filter(d => d.value > 0);

  const subscriptionData = [
    { name: 'Active', value: data.subscriptions.active, color: COLORS.active },
    { name: 'Pending', value: data.subscriptions.pending, color: COLORS.pending },
    { name: 'Suspended', value: data.subscriptions.suspended, color: COLORS.suspended },
    { name: 'Expired', value: data.subscriptions.expired, color: COLORS.expired },
  ];

  const roomTypeData = [
    { name: 'Fruiting', value: data.roomTypes.fruiting, fill: COLORS.fruiting },
    { name: 'Spawn Run', value: data.roomTypes.spawnRun, fill: COLORS.spawnRun },
    { name: 'Incubation', value: data.roomTypes.incubation, fill: COLORS.incubation },
    { name: 'Storage', value: data.roomTypes.storage, fill: COLORS.storage },
  ];

  const getPlantHealthColor = (plant: typeof data.plants[0]) => {
    if (plant.totalDevices === 0) return '#6D7484';
    if (plant.onlineDevices === plant.totalDevices) return '#27FB6B';
    if (plant.onlineDevices > 0) return '#FFD166';
    return '#FF2D55';
  };

  const timeAgo = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Page Header */}
      <div ref={el => { sectionRefs.current[0] = el; }}>
        <h1 className="text-2xl font-bold text-iot-primary mb-1">Admin Dashboard</h1>
        <p className="text-sm text-iot-secondary">Fleet & infrastructure overview</p>
      </div>

      {/* Section 2: Fleet Summary Cards */}
      <div ref={el => { sectionRefs.current[1] = el; }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Plants" value={data.totalPlants} icon={Leaf} color="cyan" />
        <MetricCard title="Total Rooms" value={data.totalRooms} icon={DoorOpen} color="purple" />
        <MetricCard title="Total Devices" value={data.totalDevices} icon={Cpu} color="green" />
        <MetricCard title="Total Users" value={data.totalUsers} icon={Users} color="yellow" />
      </div>

      {/* Section 3: Device Fleet Status + Subscriptions */}
      <div ref={el => { sectionRefs.current[2] = el; }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Device Status Donut */}
        <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <h2 className="text-lg font-semibold text-iot-primary mb-4">Device Fleet Status</h2>
          <div className="flex items-center gap-6">
            <div className="w-40 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={devicePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {devicePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4" style={{ color: COLORS.online }} />
                  <span className="text-sm text-iot-secondary">Online</span>
                </div>
                <span className="text-sm font-mono text-iot-primary">{data.deviceStatus.online}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4" style={{ color: COLORS.offline }} />
                  <span className="text-sm text-iot-secondary">Offline</span>
                </div>
                <span className="text-sm font-mono text-iot-primary">{data.deviceStatus.offline}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDot className="w-4 h-4" style={{ color: COLORS.unassigned }} />
                  <span className="text-sm text-iot-secondary">Unassigned</span>
                </div>
                <span className="text-sm font-mono text-iot-primary">{data.deviceStatus.unassigned}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <h2 className="text-lg font-semibold text-iot-primary mb-4">License Key Status</h2>
          <div className="space-y-3">
            {subscriptionData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide"
                    style={{
                      backgroundColor: item.color + '26',
                      color: item.color,
                    }}
                  >
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-iot-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: data.totalDevices > 0 ? `${(item.value / data.totalDevices) * 100}%` : '0%',
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                  <span className="text-sm font-mono text-iot-primary w-8 text-right">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Plant Overview Table */}
      <div ref={el => { sectionRefs.current[3] = el; }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-iot-primary">Plant Overview</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/plants')}
            className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
          >
            Manage Plants
          </Button>
        </div>
        <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-iot-subtle">
                <th className="text-left text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Plant</th>
                <th className="text-left text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Type</th>
                <th className="text-center text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Rooms</th>
                <th className="text-center text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Devices</th>
                <th className="text-center text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Online</th>
                <th className="text-center text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Alerts</th>
                <th className="text-center text-xs font-medium text-iot-muted uppercase tracking-wider p-4">Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-iot-subtle">
              {data.plants.map(plant => (
                <tr
                  key={plant.plantId}
                  className="hover:bg-iot-tertiary/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/plants')}
                >
                  <td className="p-4">
                    <div>
                      <p className="text-sm font-medium text-iot-primary">{plant.plantName}</p>
                      <p className="text-xs text-iot-muted">{plant.plantCode}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs font-medium text-iot-secondary bg-iot-tertiary px-2 py-1 rounded">
                      {plant.plantType}
                    </span>
                  </td>
                  <td className="p-4 text-center text-sm font-mono text-iot-primary">{plant.totalRooms}</td>
                  <td className="p-4 text-center text-sm font-mono text-iot-primary">{plant.totalDevices}</td>
                  <td className="p-4 text-center text-sm font-mono" style={{ color: COLORS.online }}>
                    {plant.onlineDevices}
                  </td>
                  <td className="p-4 text-center">
                    {plant.activeAlerts > 0 ? (
                      <span className="text-sm font-mono" style={{ color: COLORS.critical }}>
                        {plant.activeAlerts}
                      </span>
                    ) : (
                      <span className="text-sm text-iot-muted">0</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <div
                      className="w-3 h-3 rounded-full mx-auto"
                      style={{ backgroundColor: getPlantHealthColor(plant) }}
                    />
                  </td>
                </tr>
              ))}
              {data.plants.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-iot-muted">
                    No plants registered yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Room Type Distribution + Alert Summary */}
      <div ref={el => { sectionRefs.current[4] = el; }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Room Type Distribution */}
        <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <h2 className="text-lg font-semibold text-iot-primary mb-4">Room Type Distribution</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={roomTypeData} layout="vertical">
                <XAxis type="number" stroke="#6D7484" fontSize={10} />
                <YAxis type="category" dataKey="name" stroke="#6D7484" fontSize={11} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {roomTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Summary */}
        <div className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-iot-primary">Alert Summary</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/alerts')}
              className="border-iot-subtle text-iot-secondary hover:text-iot-primary"
            >
              View All
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-iot-tertiary rounded-xl p-4 text-center">
              <Bell className="w-5 h-5 mx-auto mb-2" style={{ color: COLORS.critical }} />
              <p className="text-2xl font-bold font-mono text-iot-primary">{data.alerts.active}</p>
              <p className="text-xs text-iot-muted mt-1">Active</p>
            </div>
            <div className="bg-iot-tertiary rounded-xl p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-2" style={{ color: COLORS.critical }} />
              <p className="text-2xl font-bold font-mono" style={{ color: COLORS.critical }}>{data.alerts.critical}</p>
              <p className="text-xs text-iot-muted mt-1">Critical</p>
            </div>
            <div className="bg-iot-tertiary rounded-xl p-4 text-center">
              <AlertTriangle className="w-5 h-5 mx-auto mb-2" style={{ color: COLORS.warning }} />
              <p className="text-2xl font-bold font-mono" style={{ color: COLORS.warning }}>{data.alerts.warning}</p>
              <p className="text-xs text-iot-muted mt-1">Warning</p>
            </div>
            <div className="bg-iot-tertiary rounded-xl p-4 text-center">
              <CheckCircle className="w-5 h-5 mx-auto mb-2" style={{ color: COLORS.online }} />
              <p className="text-2xl font-bold font-mono" style={{ color: COLORS.online }}>{data.alerts.resolvedToday}</p>
              <p className="text-xs text-iot-muted mt-1">Resolved Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Recent Activity Feed */}
      <div ref={el => { sectionRefs.current[5] = el; }}>
        <h2 className="text-lg font-semibold text-iot-primary mb-4">Recent Activity</h2>
        <div className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
          {data.recentEvents.length > 0 ? (
            <div className="divide-y divide-iot-subtle">
              {data.recentEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-iot-tertiary/50 transition-colors">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: event.event === 'online'
                        ? COLORS.online + '1A'
                        : event.event === 'offline'
                          ? COLORS.offline + '1A'
                          : COLORS.pending + '1A',
                    }}
                  >
                    {event.event === 'online' ? (
                      <Wifi className="w-4 h-4" style={{ color: COLORS.online }} />
                    ) : event.event === 'offline' ? (
                      <WifiOff className="w-4 h-4" style={{ color: COLORS.offline }} />
                    ) : (
                      <Cpu className="w-4 h-4" style={{ color: COLORS.pending }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-iot-primary truncate">
                      <span className="font-medium">{event.deviceName}</span>
                      {' '}
                      <span className="text-iot-muted">
                        {event.event === 'online' ? 'came online' : event.event === 'offline' ? 'went offline' : 'was registered'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-iot-muted flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {timeAgo(event.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-iot-muted">No recent device activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Section 7: Quick Navigation */}
      <div ref={el => { sectionRefs.current[6] = el; }}>
        <h2 className="text-lg font-semibold text-iot-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Manage Plants', path: '/plants', icon: Leaf, color: '#2EEFFF' },
            { label: 'Manage Devices', path: '/devices', icon: Cpu, color: '#27FB6B' },
            { label: 'View Alerts', path: '/alerts', icon: Bell, color: '#FFD166' },
            { label: 'User Management', path: '/users', icon: Users, color: '#B26CFF' },
          ].map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle hover:border-iot-primary/30 transition-all group text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: item.color + '1A' }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <span className="text-sm font-medium text-iot-primary">{item.label}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-iot-muted group-hover:text-iot-primary transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
