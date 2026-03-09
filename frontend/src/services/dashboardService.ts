import api from './api';

export const dashboardService = {
  getSummary: () => api.get('/dashboard/summary').then(r => r.data),
  getCurrentReadings: () => api.get('/dashboard/current-readings').then(r => r.data),
  getAdminSummary: () => api.get('/dashboard/admin-summary').then(r => r.data),
};
