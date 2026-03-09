import api from './api';

export const plantService = {
  getAll: () => api.get('/plants').then(r => r.data),
  getById: (id: number) => api.get(`/plants/${id}`).then(r => r.data),
  create: (data: any) => api.post('/plants', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/plants/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/plants/${id}`),
  getRooms: (id: number) => api.get(`/plants/${id}/rooms`).then(r => r.data),
};
