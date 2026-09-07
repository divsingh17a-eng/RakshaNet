import { apiClient, withColdStartRetry } from './client';

// POST /api/auth/otp/request - self-registers on first use as `role`
// (backend/src/controllers/auth.controller.js only honors this on a brand
// new phone number - an existing account's role is never changed by it).
// Wrapped in withColdStartRetry: this is usually the very first request the
// app makes, so it's the one most likely to land while Render is still
// waking a sleeping free-tier backend up.
export async function requestOtp(phone, role) {
  const { data } = await withColdStartRetry(() => apiClient.post('/auth/otp/request', { phone, role }));
  return data;
}

// POST /api/auth/otp/verify - returns { accessToken, refreshToken, user }
export async function verifyOtp(phone, code) {
  const { data } = await withColdStartRetry(() => apiClient.post('/auth/otp/verify', { phone, code }));
  return data;
}

// GET /api/me - current user + role
export async function getMe() {
  const { data } = await apiClient.get('/me');
  return data;
}

// PATCH /api/me - self-serve profile fields (isOnDuty, homeLocation,
// pushToken). Used to register this device's Expo push token against the
// logged-in user so the backend's alert system (raiseAlert -> push.service)
// can reach a closed app.
export async function updateMe(patch) {
  const { data } = await apiClient.patch('/me', patch);
  return data;
}
