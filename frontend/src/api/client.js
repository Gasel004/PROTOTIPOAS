import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  timeout: 25000,
});

// ── Interceptor de solicitud: inyectar token JWT ──────────
api.interceptors.request.use(
  (config) => {
    try {
      const raw   = localStorage.getItem('la-esperanza-auth');
      const state = raw ? JSON.parse(raw) : null;
      const token = state?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch { /* silenciar errores de parseo */ }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Interceptor de respuesta: 401 + retry ────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('la-esperanza-auth');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    const config = error.config;
    const isNetwork = !error.response;
    const is5xx = error.response?.status >= 500;
    const isRetryable = isNetwork || is5xx;
    const methodAllowsRetry = config?.method && ['get', 'head'].includes(config.method.toLowerCase());
    const notRetried = !config?._retried;

    if (isRetryable && methodAllowsRetry && notRetried) {
      config._retried = true;
      await new Promise(r => setTimeout(r, 400));
      return api.request(config);
    }

    return Promise.reject(error);
  }
);

export default api;
