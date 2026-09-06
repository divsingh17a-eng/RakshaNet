import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { listAlerts, markAlertRead } from '../../api/alerts';
import { describeApiError } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme/colors';

const ALERT_ICONS = { sos: '\u{1F6A8}', risk: '⚠️', system: '\u{1F4E2}', relocation: '\u{1F9ED}' };

export default function AlertsScreen() {
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setStatus('loading');
    try {
      const { alerts: data } = await listAlerts();
      setAlerts(data);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(describeApiError(err).message);
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const handleMarkRead = useCallback(async (alert) => {
    if (alert.readAt) return;
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, readAt: new Date().toISOString() } : a)));
    try {
      await markAlertRead(alert.id);
    } catch {
      // revert on failure
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, readAt: null } : a)));
    }
  }, []);

  if (status === 'loading') return <LoadingState label="Loading alerts..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={() => load(false)} />;

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={(item) => String(item.id)}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={<EmptyState icon="\u{1F514}" title="No alerts" message="You'll see hazard and safety alerts here." />}
        renderItem={({ item }) => (
          <Pressable onPress={() => handleMarkRead(item)} style={[styles.card, !item.readAt && styles.cardUnread]}>
            <Text style={styles.cardIcon}>{ALERT_ICONS[item.type] || '\u{1F4E2}'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title || 'Alert'}</Text>
              <Text style={styles.cardMessage}>{item.message}</Text>
              <Text style={styles.cardMeta}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            {!item.readAt && <View style={styles.unreadDot} />}
          </Pressable>
        )}
        contentContainerStyle={alerts.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  listContainer: { paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  cardUnread: { borderColor: colors.primary, backgroundColor: '#FEF2F2' },
  cardIcon: { fontSize: 22, marginRight: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  cardMessage: { ...typography.small, color: colors.text, marginTop: 2 },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: spacing.sm, marginTop: 6 }
});
