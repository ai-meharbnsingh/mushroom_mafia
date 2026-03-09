import api from './api';

export const reportService = {
  getAll: () => api.get('/reports').then(r => r.data),
  getById: (id: number) => api.get(`/reports/${id}`).then(r => r.data),
  generate: (data: any) => api.post('/reports/generate', data).then(r => r.data),
  delete: (id: number) => api.delete(`/reports/${id}`),
};
