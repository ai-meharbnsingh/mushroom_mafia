import axios from 'axios';

// In production, force relative URL to go through Vercel proxy (avoids mixed content).
// Any http:// URL set via env vars is auto-upgraded to https:// in production.
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3800/api/v1' : '/api/v1');
if (!import.meta.env.DEV && API_BASE_URL.startsWith('http://')) {
  API_BASE_URL = API_BASE_URL.replace('http://', 'https://');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'csrf_token',
  xsrfHeaderName: 'X-CSRF-Token',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: explicitly attach CSRF token from cookie to header
api.interceptors.request.use((config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method || '')) {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    if (match) {
      config.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
    }
  }
  return config;
});

// Response interceptor: handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (!error.config._retry && error.config.url !== '/auth/login' && error.config.url !== '/auth/refresh') {
        error.config._retry = true;
        try {
          await api.post('/auth/refresh', {});
          return api(error.config);
        } catch {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
