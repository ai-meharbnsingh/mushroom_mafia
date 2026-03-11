import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from '@/store/AppContext';
import { useWebSocketSimulation } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';
import { plantService } from '@/services/plantService';
import { roomService } from '@/services/roomService';
import { deviceService } from '@/services/deviceService';
import { alertService } from '@/services/alertService';
import { reportService } from '@/services/reportService';
import { userService } from '@/services/userService';
import { dashboardService } from '@/services/dashboardService';
import { mapPlant, mapRoom, mapDevice, mapAlert, mapUser, mapReport } from '@/utils/mappers';

// Layout
import { MainLayout } from '@/components/layout/MainLayout';

// Pages
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Plants } from '@/pages/Plants';
import { Rooms } from '@/pages/Rooms';
import { RoomDetail } from '@/pages/RoomDetail';
import { Devices } from '@/pages/Devices';
import { Settings } from '@/pages/Settings';
import { Alerts } from '@/pages/Alerts';
import { Reports } from '@/pages/Reports';
import { Users } from '@/pages/Users';
import { Profile } from '@/pages/Profile';
import { FirmwareManagement } from '@/pages/FirmwareManagement';
import { FlashDevice } from '@/pages/FlashDevice';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useApp();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useApp();

  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (state.currentUser?.role !== 'ADMIN' && state.currentUser?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Data Initialization Component - fetches real data from API
const DataInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state, dispatch } = useApp();
  const { checkAuth } = useAuth();
  const [initialized, setInitialized] = useState(false);

  // Check auth on mount (restore session from stored token)
  useEffect(() => {
    checkAuth().finally(() => setInitialized(true));
  }, [checkAuth]);

  // Fetch data when authenticated
  useEffect(() => {
    if (!state.isAuthenticated || !initialized) return;

    const fetchData = async () => {
      try {
        const [plantsRes, roomsRes, devicesRes, alertsRes, reportsRes, usersRes] = await Promise.allSettled([
          plantService.getAll(),
          roomService.getAll(),
          deviceService.getAll(),
          alertService.getAll(),
          reportService.getAll(),
          userService.getAll(),
        ]);

        const plants = plantsRes.status === 'fulfilled'
          ? (Array.isArray(plantsRes.value) ? plantsRes.value : []).map(mapPlant)
          : [];

        const rooms = roomsRes.status === 'fulfilled'
          ? (Array.isArray(roomsRes.value) ? roomsRes.value : []).map((r: any) => mapRoom(r, plants))
          : [];

        const devices = devicesRes.status === 'fulfilled'
          ? (Array.isArray(devicesRes.value) ? devicesRes.value : []).map((d: any) => mapDevice(d, rooms))
          : [];

        const alerts = alertsRes.status === 'fulfilled'
          ? (Array.isArray(alertsRes.value) ? alertsRes.value : []).map((a: any) => mapAlert(a, rooms, devices))
          : [];

        const reports = reportsRes.status === 'fulfilled'
          ? (Array.isArray(reportsRes.value) ? reportsRes.value : []).map(mapReport)
          : [];

        const users = usersRes.status === 'fulfilled'
          ? (Array.isArray(usersRes.value) ? usersRes.value : []).map(mapUser)
          : [];

        dispatch({ type: 'SET_PLANTS', payload: plants });
        dispatch({ type: 'SET_ROOMS', payload: rooms });
        dispatch({ type: 'SET_DEVICES', payload: devices });
        dispatch({ type: 'SET_ALERTS', payload: alerts });
        dispatch({ type: 'SET_REPORTS', payload: reports });
        dispatch({ type: 'SET_USERS', payload: users });

        // Fetch dashboard summary
        try {
          const summary = await dashboardService.getSummary();
          dispatch({
            type: 'SET_DASHBOARD_SUMMARY',
            payload: {
              totalPlants: summary.total_plants ?? summary.totalPlants ?? plants.length,
              totalRooms: summary.total_rooms ?? summary.totalRooms ?? rooms.length,
              activeDevices: summary.active_devices ?? summary.activeDevices ?? devices.filter((d: any) => d.onlineStatus === 'ONLINE').length,
              activeAlerts: summary.active_alerts ?? summary.activeAlerts ?? alerts.filter((a: any) => a.status === 'ACTIVE').length,
            },
          });
        } catch {
          // Summary computed from SET_* dispatches as fallback
        }
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };

    fetchData();
  }, [state.isAuthenticated, initialized, dispatch]);

  // Don't render routes until auth state is determined (prevents flash redirect to /login)
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
};

// WebSocket Wrapper - only connects when authenticated
const WebSocketWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useApp();
  if (state.isAuthenticated) {
    return <WebSocketInner>{children}</WebSocketInner>;
  }
  return <>{children}</>;
};

const WebSocketInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useWebSocketSimulation();
  return <>{children}</>;
};

function App() {
  return (
    <AppProvider>
      <DataInitializer>
        <WebSocketWrapper>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="plants" element={<Plants />} />
                <Route path="rooms" element={<Rooms />} />
                <Route path="rooms/:roomId" element={<RoomDetail />} />
                <Route path="devices" element={<Devices />} />
                <Route path="settings" element={<Settings />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="reports" element={<Reports />} />
                <Route path="profile" element={<Profile />} />

                {/* Admin Only Routes */}
                <Route
                  path="users"
                  element={
                    <AdminRoute>
                      <Users />
                    </AdminRoute>
                  }
                />
                <Route
                  path="firmware"
                  element={
                    <AdminRoute>
                      <FirmwareManagement />
                    </AdminRoute>
                  }
                />
                <Route
                  path="flash-device"
                  element={
                    <AdminRoute>
                      <FlashDevice />
                    </AdminRoute>
                  }
                />
              </Route>

              {/* Catch All */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </WebSocketWrapper>
      </DataInitializer>
    </AppProvider>
  );
}

export default App;
