import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/colors';
import { useNetwork } from '../context/NetworkContext';

// Small always-visible indicator (used as a navigation header accessory)
// showing offline state and how many locally-queued items are still
// waiting to sync - the "visible Pending Sync state" required by FR-06,
// without a dedicated sync screen.
export default function SyncStatusPill() {
  const { isOnline, isSyncing, pendingCount } = useNetwork();

  if (isOnline && pendingCount === 0) return null;

  return (
    <View style={[styles.pill, !isOnline && styles.pillOffline]}>
      <Text style={styles.text}>
        {!isOnline ? '\u{1F4F6} Offline' : isSyncing ? '\u{1F504} Syncing...' : ''}
        {pendingCount > 0 ? ` \u{2022} ${pendingCount} pending` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    backgroundColor: '#FEF9C3',
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    marginRight: spacing.md
  },
  pillOffline: {
    backgroundColor: '#FEE2E2'
  },
  text: {
    ...typography.caption,
    color: '#78350F'
  }
});
