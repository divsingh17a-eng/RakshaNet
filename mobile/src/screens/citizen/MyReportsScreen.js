import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { listReports } from '../../api/reports';
import { listQueuedReports } from '../../db/queue';
import { describeApiError } from '../../api/client';
import { HAZARD_TYPE_ICONS, HAZARD_TYPE_LABELS, REPORT_STATUS, REPORT_STATUS_COLORS, REPORT_STATUS_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useNetwork } from '../../context/NetworkContext';

function mergeReports(serverReports, localRows) {
  // Local rows not yet confirmed synced represent reports the server
  // doesn't know about yet - show them as Pending Sync / retrying.
  const pendingLocal = localRows
    .filter((r) => r.status !== 'synced')
    .map((r) => ({
      id: `local-${r.local_uuid}`,
      isLocal: true,
      type: r.type,
      severity: r.severity,
      description: r.description,
      status: r.status === 'failed' ? REPORT_STATUS.PENDING_SYNC : REPORT_STATUS.PENDING_SYNC,
      reportedAt: r.reported_at || new Date(r.created_at).toISOString(),
      createdAtMs: r.created_at
    }));

  const serverMapped = serverReports.map((r) => ({
    id: r.id,
    isLocal: false,
    type: r.type,
    severity: r.severity,
    description: r.description,
    status: r.status,
    reportedAt: r.reportedAt,
    createdAtMs: new Date(r.reportedAt).getTime()
  }));

  return [...pendingLocal, ...serverMapped].sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export default function MyReportsScreen() {
  const { pendingCount } = useNetwork();
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setStatus('loading');
    try {
      const [localRows, serverData] = await Promise.all([
        listQueuedReports(),
        listReports({ mine: 'true' }).catch((err) => {
          // Offline or request failed - still show whatever is queued locally.
          throw err;
        })
      ]);
      setItems(mergeReports(serverData.reports || [], localRows));
      setStatus('ready');
    } catch (err) {
      const localRows = await listQueuedReports().catch(() => []);
      if (localRows.length > 0) {
        setItems(mergeReports([], localRows));
        setStatus('ready');
      } else {
        setErrorMessage(describeApiError(err).message);
        setStatus('error');
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load, pendingCount])
  );

  if (status === 'loading') return <LoadingState label="Loading your reports..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={() => load(false)} />;

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>My Reports</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={
          <EmptyState icon="\u{1F4CB}" title="No reports yet" message="Reports you submit will show up here with their review status." />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{HAZARD_TYPE_ICONS[item.type] || '❓'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{HAZARD_TYPE_LABELS[item.type] || item.type}</Text>
                <Text style={styles.cardMeta}>Severity {item.severity}/5 - {new Date(item.reportedAt).toLocaleString()}</Text>
              </View>
            </View>
            {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
            <StatusBadge label={REPORT_STATUS_LABELS[item.status] || item.status} color={REPORT_STATUS_COLORS[item.status] || colors.textMuted} />
          </View>
        )}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  listContainer: { paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.xs },
  cardIcon: { fontSize: 22, marginRight: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted },
  cardDescription: { ...typography.small, color: colors.text, marginBottom: spacing.sm }
});
