import api from './api';

export const alertService = {
  getAll: (params?: any) => api.get('/alerts/', { params }).then(r => r.data),
  getActive: () => api.get('/alerts/active').then(r => r.data),
  getById: (id: number) => api.get(`/alerts/${id}`).then(r => r.data),
  acknowledge: (id: number) => api.post(`/alerts/${id}/acknowledge`).then(r => r.data),
  resolve: (id: number) => api.post(`/alerts/${id}/resolve`).then(r => r.data),
};
