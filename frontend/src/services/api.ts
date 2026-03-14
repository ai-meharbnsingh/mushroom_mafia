import axios from 'axios';

// Use VITE_API_BASE_URL env var if set (Railway URL in prod, localhost in dev).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.DEV ? 'http://localhost:3800/api/v1' : '/api/v1');

// Bearer token storage — solves Vercel proxy not forwarding cookies to Railway
let _accessToken: string | null = null;

export function setApiToken(token: string | null) {
  _accessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
}

export function getApiToken(): string | null {
  if (!_accessToken) {
    _accessToken = localStorage.getItem('access_token');
  }
  return _accessToken;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token + CSRF
api.interceptors.request.use((config) => {
  const token = getApiToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
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
          const res = await api.post('/auth/refresh', {});
          if (res.data?.access_token) {
            setApiToken(res.data.access_token);
          }
          return api(error.config);
        } catch {
          setApiToken(null);
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
