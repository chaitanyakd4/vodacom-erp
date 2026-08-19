import axios from 'axios';

// Production backend URL (Render)
const PRODUCTION_API_URL = 'https://vodacom-erp.onrender.com';

// Dynamically resolve the backend API URL:
// 1. Env variable override (set in Vercel dashboard or .env.local)
// 2. Production detection (vercel.app hostname → Render backend)
// 3. LAN dev fallback (same hostname, port 8000)
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // Detect Vercel production/preview deployments
    if (host.includes('vercel.app') || host.includes('vodacom-erp')) {
      return PRODUCTION_API_URL;
    }
    // LAN / local dev: same machine, backend on port 8000
    return `http://${host}:8000`;
  }
  return 'http://localhost:8000';
};

const api = axios.create({
  baseURL: getBaseUrl(),
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
