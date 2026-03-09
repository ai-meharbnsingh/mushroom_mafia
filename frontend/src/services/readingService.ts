import api from './api';

export const readingService = {
  getByRoom: (roomId: number, params?: any) => api.get(`/readings/room/${roomId}`, { params }).then(r => r.data),
  getByDevice: (deviceId: number, params?: any) => api.get(`/readings/device/${deviceId}`, { params }).then(r => r.data),
};
