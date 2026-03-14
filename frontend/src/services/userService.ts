import api from './api';

export const userService = {
  getAll: () => api.get('/users/').then(r => r.data),
  getById: (id: number) => api.get(`/users/${id}`).then(r => r.data),
  create: (data: any) => api.post('/users/', data).then(r => r.data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`/users/${id}`),
};
