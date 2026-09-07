import axios from 'axios';
import * as SecureStore from './secureStorage';

// EXPO_PUBLIC_* vars are inlined by Metro at build time (see .env.example).
// Falls back to localhost for a simulator/emulator running against a local
// backend; a physical device with Expo Go needs the machine's LAN IP.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export const TOKEN_KEY = 'rakshanet_access_token';
export const USER_KEY = 'rakshanet_user';

// The backend runs on Render's free tier, which sleeps after ~15min idle and
// takes 30-60s to wake back up. 30s (below) plus the single retry in
// withColdStartRetry gives a cold start up to ~60s to respond before this
// genuinely gives up - long enough in practice, short enough not to hang
// forever on a real outage.
export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000
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
    return {
      message: "Connecting to the server is taking a while - it may be waking up from sleep (can take up to a minute). We'll keep retrying.",
      status: null,
      offline: true
    };
  }
  const status = error.response?.status ?? null;
  const message = error.response?.data?.message || error.response?.data?.error || error.message || 'Request failed.';
  return { message, status, offline: false };
}

// Retries a request once after a short delay when it fails due to a timeout
// or network error - covers the case where the very first request after
// launch hits the backend mid-cold-start and a few extra seconds would have
// succeeded. Real 4xx/5xx responses are not retried.
export async function withColdStartRetry(fn, { retries = 1, delayMs = 1500 } = {}) {
  try {
    return await fn();
  } catch (error) {
    const isTransient = error?.message === 'Network Error' || error?.code === 'ECONNABORTED';
    if (isTransient && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return withColdStartRetry(fn, { retries: retries - 1, delayMs });
    }
    throw error;
  }
}

// Fire-and-forget ping to start waking a sleeping backend as early as
// possible (called on app launch, well before the user submits the login
// form) so the real first request has a head start. Failures are expected
// and ignored - this is purely a warm-up, not a health check UI depends on.
export async function pingBackend() {
  try {
    await axios.get(`${API_BASE_URL}/api/health`, { timeout: 45000 });
  } catch {
    // Ignored - the real request will still retry via withColdStartRetry.
  }
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
