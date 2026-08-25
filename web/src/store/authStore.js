import { create } from 'zustand';
import { login as loginRequest, register as registerRequest, getMe } from '../api/endpoints';
import { setClientToken, getStoredToken, registerUnauthorizedHandler } from '../api/client';

const USER_STORAGE_KEY = 'rakshanet.user';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user) {
  try {
    if (user) localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore storage failures (private browsing etc.) - session still works in-memory
  }
}

export const useAuthStore = create((set, get) => ({
  user: loadStoredUser(),
  token: getStoredToken(),
  status: 'idle', // idle | loading | authenticated | error
  error: null,

  async login(email, password) {
    set({ status: 'loading', error: null });
    try {
      const data = await loginRequest(email, password);
      setClientToken(data.accessToken);
      persistUser(data.user);
      set({ user: data.user, token: data.accessToken, status: 'authenticated', error: null });
      return data.user;
    } catch (err) {
      set({ status: 'error', error: err.message || 'Login failed' });
      throw err;
    }
  },

  // Registers a brand-new dashboard account (random or otherwise) and signs
  // straight into it - lets a judge/demo user skip typing credentials
  // entirely. The seeded named accounts (officer@rakshanet.demo, etc.) stay
  // available via the regular login() above.
  async registerAndLogin(payload) {
    set({ status: 'loading', error: null });
    try {
      await registerRequest(payload);
      const data = await loginRequest(payload.email, payload.password);
      setClientToken(data.accessToken);
      persistUser(data.user);
      set({ user: data.user, token: data.accessToken, status: 'authenticated', error: null });
      return data.user;
    } catch (err) {
      set({ status: 'error', error: err.message || 'Could not create a demo account' });
      throw err;
    }
  },

  logout() {
    setClientToken(null);
    persistUser(null);
    set({ user: null, token: null, status: 'idle', error: null });
  },

  // Re-validates the stored token against GET /me on app load; clears the
  // session if the token has expired since the last visit.
  async hydrate() {
    const token = getStoredToken();
    if (!token) {
      set({ status: 'idle' });
      return;
    }
    set({ status: 'loading' });
    try {
      const data = await getMe();
      persistUser(data.user);
      set({ user: data.user, token, status: 'authenticated', error: null });
    } catch {
      setClientToken(null);
      persistUser(null);
      set({ user: null, token: null, status: 'idle' });
    }
  },

  isAuthenticated() {
    return Boolean(get().token && get().user);
  }
}));

// Wire the axios 401 interceptor to clear session state - registered once at
// module load, outside the store definition to avoid a circular import.
registerUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
