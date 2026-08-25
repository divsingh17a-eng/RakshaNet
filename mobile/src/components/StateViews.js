import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Button from './Button';
import { colors, radius, spacing, typography } from '../theme/colors';

// Loading / empty / error / offline states shared by every data screen
// (PRD sec.12: "Every data-driven screen needs loading, empty, error and
// success states").

export function LoadingState({ label = 'Loading...' }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

export function EmptyState({ icon = '📭', title = 'Nothing here yet', message, actionLabel, onAction }) {
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.muted}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title}>Couldn't load this</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? <Button title="Retry" onPress={onRetry} variant="secondary" style={styles.action} /> : null}
    </View>
  );
}

export function OfflineNotice({ message = "You're offline. Showing the last data we have." }) {
  return (
    <View style={styles.offlineBanner}>
      <Text style={styles.offlineText}>📶 {message}</Text>
    </View>
  );
}

export function PendingSyncBanner({ count }) {
  if (!count) return null;
  return (
    <View style={styles.pendingBanner}>
      <Text style={styles.pendingText}>
        🔄 {count} item{count === 1 ? '' : 's'} waiting to sync - will upload automatically once you're back online.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.sm
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center'
  },
  muted: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs
  },
  action: {
    marginTop: spacing.md,
    minWidth: 160
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md
  },
  offlineText: {
    ...typography.small,
    color: '#92400E',
    textAlign: 'center'
  },
  pendingBanner: {
    backgroundColor: '#FEF9C3',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  pendingText: {
    ...typography.small,
    color: '#854D0E',
    textAlign: 'center'
  }
});
