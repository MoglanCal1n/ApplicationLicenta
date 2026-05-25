import axios from 'axios';
import i18n from './i18n';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/**
 * Central Axios instance.
 * – Uses HttpOnly cookies for auth (withCredentials: true)
 * – 5min timeout to allow AI processing
 * – Sends Accept-Language header for backend i18n
 * – Response interceptor: on 401, redirects to /login
 */
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,   // Required: sends HttpOnly auth cookie
  timeout: 300_000,        // 5 minutes — prevents indefinite hangs while allowing AI to finish
  headers: {
    'Content-Type': 'application/json',
  },
});

// Set Accept-Language header from i18next on every request
api.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = i18n.language || 'en';
  return config;
});

// Automatically handle session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — redirect to login without stale state
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;

/** Exposed API base for constructing static asset URLs */
export const API_BASE_URL = API_BASE;

/** Helper to construct static asset URLs (PDF, audio, images) */
export function getStaticUrl(path: string): string {
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
