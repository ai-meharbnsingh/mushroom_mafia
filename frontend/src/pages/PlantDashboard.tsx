import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import {
  DoorOpen, Cpu, Wifi, WifiOff, AlertTriangle, Bell,
  MapPin, ArrowLeft,
} from 'lucide-react';
import { MetricCard } from '@/components/cards/MetricCard';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { TypeBadge } from '@/components/ui-custom/TypeBadge';
import { useApp } from '@/store/AppContext';
import { dashboardService } from '@/services/dashboardService';
import { mapPlantDashboardSummary } from '@/utils/mappers';
import type { PlantDashboardSummary, PlantType, RoomType } from '@/types';

export const PlantDashboard: React.FC = () => {
  const { plantId } = useParams<{ plantId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [data, setData] = useState<PlantDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlantId, setSelectedPlantId] = useState(plantId || '');

  const plantOptions = useMemo(() =>
    state.plants.map(p => ({ value: p.id, label: `${p.name} (${p.code})` })),
    [state.plants]
  );

  useEffect(() => {
    if (!selectedPlantId) return;
    setLoading(true);
    dashboardService.getPlantDashboard(Number(selectedPlantId))
      .then(raw => setData(mapPlantDashboardSummary(raw)))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selectedPlantId]);

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

  const roomStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'active';
      case 'SUSPENDED': return 'warning';
      case 'MAINTENANCE': return 'warning';
      case 'INACTIVE': return 'inactive';
      default: return 'active';
    }
  };

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
            <h1 className="text-2xl font-bold text-iot-primary">{data.plantName}</h1>
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

      {/* Metric Cards */}
      <div ref={el => { sectionRefs.current[1] = el; }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Rooms" value={data.totalRooms} icon={DoorOpen} color="purple" />
        <MetricCard title="Total Devices" value={data.totalDevices} icon={Cpu} color="cyan" />
        <MetricCard title="Online Devices" value={data.onlineDevices} icon={Wifi} color="green" />
        <MetricCard title="Active Alerts" value={data.activeAlerts} icon={Bell} color={data.criticalAlerts > 0 ? 'red' : 'yellow'} />
      </div>

      {/* Rooms Table */}
      <div ref={el => { sectionRefs.current[2] = el; }} className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden">
        <div className="p-4 border-b border-iot-subtle">
          <h2 className="text-lg font-semibold text-iot-primary">Rooms</h2>
        </div>
        {data.rooms.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Name</th>
                  <th>Code</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Device</th>
                  <th>Online</th>
                </tr>
              </thead>
              <tbody>
                {data.rooms.map((room) => (
                  <tr
                    key={room.roomId}
                    className="cursor-pointer hover:bg-iot-tertiary/30"
                    onClick={() => navigate(`/rooms/${room.roomId}`)}
                  >
                    <td className="font-medium">{room.roomName}</td>
                    <td className="font-mono text-iot-secondary">{room.roomCode}</td>
                    <td>
                      <TypeBadge type={room.roomType as RoomType} variant="room" />
                    </td>
                    <td>
                      <StatusBadge status={roomStatusColor(room.status)} />
                    </td>
                    <td>
                      {room.hasDevice ? (
                        <span className="text-sm">{room.deviceName}</span>
                      ) : (
                        <span className="badge badge-orange">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {room.hasDevice ? (
                        room.isOnline ? (
                          <Wifi className="w-4 h-4 text-green-400" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-red-400" />
                        )
                      ) : (
                        <span className="text-iot-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-iot-muted">
            No rooms found for this plant.
          </div>
        )}
      </div>

      {/* Alert Summary */}
      {data.activeAlerts > 0 && (
        <div ref={el => { sectionRefs.current[3] = el; }} className="bg-iot-secondary rounded-2xl p-5 border border-iot-subtle">
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
