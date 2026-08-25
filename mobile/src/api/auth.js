import { apiClient } from './client';

// POST /api/auth/otp/request - self-registers as Citizen on first use.
export async function requestOtp(phone) {
  const { data } = await apiClient.post('/auth/otp/request', { phone });
  return data;
}

// POST /api/auth/otp/verify - returns { accessToken, refreshToken, user }
export async function verifyOtp(phone, code) {
  const { data } = await apiClient.post('/auth/otp/verify', { phone, code });
  return data;
}

// GET /api/me - current user + role
export async function getMe() {
  const { data } = await apiClient.get('/me');
  return data;
}
