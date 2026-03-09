import api from './api';

export const roomService = {
  getAll: () => api.get('/rooms').then(r => r.data),
  getById: (id: number) => api.get(`/rooms/${id}`).then(r => r.data),
  create: (data: any) => api.post('/rooms', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/rooms/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/rooms/${id}`),
};
