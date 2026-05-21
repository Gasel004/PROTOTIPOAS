import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
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

// ── Interceptor de respuesta: manejar 401 globalmente ────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpiar sesión y redirigir al login
      localStorage.removeItem('la-esperanza-auth');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
