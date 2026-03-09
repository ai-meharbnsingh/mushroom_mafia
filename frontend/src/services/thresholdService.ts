import api from './api';

export const thresholdService = {
  getByRoom: (roomId: number) => api.get(`/thresholds/room/${roomId}`).then(r => r.data),
  updateByRoom: (roomId: number, thresholds: any[]) =>
    api.put(`/thresholds/room/${roomId}`, { thresholds }).then(r => r.data),
};
