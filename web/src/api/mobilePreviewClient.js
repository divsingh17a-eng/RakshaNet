import axios from 'axios';
import { API_BASE_URL, normalizeApiError } from './client';

/**
 * Independent axios instance + token slot for the phone-frame mobile
 * preview (Citizen/Volunteer OTP session). Deliberately separate from the
 * officer dashboard's `apiClient`/authStore (different login mechanism -
 * phone+OTP vs email+password) so opening both in the same browser never
 * clobbers one session's token with the other's.
 */
const STORAGE_KEY = 'rakshanet.mobilePreview.session';

export function loadMobileSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMobileSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable - session still works for the current tab via in-memory token below.
  }
}

let inMemoryToken = loadMobileSession()?.accessToken || null;
export function setMobileToken(token) {
  inMemoryToken = token;
}

export const mobileApiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000
});

mobileApiClient.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

mobileApiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error))
);

export default mobileApiClient;
