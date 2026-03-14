import api, { setApiToken } from './api';

export const authService = {
  login: async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data?.access_token) {
      setApiToken(res.data.access_token);
    }
    return res.data;
  },
  logout: async () => {
    setApiToken(null);
    try { await api.post('/auth/logout'); } catch { }
  },
  getMe: () => api.get('/auth/me').then(r => r.data),
  changePassword: (old_password: string, new_password: string) =>
    api.post('/auth/change-password', { old_password, new_password }),
};
