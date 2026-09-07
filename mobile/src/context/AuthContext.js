import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { requestOtp as apiRequestOtp, verifyOtp as apiVerifyOtp } from '../api/auth';
import { saveSession, loadSession, clearSession } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { user: storedUser } = await loadSession();
      setUser(storedUser);
      setIsLoading(false);
    })();
  }, []);

  const requestOtp = useCallback(async (phone, role) => apiRequestOtp(phone, role), []);

  const verifyOtp = useCallback(async (phone, code) => {
    const { accessToken, user: verifiedUser } = await apiVerifyOtp(phone, code);
    await saveSession(accessToken, verifiedUser);
    setUser(verifiedUser);
    return verifiedUser;
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: !!user, requestOtp, verifyOtp, logout }),
    [user, isLoading, requestOtp, verifyOtp, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
