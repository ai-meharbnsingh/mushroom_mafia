import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Search, Filter, Check, CheckCheck, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SeverityBadge } from '@/components/ui-custom/SeverityBadge';
import { EmptyState } from '@/components/ui-custom/EmptyState';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { alertService } from '@/services/alertService';
import { mapAlert } from '@/utils/mappers';
import type { Alert, AlertSeverity } from '@/types';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export const Alerts: React.FC = () => {
  const { state, dispatch } = useApp();
  const toast = useToast();
  const { checkPermission } = useAuth();
  const tableRef = useRef<HTMLDivElement>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [roomFilter, setRoomFilter] = useState<string>('ALL');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [activeTab, setActiveTab] = useState<string>('ACTIVE');
  
  useEffect(() => {
    if (tableRef.current) {
      gsap.fromTo(
        tableRef.current.querySelectorAll('tr'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: 'power3.out' }
      );
    }
  }, [activeTab]);
  
  // Filter alerts based on tab and filters
  const filteredAlerts = state.alerts.filter(alert => {
    const matchesTab = activeTab === 'ALL' || alert.status === activeTab;
    const matchesSearch = searchQuery === '' || alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;
    const matchesRoom = roomFilter === 'ALL' || alert.roomId === roomFilter;
    
    return matchesTab && matchesSearch && matchesSeverity && matchesRoom;
  });
  
  // Count alerts by status
  const alertCounts = {
    ACTIVE: state.alerts.filter(a => a.status === 'ACTIVE').length,
    ACKNOWLEDGED: state.alerts.filter(a => a.status === 'ACKNOWLEDGED').length,
    RESOLVED: state.alerts.filter(a => a.status === 'RESOLVED').length,
    ALL: state.alerts.length,
  };
  
  const handleAcknowledge = async (alert: Alert) => {
    try {
      const res = await alertService.acknowledge(Number(alert.id));
      dispatch({ type: 'UPDATE_ALERT', payload: mapAlert(res) });
      toast.success('Alert acknowledged');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to acknowledge alert');
    }
  };

  const handleResolve = async (alert: Alert) => {
    try {
      const res = await alertService.resolve(Number(alert.id));
      dispatch({ type: 'UPDATE_ALERT', payload: mapAlert(res) });
      toast.success('Alert resolved');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to resolve alert');
    }
  };
  
  // Generate mock chart data for alert detail
  const chartData = selectedAlert
    ? Array.from({ length: 12 }, (_, i) => ({
        time: `${i * 2}:00`,
        value: (selectedAlert.currentValue || 0) + Math.random() * 100 - 50,
        threshold: selectedAlert.thresholdValue || 0,
      }))
    : [];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-iot-primary mb-1">Alerts</h1>
        <p className="text-sm text-iot-secondary">Monitor and manage system alerts</p>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-iot-secondary border border-iot-subtle">
          <TabsTrigger value="ACTIVE" className="data-[state=active]:bg-iot-cyan/20 data-[state=active]:text-iot-cyan">
            Active ({alertCounts.ACTIVE})
          </TabsTrigger>
          <TabsTrigger value="ACKNOWLEDGED" className="data-[state=active]:bg-iot-yellow/20 data-[state=active]:text-iot-yellow">
            Acknowledged ({alertCounts.ACKNOWLEDGED})
          </TabsTrigger>
          <TabsTrigger value="RESOLVED" className="data-[state=active]:bg-iot-green/20 data-[state=active]:text-iot-green">
            Resolved ({alertCounts.RESOLVED})
          </TabsTrigger>
          <TabsTrigger value="ALL" className="data-[state=active]:bg-iot-purple/20 data-[state=active]:text-iot-purple">
            All ({alertCounts.ALL})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iot-muted" />
              <Input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-dark pl-10 w-full"
              />
            </div>
            
            <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as AlertSeverity | 'ALL')}>
              <SelectTrigger className="input-dark w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-iot-secondary border-iot-subtle">
                <SelectItem value="ALL">All Severities</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={roomFilter} onValueChange={setRoomFilter}>
              <SelectTrigger className="input-dark w-48">
                <SelectValue placeholder="Room" />
              </SelectTrigger>
              <SelectContent className="bg-iot-secondary border-iot-subtle">
                <SelectItem value="ALL">All Rooms</SelectItem>
                {state.rooms.map(room => (
                  <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Table */}
          {filteredAlerts.length > 0 ? (
            <div
              ref={tableRef}
              className="bg-iot-secondary rounded-2xl border border-iot-subtle overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Type</th>
                      <th>Room</th>
                      <th>Message</th>
                      <th>Current / Threshold</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-iot-tertiary/30">
                        <td>
                          <SeverityBadge severity={alert.severity} />
                        </td>
                        <td>
                          <span className="text-xs font-mono text-iot-secondary">{alert.type}</span>
                        </td>
                        <td>{alert.roomName}</td>
                        <td className="max-w-xs truncate">{alert.message}</td>
                        <td className="font-mono text-xs">
                          {alert.currentValue !== undefined && alert.thresholdValue !== undefined ? (
                            <span>
                              <span className={alert.currentValue > alert.thresholdValue ? 'text-iot-red' : 'text-iot-yellow'}>
                                {alert.currentValue}
                              </span>
                              {' / '}
                              <span className="text-iot-green">{alert.thresholdValue}</span>
                              {' '}{alert.unit}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="text-iot-muted text-xs">
                          {new Date(alert.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedAlert(alert)}
                              className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-cyan hover:bg-iot-cyan/10 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {alert.status === 'ACTIVE' && checkPermission('OPERATOR') && (
                              <button
                                onClick={() => handleAcknowledge(alert)}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-yellow hover:bg-iot-yellow/10 transition-colors"
                                title="Acknowledge"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {alert.status !== 'RESOLVED' && checkPermission('MANAGER') && (
                              <button
                                onClick={() => handleResolve(alert)}
                                className="p-1.5 rounded-lg text-iot-secondary hover:text-iot-green hover:bg-iot-green/10 transition-colors"
                                title="Resolve"
                              >
                                <CheckCheck className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={CheckCheck}
              title="No alerts found"
              description={`No ${activeTab.toLowerCase()} alerts match your filters.`}
            />
          )}
        </TabsContent>
      </Tabs>
      
      {/* Alert Detail Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="bg-iot-secondary border-iot-subtle max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-iot-primary flex items-center gap-3">
              <SeverityBadge severity={selectedAlert?.severity || 'INFO'} />
              Alert Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-6">
              <div>
                <p className="text-lg text-iot-primary">{selectedAlert.message}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-iot-muted">
                  <span>{selectedAlert.roomName}</span>
                  <span>•</span>
                  <span>{selectedAlert.deviceName}</span>
                  <span>•</span>
                  <span>{new Date(selectedAlert.createdAt).toLocaleString()}</span>
                </div>
              </div>
              
              {selectedAlert.currentValue !== undefined && selectedAlert.thresholdValue !== undefined && (
                <div>
                  <h4 className="text-sm font-medium text-iot-secondary mb-3">Sensor Reading vs Threshold</h4>
                  <div className="h-48 bg-iot-tertiary rounded-lg p-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="time" stroke="#6D7484" fontSize={10} />
                        <YAxis stroke="#6D7484" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#11131A',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                          }}
                        />
                        <ReferenceLine
                          y={selectedAlert.thresholdValue}
                          stroke="#FF2D55"
                          strokeDasharray="3 3"
                          label={{ value: 'Threshold', fill: '#FF2D55', fontSize: 10 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#2EEFFF"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-iot-muted">Alert Type</p>
                  <p className="text-iot-primary font-mono">{selectedAlert.type}</p>
                </div>
                <div>
                  <p className="text-iot-muted">Status</p>
                  <p className="text-iot-primary">{selectedAlert.status}</p>
                </div>
                {selectedAlert.acknowledgedBy && (
                  <div>
                    <p className="text-iot-muted">Acknowledged By</p>
                    <p className="text-iot-primary">{selectedAlert.acknowledgedBy}</p>
                  </div>
                )}
                {selectedAlert.resolvedAt && (
                  <div>
                    <p className="text-iot-muted">Resolved At</p>
                    <p className="text-iot-primary">{new Date(selectedAlert.resolvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alerts;
