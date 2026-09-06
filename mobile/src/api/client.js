import axios from 'axios';
import * as SecureStore from './secureStorage';

// EXPO_PUBLIC_* vars are inlined by Metro at build time (see .env.example).
// Falls back to localhost for a simulator/emulator running against a local
// backend; a physical device with Expo Go needs the machine's LAN IP.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const TOKEN_KEY = 'rakshanet_access_token';
export const USER_KEY = 'rakshanet_user';

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalizes axios errors into a consistent { message, status, offline } shape
// so every screen can render the same error state without duplicating logic.
export function describeApiError(error) {
  if (!error) return { message: 'Something went wrong.', status: null, offline: false };
  if (error.message === 'Network Error' || error.code === 'ECONNABORTED') {
    return { message: 'You appear to be offline. This will retry automatically.', status: null, offline: true };
  }
  const status = error.response?.status ?? null;
  const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed.';
  return { message, status, offline: false };
}

export async function saveSession(accessToken, user) {
  await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function loadSession() {
  const [token, userRaw] = await Promise.all([
    SecureStore.getItemAsync(TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY)
  ]);
  return { token, user: userRaw ? JSON.parse(userRaw) : null };
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
