import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  User,
  Plant,
  Room,
  Device,
  Alert,
  Report,
  SensorReading,
  RoomThresholds,
  DashboardSummary,
  Toast,
  RelayState,
  TriggerType,
} from '@/types';

// State Interface
interface AppState {
  // Auth
  isAuthenticated: boolean;
  currentUser: User | null;
  loginError: string | null;
  isLocked: boolean;
  lockoutTime: number;
  
  // Data
  plants: Plant[];
  rooms: Room[];
  devices: Device[];
  alerts: Alert[];
  reports: Report[];
  users: User[];
  sensorReadings: Map<string, SensorReading>;
  thresholds: Map<string, RoomThresholds>;
  
  // UI State
  sidebarCollapsed: boolean;
  toasts: Toast[];
  
  // WebSocket
  wsConnected: boolean;
  
  // Dashboard
  dashboardSummary: DashboardSummary;
  selectedRoomId: string | null;
  selectedPlantId: string | null;
}

// Initial State
const initialState: AppState = {
  isAuthenticated: false,
  currentUser: null,
  loginError: null,
  isLocked: false,
  lockoutTime: 0,
  
  plants: [],
  rooms: [],
  devices: [],
  alerts: [],
  reports: [],
  users: [],
  sensorReadings: new Map(),
  thresholds: new Map(),
  
  sidebarCollapsed: false,
  toasts: [],
  
  wsConnected: false,
  
  dashboardSummary: {
    totalPlants: 0,
    totalRooms: 0,
    activeDevices: 0,
    activeAlerts: 0,
  },
  selectedRoomId: null,
  selectedPlantId: null,
};

// Action Types
type Action =
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOCKED'; payload: { isLocked: boolean; lockoutTime: number } }
  | { type: 'SET_PLANTS'; payload: Plant[] }
  | { type: 'SET_ROOMS'; payload: Room[] }
  | { type: 'SET_DEVICES'; payload: Device[] }
  | { type: 'SET_ALERTS'; payload: Alert[] }
  | { type: 'SET_REPORTS'; payload: Report[] }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'ADD_ALERT'; payload: Alert }
  | { type: 'UPDATE_ALERT'; payload: Alert }
  | { type: 'SET_SENSOR_READING'; payload: { roomId: string; reading: SensorReading } }
  | { type: 'SET_THRESHOLD'; payload: { roomId: string; threshold: RoomThresholds } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'SET_WS_CONNECTED'; payload: boolean }
  | { type: 'SET_DASHBOARD_SUMMARY'; payload: DashboardSummary }
  | { type: 'SET_SELECTED_ROOM'; payload: string | null }
  | { type: 'SET_SELECTED_PLANT'; payload: string | null }
  | { type: 'UPDATE_RELAY_STATE'; payload: { roomId: string; relay: 'co2' | 'humidity' | 'temperature'; state: RelayState; trigger: TriggerType } }
  | { type: 'ADD_PLANT'; payload: Plant }
  | { type: 'UPDATE_PLANT'; payload: Plant }
  | { type: 'DELETE_PLANT'; payload: string }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'UPDATE_ROOM'; payload: Room }
  | { type: 'ADD_USER'; payload: User }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'ADD_REPORT'; payload: Report }
  | { type: 'DELETE_REPORT'; payload: string }
  | { type: 'UPDATE_DEVICE'; payload: Device }
  | { type: 'ADD_DEVICE'; payload: Device }
  | { type: 'DELETE_DEVICE'; payload: string };

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        currentUser: action.payload,
        loginError: null,
        isLocked: false,
        lockoutTime: 0,
      };
    case 'LOGIN_ERROR':
      return {
        ...state,
        isAuthenticated: false,
        currentUser: null,
        loginError: action.payload,
      };
    case 'SET_LOCKED':
      return {
        ...state,
        isLocked: action.payload.isLocked,
        lockoutTime: action.payload.lockoutTime,
      };
    case 'LOGOUT':
      return {
        ...initialState,
      };
    case 'SET_PLANTS':
      return {
        ...state,
        plants: action.payload,
        dashboardSummary: {
          ...state.dashboardSummary,
          totalPlants: action.payload.length,
        },
      };
    case 'SET_ROOMS':
      return {
        ...state,
        rooms: action.payload,
        dashboardSummary: {
          ...state.dashboardSummary,
          totalRooms: action.payload.length,
        },
      };
    case 'SET_DEVICES':
      return {
        ...state,
        devices: action.payload,
        dashboardSummary: {
          ...state.dashboardSummary,
          activeDevices: action.payload.filter(d => d.onlineStatus === 'ONLINE').length,
        },
      };
    case 'SET_ALERTS':
      return {
        ...state,
        alerts: action.payload,
        dashboardSummary: {
          ...state.dashboardSummary,
          activeAlerts: action.payload.filter(a => a.status === 'ACTIVE').length,
        },
      };
    case 'ADD_ALERT':
      const newAlerts = [action.payload, ...state.alerts];
      return {
        ...state,
        alerts: newAlerts,
        dashboardSummary: {
          ...state.dashboardSummary,
          activeAlerts: newAlerts.filter(a => a.status === 'ACTIVE').length,
        },
      };
    case 'UPDATE_ALERT':
      const updatedAlerts = state.alerts.map(a =>
        a.id === action.payload.id ? action.payload : a
      );
      return {
        ...state,
        alerts: updatedAlerts,
        dashboardSummary: {
          ...state.dashboardSummary,
          activeAlerts: updatedAlerts.filter(a => a.status === 'ACTIVE').length,
        },
      };
    case 'SET_REPORTS':
      return {
        ...state,
        reports: action.payload,
      };
    case 'SET_USERS':
      return {
        ...state,
        users: action.payload,
      };
    case 'SET_SENSOR_READING': {
      const newReadings = new Map(state.sensorReadings);
      newReadings.set(action.payload.roomId, action.payload.reading);
      return {
        ...state,
        sensorReadings: newReadings,
      };
    }
    case 'SET_THRESHOLD': {
      const newThresholds = new Map(state.thresholds);
      newThresholds.set(action.payload.roomId, action.payload.threshold);
      return {
        ...state,
        thresholds: newThresholds,
      };
    }
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      };
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [...state.toasts, action.payload],
      };
    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.payload),
      };
    case 'SET_WS_CONNECTED':
      return {
        ...state,
        wsConnected: action.payload,
      };
    case 'SET_DASHBOARD_SUMMARY':
      return {
        ...state,
        dashboardSummary: action.payload,
      };
    case 'SET_SELECTED_ROOM':
      return {
        ...state,
        selectedRoomId: action.payload,
      };
    case 'SET_SELECTED_PLANT':
      return {
        ...state,
        selectedPlantId: action.payload,
      };
    case 'UPDATE_RELAY_STATE': {
      const roomReading = state.sensorReadings.get(action.payload.roomId);
      if (roomReading) {
        const updatedReading = {
          ...roomReading,
          relayStates: {
            ...roomReading.relayStates,
            [action.payload.relay]: action.payload.state,
          },
        };
        const newReadings = new Map(state.sensorReadings);
        newReadings.set(action.payload.roomId, updatedReading);
        return {
          ...state,
          sensorReadings: newReadings,
        };
      }
      return state;
    }
    case 'ADD_PLANT':
      return {
        ...state,
        plants: [...state.plants, action.payload],
        dashboardSummary: {
          ...state.dashboardSummary,
          totalPlants: state.plants.length + 1,
        },
      };
    case 'UPDATE_PLANT':
      return {
        ...state,
        plants: state.plants.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PLANT':
      const remainingPlants = state.plants.filter(p => p.id !== action.payload);
      return {
        ...state,
        plants: remainingPlants,
        dashboardSummary: {
          ...state.dashboardSummary,
          totalPlants: remainingPlants.length,
        },
      };
    case 'ADD_ROOM':
      return {
        ...state,
        rooms: [...state.rooms, action.payload],
        dashboardSummary: {
          ...state.dashboardSummary,
          totalRooms: state.rooms.length + 1,
        },
      };
    case 'UPDATE_ROOM':
      return {
        ...state,
        rooms: state.rooms.map(r =>
          r.id === action.payload.id ? action.payload : r
        ),
      };
    case 'ADD_USER':
      return {
        ...state,
        users: [...state.users, action.payload],
      };
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(u =>
          u.id === action.payload.id ? action.payload : u
        ),
      };
    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.payload, ...state.reports],
      };
    case 'DELETE_REPORT':
      return {
        ...state,
        reports: state.reports.filter(r => r.id !== action.payload),
      };
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(d =>
          d.id === action.payload.id ? action.payload : d
        ),
      };
    case 'ADD_DEVICE': {
      const newDevices = [...state.devices, action.payload];
      return {
        ...state,
        devices: newDevices,
        dashboardSummary: {
          ...state.dashboardSummary,
          activeDevices: newDevices.filter(d => d.onlineStatus === 'ONLINE').length,
        },
      };
    }
    case 'DELETE_DEVICE': {
      const remainingDevices = state.devices.filter(d => d.id !== action.payload);
      return {
        ...state,
        devices: remainingDevices,
        dashboardSummary: {
          ...state.dashboardSummary,
          activeDevices: remainingDevices.filter(d => d.onlineStatus === 'ONLINE').length,
        },
      };
    }
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Action Helpers
export function useAppActions() {
  const { dispatch } = useApp();

  const login = useCallback((user: User) => {
    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
  }, [dispatch]);

  const loginError = useCallback((error: string) => {
    dispatch({ type: 'LOGIN_ERROR', payload: error });
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
  }, [dispatch]);

  const setLocked = useCallback((isLocked: boolean, lockoutTime: number = 0) => {
    dispatch({ type: 'SET_LOCKED', payload: { isLocked, lockoutTime } });
  }, [dispatch]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    dispatch({ type: 'ADD_TOAST', payload: { ...toast, id } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, toast.duration || 5000);
  }, [dispatch]);

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, [dispatch]);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, [dispatch]);

  const setWsConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_WS_CONNECTED', payload: connected });
  }, [dispatch]);

  const setSensorReading = useCallback((roomId: string, reading: SensorReading) => {
    dispatch({ type: 'SET_SENSOR_READING', payload: { roomId, reading } });
  }, [dispatch]);

  const addAlert = useCallback((alert: Alert) => {
    dispatch({ type: 'ADD_ALERT', payload: alert });
  }, [dispatch]);

  const updateRelayState = useCallback((
    roomId: string,
    relay: 'co2' | 'humidity' | 'temperature',
    state: RelayState,
    trigger: TriggerType
  ) => {
    dispatch({ type: 'UPDATE_RELAY_STATE', payload: { roomId, relay, state, trigger } });
  }, [dispatch]);

  return {
    login,
    loginError,
    logout,
    setLocked,
    addToast,
    removeToast,
    toggleSidebar,
    setWsConnected,
    setSensorReading,
    addAlert,
    updateRelayState,
    dispatch,
  };
}
