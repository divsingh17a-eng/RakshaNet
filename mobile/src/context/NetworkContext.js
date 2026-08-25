import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { syncNow } from '../services/syncService';
import { getPendingCounts } from '../db/queue';
import { useAuth } from './AuthContext';

const NetworkContext = createContext(null);

// Drives FR-06's "no separate sync screen" requirement: sync runs
// automatically on network reconnect and on app foreground. Screens read
// `pendingCount`/`isSyncing` here to render a "Pending Sync" indicator
// without owning any sync logic themselves.
export function NetworkProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const wasOffline = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const counts = await getPendingCounts();
      setPendingCount(counts.total);
    } catch {
      // SQLite not ready yet - ignore, next tick will pick it up
    }
  }, []);

  const runSync = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    try {
      await syncNow();
      setLastSyncAt(Date.now());
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [isAuthenticated, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online && wasOffline.current) {
        runSync();
      }
      wasOffline.current = !online;
    });
    return unsubscribe;
  }, [runSync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') runSync();
    });
    return () => sub.remove();
  }, [runSync]);

  useEffect(() => {
    if (isAuthenticated) runSync();
  }, [isAuthenticated, runSync]);

  const value = {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncAt,
    refreshPendingCount,
    syncNow: runSync
  };

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider');
  return ctx;
}
