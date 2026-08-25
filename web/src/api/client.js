import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const TOKEN_STORAGE_KEY = 'rakshanet.accessToken';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. private mode) - in-memory token from the
    // auth store still works for the current session.
  }
}

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000
});

// In-memory token set by the auth store on login/logout; falls back to
// localStorage so a page refresh doesn't silently log the user out.
let inMemoryToken = getStoredToken();

export function setClientToken(token) {
  inMemoryToken = token;
  setStoredToken(token);
}

apiClient.interceptors.request.use((config) => {
  const token = inMemoryToken || getStoredToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Set by the auth store so a 401 anywhere in the app clears session state and
// bounces to /login, without this module importing the store (avoids a
// circular import between api/client.js and store/authStore.js).
let onUnauthorized = null;
export function registerUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setClientToken(null);
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(normalizeApiError(error));
  }
);

export function normalizeApiError(error) {
  if (error.response) {
    const data = error.response.data || {};
    const message = data.message || data.error || `Request failed (${error.response.status})`;
    const normalized = new Error(message);
    normalized.status = error.response.status;
    normalized.details = data;
    return normalized;
  }
  if (error.request) {
    const normalized = new Error('Cannot reach the RakshaNet backend. Check your connection and try again.');
    normalized.status = 0;
    return normalized;
  }
  return error;
}

export default apiClient;
