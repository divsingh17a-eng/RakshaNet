import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../components/StateViews';
import { listReports } from '../../api/reports';
import { describeApiError } from '../../api/client';
import { HAZARD_TYPE_ICONS, HAZARD_TYPE_LABELS, REPORT_STATUS, REPORT_STATUS_COLORS, REPORT_STATUS_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';

const TABS = [
  { key: 'needs_verification', label: 'Needs Verification' },
  { key: 'all', label: 'All Nearby Reports' }
];

export default function TasksScreen({ navigation }) {
  const [tab, setTab] = useState('needs_verification');
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reports, setReports] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setStatus('loading');
    try {
      const { reports: data } = await listReports();
      setReports(data);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(describeApiError(err).message);
      setStatus('error');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(false); }, [load]));

  const filtered = useMemo(
    () => (tab === 'needs_verification' ? reports.filter((r) => r.status === REPORT_STATUS.SUBMITTED) : reports),
    [reports, tab]
  );

  if (status === 'loading') return <LoadingState label="Loading nearby reports..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={() => load(false)} />;

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Nearby Reports</Text>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        onRefresh={() => load(true)}
        refreshing={refreshing}
        ListEmptyComponent={
          <EmptyState icon="✅" title="Nothing to verify" message="New reports from citizens will show up here." />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => navigation.navigate('VerifyReport', { reportId: item.id })}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>{HAZARD_TYPE_ICONS[item.type] || '❓'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{HAZARD_TYPE_LABELS[item.type] || item.type}</Text>
                <Text style={styles.cardMeta}>Severity {item.severity}/5 - {new Date(item.reportedAt).toLocaleString()}</Text>
              </View>
            </View>
            {item.description ? (
              <Text numberOfLines={2} style={styles.cardDescription}>{item.description}</Text>
            ) : null}
            <StatusBadge label={REPORT_STATUS_LABELS[item.status] || item.status} color={REPORT_STATUS_COLORS[item.status] || colors.textMuted} />
          </Pressable>
        )}
        contentContainerStyle={filtered.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', marginBottom: spacing.md },
  tab: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  tabActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  tabLabel: { ...typography.small, color: colors.text },
  tabLabelActive: { color: colors.textOnPrimary, fontWeight: '700' },
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
