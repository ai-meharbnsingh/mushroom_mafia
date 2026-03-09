import api from './api';

export const liveService = {
  getAllReadings: () => api.get('/live/readings').then(r => r.data),
  getDeviceReading: (deviceId: number) => api.get(`/live/readings/device/${deviceId}`).then(r => r.data),
  getRoomReading: (roomId: number) => api.get(`/live/readings/room/${roomId}`).then(r => r.data),
  getRelayState: (deviceId: number) => api.get(`/live/relay/${deviceId}`).then(r => r.data),
  setRelayCommand: (deviceId: number, relay_type: string, state: boolean) =>
    api.post(`/live/relay/${deviceId}`, { relay_type, state }).then(r => r.data),
};
