import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import StatusBadge from '../../components/StatusBadge';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { getReportDetail, verifyReport } from '../../api/reports';
import { describeApiError } from '../../api/client';
import { recordVerification } from '../../db/history';
import { HAZARD_TYPE_ICONS, HAZARD_TYPE_LABELS, REPORT_STATUS_COLORS, REPORT_STATUS_LABELS, VERIFICATION_DECISIONS, VERIFICATION_DECISION_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';

const DECISION_ORDER = [
  VERIFICATION_DECISIONS.VERIFIED,
  VERIFICATION_DECISIONS.NEEDS_MORE_EVIDENCE,
  VERIFICATION_DECISIONS.DUPLICATE,
  VERIFICATION_DECISIONS.REJECTED
];

const DECISION_COLORS = {
  [VERIFICATION_DECISIONS.VERIFIED]: colors.success,
  [VERIFICATION_DECISIONS.NEEDS_MORE_EVIDENCE]: colors.warning,
  [VERIFICATION_DECISIONS.DUPLICATE]: colors.textMuted,
  [VERIFICATION_DECISIONS.REJECTED]: colors.danger
};

export default function VerifyReportScreen({ route, navigation }) {
  const { reportId } = route.params;
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [report, setReport] = useState(null);
  const [decision, setDecision] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { report: data } = await getReportDetail(reportId);
      setReport(data);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(describeApiError(err).message);
      setStatus('error');
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = useCallback(async () => {
    if (!decision) {
      Alert.alert('Choose a decision', 'Select Verified, Rejected, Needs More Evidence or Duplicate.');
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyReport(reportId, { decision, notes: notes.trim() || undefined });
      await recordVerification({ reportId, reportType: report?.type, decision, notes: notes.trim() || undefined });
      Alert.alert('Recorded', 'Your verification has been submitted.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Could not submit', describeApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [decision, notes, reportId, report, navigation]);

  if (status === 'loading') return <LoadingState label="Loading report..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={load} />;
  if (!report) return null;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.icon}>{HAZARD_TYPE_ICONS[report.type] || '❓'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{HAZARD_TYPE_LABELS[report.type] || report.type}</Text>
          <Text style={styles.meta}>Severity {report.severity}/5 - {new Date(report.reportedAt).toLocaleString()}</Text>
        </View>
      </View>

      <StatusBadge label={REPORT_STATUS_LABELS[report.status] || report.status} color={REPORT_STATUS_COLORS[report.status] || colors.textMuted} />

      {report.description ? <Text style={styles.description}>{report.description}</Text> : null}

      {report.media?.length > 0 ? (
        <ScrollView horizontal style={styles.photoRow} showsHorizontalScrollIndicator={false}>
          {report.media.map((m) => (
            <Image key={m.id} source={{ uri: m.url }} style={styles.photo} />
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noPhotos}>No photo evidence attached.</Text>
      )}

      <Text style={styles.sectionLabel}>Decision</Text>
      <View style={styles.decisionGrid}>
        {DECISION_ORDER.map((d) => (
          <Button
            key={d}
            title={VERIFICATION_DECISION_LABELS[d]}
            variant={decision === d ? 'volunteer' : 'neutral'}
            onPress={() => setDecision(d)}
            style={styles.decisionButton}
          />
        ))}
      </View>
      {decision ? <StatusBadge label={`Selected: ${VERIFICATION_DECISION_LABELS[decision]}`} color={DECISION_COLORS[decision]} /> : null}

      <Text style={styles.sectionLabel}>Notes</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        maxLength={1000}
        placeholder="Add evidence notes for this decision..."
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
      />

      <Button title="Submit Verification" variant="volunteer" large onPress={handleSubmit} loading={isSubmitting} style={{ marginTop: spacing.lg, marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  icon: { fontSize: 28, marginRight: spacing.sm },
  title: { ...typography.h3, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  description: { ...typography.body, color: colors.text, marginTop: spacing.md },
  photoRow: { marginTop: spacing.md },
  photo: { width: 120, height: 120, borderRadius: radius.sm, marginRight: spacing.sm, backgroundColor: colors.border },
  noPhotos: { ...typography.small, color: colors.textMuted, marginTop: spacing.md, fontStyle: 'italic' },
  sectionLabel: { ...typography.bodyBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  decisionGrid: { gap: spacing.sm },
  decisionButton: { marginBottom: spacing.sm },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    color: colors.text,
    ...typography.body
  }
});
