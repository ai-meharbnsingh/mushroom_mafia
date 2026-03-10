import api from './api';

export const liveService = {
  getAllReadings: () => api.get('/live/readings').then(r => r.data),
  getDeviceReading: (deviceId: number) => api.get(`/live/readings/device/${deviceId}`).then(r => r.data),
  getRoomReading: (roomId: number) => api.get(`/live/readings/room/${roomId}`).then(r => r.data),
  getRelayState: (deviceId: number) => api.get(`/live/relay/${deviceId}`).then(r => r.data),
  setRelayCommand: (deviceId: number, relay_type: string, state: boolean) =>
    api.post(`/live/relay/${deviceId}`, { relay_type, state }).then(r => r.data),
  getRelayConfig: (deviceId: number) => api.get(`/live/relay-config/${deviceId}`).then(r => r.data),
  updateRelayConfig: (deviceId: number, configs: any[]) => api.put(`/live/relay-config/${deviceId}`, configs).then(r => r.data),
  setAllAuto: (deviceId: number) => api.post(`/live/relay-config/${deviceId}/all-auto`).then(r => r.data),
  setAllManual: (deviceId: number) => api.post(`/live/relay-config/${deviceId}/all-manual`).then(r => r.data),
  getRelaySchedules: (deviceId: number) => api.get(`/live/relay-schedule/${deviceId}`).then(r => r.data),
  createRelaySchedule: (deviceId: number, schedule: any) => api.post(`/live/relay-schedule/${deviceId}`, schedule).then(r => r.data),
  updateRelaySchedule: (scheduleId: number, schedule: any) => api.put(`/live/relay-schedule/${scheduleId}`, schedule).then(r => r.data),
  deleteRelaySchedule: (scheduleId: number) => api.delete(`/live/relay-schedule/${scheduleId}`).then(r => r.data),
};
