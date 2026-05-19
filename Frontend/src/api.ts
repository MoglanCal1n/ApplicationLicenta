import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/**
 * Central Axios instance.
 * – Uses HttpOnly cookies for auth (withCredentials: true)
 * – 30s timeout to prevent hanging requests
 * – Response interceptor: on 401, clears local state and redirects to /login
 */
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,   // Required: sends HttpOnly auth cookie
  timeout: 300_000,        // 5 minutes — prevents indefinite hangs while allowing AI to finish
  headers: {
    'Content-Type': 'application/json',
  },
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
