import axios from 'axios';

// URL de tu Backend local
const API_URL = 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para añadir el token automáticamente a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;