/// <reference types="vite/client" />
import axios from 'axios';

// Esta línea es la clave: busca la variable de entorno VITE_API_URL
// Si existe (en Netlify), la usa. Si no (en tu PC), usa localhost.
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

console.log("🔌 Conectando a:", baseURL); // Esto te ayudará a depurar en la consola

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;