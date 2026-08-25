import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../../components/Screen';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState } from '../../components/StateViews';
import { listQueuedSurveys } from '../../db/queue';
import { listVerificationHistory } from '../../db/history';
import { VERIFICATION_DECISION_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useNetwork } from '../../context/NetworkContext';

const STATUS_LABEL = { pending: 'Pending Sync', syncing: 'Syncing...', synced: 'Synced', failed: 'Retrying' };
const STATUS_COLOR = { pending: colors.warning, syncing: colors.secondary, synced: colors.success, failed: colors.danger };

// Task Status / Task History (PRD sec.10.2). NOTE (documented gap): the
// backend has no "my verifications" or "my surveys" endpoint (only
// GET /surveys/habitation/:id for one habitation), so this reads the
// device-local activity log recorded at submit time - see src/db/history.js
// and src/db/queue.js.
export default function TaskHistoryScreen() {
  const { pendingCount } = useNetwork();
  const [surveys, setSurveys] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [tab, setTab] = useState('surveys');

  const load = useCallback(async () => {
    const [s, v] = await Promise.all([listQueuedSurveys(), listVerificationHistory()]);
    setSurveys(s);
    setVerifications(v);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load, pendingCount]));

  const data = useMemo(() => (tab === 'surveys' ? surveys : verifications), [tab, surveys, verifications]);

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Task History</Text>
      <View style={styles.tabRow}>
        <TabButton label={`Surveys (${surveys.length})`} active={tab === 'surveys'} onPress={() => setTab('surveys')} />
        <TabButton label={`Verifications (${verifications.length})`} active={tab === 'verifications'} onPress={() => setTab('verifications')} />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, index) => String(item.id || item.local_uuid || index)}
        ListEmptyComponent={<EmptyState icon="📝" title="No activity yet" message={tab === 'surveys' ? 'Surveys you submit will appear here.' : 'Reports you verify will appear here.'} />}
        renderItem={({ item }) =>
          tab === 'surveys' ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.habitation_name || `Habitation ${item.habitation_id.slice(0, 8)}`}</Text>
              <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleString()}</Text>
              <StatusBadge label={STATUS_LABEL[item.status] || item.status} color={STATUS_COLOR[item.status] || colors.textMuted} />
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Report {String(item.report_id).slice(0, 8)}</Text>
              <Text style={styles.cardMeta}>{new Date(item.created_at).toLocaleString()}</Text>
              <StatusBadge label={VERIFICATION_DECISION_LABELS[item.decision] || item.decision} color={colors.secondary} />
            </View>
          )
        }
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : styles.listContainer}
      />
    </Screen>
  );
}

function TabButton({ label, active, onPress }) {
  return (
    <Text onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  tabRow: { flexDirection: 'row', marginBottom: spacing.md },
  tab: {
    ...typography.small,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    overflow: 'hidden'
  },
  tabActive: { backgroundColor: colors.secondary, color: colors.textOnPrimary, borderColor: colors.secondary, fontWeight: '700' },
  listContainer: { paddingBottom: spacing.xl },
  emptyContainer: { flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  cardTitle: { ...typography.bodyBold, color: colors.text },
  cardMeta: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs }
});
