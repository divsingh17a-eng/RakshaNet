import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { ErrorState, LoadingState } from '../../components/StateViews';
import { listHabitations } from '../../api/habitations';
import { submitSurveyOnline } from '../../api/surveys';
import { enqueueSurvey } from '../../db/queue';
import { describeApiError } from '../../api/client';
import { captureLocation } from '../../services/locationService';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useNetwork } from '../../context/NetworkContext';

// Structured checklist (FR-05). Boolean/number answers are weighted and
// folded into the habitation's HVI on the server (see
// backend/src/controllers/surveys.controller.js scoreChecklist) - numeric
// items are already expressed as a 0-100 rating so that scoring lines up
// with the server's `Math.max(0, Math.min(100, item.answer))` normalization.
const CHECKLIST = [
  { id: 'pucca_housing', label: 'Majority of homes are pucca (permanent) construction', type: 'boolean', weight: 3 },
  { id: 'road_access', label: 'All-weather road access is available', type: 'boolean', weight: 2 },
  { id: 'elevated_ground', label: 'Habitation sits on elevated / flood-safe ground', type: 'boolean', weight: 2 },
  { id: 'water_source', label: 'Reliable drinking water source on-site', type: 'boolean', weight: 1 },
  { id: 'early_warning', label: 'Community has early-warning / evacuation drill history', type: 'boolean', weight: 1 },
  { id: 'structural_risk', label: 'Structural damage/risk observed (0 = none, 100 = severe)', type: 'number', weight: 3 },
  { id: 'population_vulnerability', label: 'Elderly/disabled/children share observed (0 = low, 100 = high)', type: 'number', weight: 2 },
  { id: 'notes_observation', label: 'Additional observations', type: 'text', weight: 1 }
];

const NUMBER_PRESETS = [0, 25, 50, 75, 100];

function initialAnswers() {
  return CHECKLIST.map((item) => ({ id: item.id, label: item.label, weight: item.weight, answer: item.type === 'boolean' ? null : item.type === 'number' ? null : '' }));
}

export default function FieldSurveyScreen() {
  const { isOnline, refreshPendingCount } = useNetwork();
  const [habitations, setHabitations] = useState([]);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [habitation, setHabitation] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [answers, setAnswers] = useState(initialAnswers());
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { habitations: data } = await listHabitations();
      setHabitations(data);
      setStatus('ready');
    } catch (err) {
      setErrorMessage(describeApiError(err).message);
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAnswer = useCallback((id, value) => {
    setAnswers((prev) => prev.map((a) => (a.id === id ? { ...a, answer: value } : a)));
  }, []);

  const previewScore = useMemo(() => {
    let sum = 0;
    let weightTotal = 0;
    let answered = 0;
    answers.forEach((a) => {
      const item = CHECKLIST.find((c) => c.id === a.id);
      if (item.type === 'text') return;
      if (a.answer === null || a.answer === undefined) return;
      answered += 1;
      const normalized = item.type === 'boolean' ? (a.answer ? 100 : 0) : Math.max(0, Math.min(100, a.answer));
      sum += normalized * a.weight;
      weightTotal += a.weight;
    });
    return { score: weightTotal > 0 ? Math.round((sum / weightTotal) * 10) / 10 : null, answered, total: CHECKLIST.filter((c) => c.type !== 'text').length };
  }, [answers]);

  const handleCaptureLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const loc = await captureLocation();
      setLocation(loc);
    } catch (err) {
      Alert.alert('Could not get location', err.message);
    } finally {
      setIsLocating(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!habitation) {
      Alert.alert('Select a habitation', 'Choose which habitation this survey is for.');
      return;
    }
    const unanswered = answers.some((a) => {
      const item = CHECKLIST.find((c) => c.id === a.id);
      return item.type !== 'text' && (a.answer === null || a.answer === undefined);
    });
    if (unanswered) {
      Alert.alert('Incomplete checklist', 'Please answer every yes/no and rating item before submitting.');
      return;
    }

    setIsSubmitting(true);
    const localUuid = Crypto.randomUUID();
    const payload = {
      localUuid,
      habitationId: habitation.id,
      answers: answers.map(({ id, label, weight, answer }) => ({ id, label, weight, answer })),
      notes: notes.trim() || undefined,
      lng: location?.lng,
      lat: location?.lat,
      surveyedAt: new Date().toISOString()
    };

    try {
      if (!isOnline) throw Object.assign(new Error('offline'), { isOfflineShortCircuit: true });
      const { hvi } = await submitSurveyOnline(payload);
      setResult({ status: 'submitted', hvi });
    } catch (err) {
      const offline = err.isOfflineShortCircuit || describeApiError(err).offline;
      if (offline) {
        await enqueueSurvey({ ...payload, habitationName: habitation.name });
        await refreshPendingCount();
        setResult({ status: 'queued' });
      } else {
        Alert.alert('Could not submit', describeApiError(err).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [habitation, answers, notes, location, isOnline, refreshPendingCount]);

  const resetForm = useCallback(() => {
    setResult(null);
    setHabitation(null);
    setAnswers(initialAnswers());
    setNotes('');
    setLocation(null);
  }, []);

  if (status === 'loading') return <LoadingState label="Loading habitations..." />;
  if (status === 'error') return <ErrorState message={errorMessage} onRetry={load} />;

  if (result) {
    return (
      <Screen>
        <View style={styles.successWrap}>
          <Text style={styles.successIcon}>{result.status === 'submitted' ? '✅' : '📥'}</Text>
          <Text style={styles.successTitle}>{result.status === 'submitted' ? 'Survey submitted' : 'Saved as offline draft'}</Text>
          <Text style={styles.successBody}>
            {result.status === 'submitted'
              ? `Habitation HVI recalculated${result.hvi?.hvi !== undefined ? `: ${Math.round(result.hvi.hvi)}/100` : ''}.`
              : "You're offline. This survey is saved on your device and will sync automatically once you're back online."}
          </Text>
          <Button title="New Survey" onPress={resetForm} style={{ minWidth: 200 }} variant="volunteer" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>Field Survey</Text>
      <Text style={styles.subtitle}>Structured vulnerability checklist for a habitation.</Text>

      <Text style={styles.sectionLabel}>Habitation</Text>
      <Pressable style={styles.picker} onPress={() => setPickerVisible(true)}>
        <Text style={habitation ? styles.pickerValue : styles.pickerPlaceholder}>
          {habitation ? `${habitation.name} (${habitation.district})` : 'Select a habitation...'}
        </Text>
      </Pressable>

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <Screen scroll={false}>
          <Text style={styles.title}>Select Habitation</Text>
          {habitations.map((h) => (
            <Pressable key={h.id} style={styles.pickerRow} onPress={() => { setHabitation(h); setPickerVisible(false); }}>
              <Text style={styles.pickerRowTitle}>{h.name}</Text>
              <Text style={styles.pickerRowMeta}>{h.district}, {h.state} - Zone: {h.currentZone}</Text>
            </Pressable>
          ))}
          <Button title="Cancel" variant="neutral" onPress={() => setPickerVisible(false)} />
        </Screen>
      </Modal>

      <Text style={styles.sectionLabel}>Checklist ({previewScore.answered}/{previewScore.total} answered)</Text>
      {CHECKLIST.map((item) => {
        const current = answers.find((a) => a.id === item.id)?.answer;
        return (
          <View key={item.id} style={styles.checklistItem}>
            <Text style={styles.checklistLabel}>{item.label}</Text>
            {item.type === 'boolean' && (
              <View style={styles.row}>
                <Button title="Yes" variant={current === true ? 'volunteer' : 'neutral'} onPress={() => handleAnswer(item.id, true)} style={styles.halfButton} />
                <Button title="No" variant={current === false ? 'volunteer' : 'neutral'} onPress={() => handleAnswer(item.id, false)} style={styles.halfButton} />
              </View>
            )}
            {item.type === 'number' && (
              <View style={styles.presetRow}>
                {NUMBER_PRESETS.map((n) => (
                  <Pressable key={n} onPress={() => handleAnswer(item.id, n)} style={[styles.presetChip, current === n && styles.presetChipActive]}>
                    <Text style={[styles.presetText, current === n && styles.presetTextActive]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {item.type === 'text' && (
              <TextInput
                style={styles.textInput}
                placeholder="Optional notes..."
                placeholderTextColor={colors.textMuted}
                value={current}
                onChangeText={(v) => handleAnswer(item.id, v)}
              />
            )}
          </View>
        );
      })}

      {previewScore.score !== null && (
        <View style={styles.scorePreview}>
          <Text style={styles.scorePreviewLabel}>Estimated vulnerability score</Text>
          <Text style={styles.scorePreviewValue}>{previewScore.score} / 100</Text>
        </View>
      )}

      <Text style={styles.sectionLabel}>GPS Geotag</Text>
      {location ? (
        <Text style={styles.locationText}>📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</Text>
      ) : (
        <Button title="📍 Capture Location" variant="secondary" onPress={handleCaptureLocation} loading={isLocating} />
      )}

      <Text style={styles.sectionLabel}>Overall Notes</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        maxLength={1000}
        placeholder="Any other context for reviewers..."
        placeholderTextColor={colors.textMuted}
        value={notes}
        onChangeText={setNotes}
      />

      <Button
        title={isOnline ? 'Submit Survey' : 'Save Survey (Offline)'}
        variant="volunteer"
        large
        onPress={handleSubmit}
        loading={isSubmitting}
        style={{ marginTop: spacing.lg, marginBottom: spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  sectionLabel: { ...typography.bodyBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  picker: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  pickerValue: { ...typography.body, color: colors.text },
  pickerPlaceholder: { ...typography.body, color: colors.textMuted },
  pickerRow: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerRowTitle: { ...typography.bodyBold, color: colors.text },
  pickerRowMeta: { ...typography.caption, color: colors.textMuted },
  checklistItem: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  checklistLabel: { ...typography.body, color: colors.text, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfButton: { flex: 1 },
  presetRow: { flexDirection: 'row', gap: spacing.sm },
  presetChip: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  presetChipActive: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  presetText: { ...typography.small, color: colors.text },
  presetTextActive: { color: colors.textOnPrimary, fontWeight: '700' },
  textInput: { backgroundColor: colors.background, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, color: colors.text },
  scorePreview: { backgroundColor: '#EFF6FF', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.md, alignItems: 'center' },
  scorePreviewLabel: { ...typography.caption, color: colors.secondary },
  scorePreviewValue: { ...typography.h2, color: colors.secondary },
  locationText: { ...typography.bodyBold, color: colors.text },
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
  },
  successWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  successIcon: { fontSize: 56, marginBottom: spacing.md },
  successTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  successBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg, maxWidth: 320 }
});
