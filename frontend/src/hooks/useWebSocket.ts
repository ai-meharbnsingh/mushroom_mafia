import { useEffect, useRef, useCallback } from 'react';
import { useAppActions } from '@/store/AppContext';
import { mapSensorReading } from '@/utils/mappers';
import type { Alert } from '@/types';

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3800/api/v1';

export function useWebSocketSimulation() {
  const { setWsConnected, setSensorReading, addAlert, updateRelayState, addToast } = useAppActions();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws?token=${token}`);

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setWsConnected(true);
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
            // UPDATE_ALERT expects a full Alert object; we do our best with available data
            break;
          case 'device_status_change':
            // UPDATE_DEVICE expects a full Device object; handled at page level
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

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setWsConnected(false);
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [setWsConnected, setSensorReading, addAlert, updateRelayState, addToast]);

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
    relay: 'co2' | 'humidity' | 'temperature',
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
