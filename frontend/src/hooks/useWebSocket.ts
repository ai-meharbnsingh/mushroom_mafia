import { useEffect, useRef, useCallback } from 'react';
import { useApp, useAppActions } from '@/store/AppContext';
import { mapSensorReading } from '@/utils/mappers';
import type { Alert, RelayType } from '@/types';

// WebSocket must connect directly to the backend (Vercel can't proxy WebSockets).
// In production, use VITE_WS_BASE_URL (points to Railway). In dev, use localhost.
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL
  || (import.meta.env.DEV ? 'ws://localhost:3800/api/v1' : `wss://${window.location.host}/api/v1`);
const MAX_RECONNECT_ATTEMPTS = 10;

export function useWebSocketSimulation() {
  const { state } = useApp();
  const { setWsConnected, setSensorReading, addAlert, updateRelayState, addToast } = useAppActions();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    // Don't connect if not authenticated
    if (!state.isAuthenticated) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Pass token as query parameter for cross-origin auth (Vercel → Railway)
    const tokenParam = state.accessToken ? `?token=${encodeURIComponent(state.accessToken)}` : '';
    const ws = new WebSocket(`${WS_BASE_URL}/ws${tokenParam}`);

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setWsConnected(true);
      reconnectAttempts.current = 0; // Reset on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.event) {
          case 'sensor_update':
            if (data.payload?.room_id) {
              setSensorReading(String(data.payload.room_id), mapSensorReading(data.payload));
            }
            break;
          case 'relay_state_change':
            if (data.payload) {
              const relayPayload = data.payload;
              updateRelayState(
                String(relayPayload.room_id || relayPayload.roomId),
                relayPayload.relay || relayPayload.relay_type,
                relayPayload.state === true || relayPayload.state === 'ON' ? 'ON' : 'OFF',
                relayPayload.trigger || 'MANUAL'
              );
            }
            break;
          case 'alert_created':
            if (data.payload) {
              const alertPayload: Alert = {
                id: String(data.payload.alert_id || data.payload.id),
                severity: data.payload.severity,
                type: data.payload.type || data.payload.alert_type,
                roomId: String(data.payload.room_id || data.payload.roomId),
                roomName: data.payload.room_name || data.payload.roomName || '',
                deviceId: data.payload.device_id ? String(data.payload.device_id) : undefined,
                deviceName: data.payload.device_name,
                message: data.payload.message,
                currentValue: data.payload.current_value,
                thresholdValue: data.payload.threshold_value,
                unit: data.payload.unit,
                status: 'ACTIVE',
                createdAt: data.payload.created_at || new Date().toISOString(),
              };
              addAlert(alertPayload);
              addToast({
                type: 'error',
                title: 'Alert',
                message: data.payload.message,
              });
            }
            break;
          case 'alert_acknowledged':
            break;
          case 'device_status_change':
            break;
          case 'device_registered':
            if (data.payload) {
              addToast({
                type: 'info',
                title: 'New Device Registered',
                message: `Device "${data.payload.device_name ?? data.payload.name ?? 'Unknown'}" (${data.payload.mac_address ?? data.payload.macAddress ?? ''}) has registered and is pending activation.`,
                duration: 8000,
              });
            }
            break;
        }
      } catch (e) {
        console.error('[WebSocket] Message parse error:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Disconnected');
      setWsConnected(false);

      // Don't reconnect if auth failed (4001) or too many attempts
      if (event.code === 4001) {
        console.log('[WebSocket] Auth failed, not reconnecting');
        return;
      }

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        // Exponential backoff: 3s, 6s, 12s, 24s... capped at 60s
        const delay = Math.min(3000 * Math.pow(2, reconnectAttempts.current), 60000);
        reconnectAttempts.current += 1;
        console.log(`[WebSocket] Reconnecting in ${delay / 1000}s (attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`);
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        console.log('[WebSocket] Max reconnect attempts reached');
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [state.isAuthenticated, state.accessToken, setWsConnected, setSensorReading, addAlert, updateRelayState, addToast]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
      setWsConnected(false);
      console.log('[WebSocket] Cleanup');
    };
  }, [connect, setWsConnected]);

  const sendRelayCommand = useCallback(async (
    roomId: string,
    relay: RelayType,
    state: 'ON' | 'OFF'
  ) => {
    // Use REST API for relay commands for reliability
    const { liveService } = await import('@/services/liveService');
    return liveService.setRelayCommand(
      Number(roomId),
      relay,
      state === 'ON'
    );
  }, []);

  return { sendRelayCommand };
}

// Also export as useWebSocket for new code
export const useWebSocket = useWebSocketSimulation;
