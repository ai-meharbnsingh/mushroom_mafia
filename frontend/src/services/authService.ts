import api from './api';

export const authService = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
  logout: async () => {
    try { await api.post('/auth/logout'); } catch { }
  },
  getMe: () => api.get('/auth/me').then(r => r.data),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
};
