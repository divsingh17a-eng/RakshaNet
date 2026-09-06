import React, { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { HAZARD_TYPES, HAZARD_TYPE_ICONS, HAZARD_TYPE_LABELS } from '../../constants';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { captureLocation } from '../../services/locationService';
import { submitReportOnline } from '../../api/reports';
import { enqueueReport } from '../../db/queue';
import { describeApiError } from '../../api/client';
import { useNetwork } from '../../context/NetworkContext';

const HAZARD_ORDER = [
  HAZARD_TYPES.FLOOD,
  HAZARD_TYPES.LANDSLIDE,
  HAZARD_TYPES.RAINFALL,
  HAZARD_TYPES.COASTAL_EROSION,
  HAZARD_TYPES.EARTHQUAKE,
  HAZARD_TYPES.CYCLONE,
  HAZARD_TYPES.FIRE,
  HAZARD_TYPES.STRUCTURAL,
  HAZARD_TYPES.OTHER
];

const COPY = {
  hazard: {
    title: 'Report a Hazard',
    subtitle: 'Tell us what you are seeing - flood, landslide, fire and more.',
    defaultType: HAZARD_TYPES.FLOOD
  },
  vulnerability: {
    title: 'Report a Vulnerability',
    subtitle: 'Flag unsafe housing, blocked roads, or other risks to people here.',
    defaultType: HAZARD_TYPES.STRUCTURAL
  }
};

export default function ReportFormScreen({ route, navigation }) {
  const kind = route?.params?.kind === 'vulnerability' ? 'vulnerability' : 'hazard';
  const copy = COPY[kind];
  const { isOnline, refreshPendingCount } = useNetwork();

  const [type, setType] = useState(copy.defaultType);
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { status: 'submitted' | 'queued' }

  const handleCaptureLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError('');
    try {
      const loc = await captureLocation();
      setLocation(loc);
    } catch (err) {
      setLocationError(err.message || 'Could not get your location.');
    } finally {
      setIsLocating(false);
    }
  }, []);

  const handleAddPhoto = useCallback(async (fromCamera) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Enable camera/photo access in Settings to attach evidence.');
      return;
    }
    const pickerFn = fromCamera ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result2 = await pickerFn({ mediaTypes: ['images'], quality: 0.6, allowsEditing: false });
    if (!result2.canceled && result2.assets?.length) {
      const asset = result2.assets[0];
      setPhotos((prev) => [...prev, { uri: asset.uri, fileName: asset.fileName || `photo-${Date.now()}.jpg`, mimeType: asset.mimeType || 'image/jpeg' }].slice(0, 3));
    }
  }, []);

  const removePhoto = useCallback((uri) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!location) {
      Alert.alert('Location required', 'Please capture your location before submitting.');
      return;
    }
    setIsSubmitting(true);
    const localUuid = Crypto.randomUUID();
    const payload = {
      localUuid,
      type,
      severity,
      description: description.trim() || undefined,
      lng: location.lng,
      lat: location.lat,
      reportedAt: new Date().toISOString()
    };

    try {
      if (!isOnline) throw Object.assign(new Error('offline'), { isOfflineShortCircuit: true });
      await submitReportOnline({ ...payload, photos });
      setResult({ status: 'submitted' });
    } catch (err) {
      const { offline } = err.isOfflineShortCircuit ? { offline: true } : describeApiError(err);
      if (offline) {
        await enqueueReport({ ...payload, kind, photos });
        await refreshPendingCount();
        setResult({ status: 'queued' });
      } else {
        Alert.alert('Could not submit', describeApiError(err).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [location, type, severity, description, photos, isOnline, kind, refreshPendingCount]);

  if (result) {
    return (
      <Screen>
        <View style={styles.successWrap}>
          <Text style={styles.successIcon}>{result.status === 'submitted' ? '✅' : '📥'}</Text>
          <Text style={styles.successTitle}>{result.status === 'submitted' ? 'Report submitted' : 'Saved - will sync automatically'}</Text>
          <Text style={styles.successBody}>
            {result.status === 'submitted'
              ? 'Thank you. A volunteer will review your report.'
              : "You're offline right now, so this report is saved on your device. It will upload as soon as you're back online - no action needed."}
          </Text>
          <Button title="Submit Another" variant="secondary" onPress={() => { setResult(null); setPhotos([]); setDescription(''); setLocation(null); }} style={styles.successBtn} />
          <Button title="View My Reports" onPress={() => navigation.navigate('MyReports')} style={styles.successBtn} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.subtitle}>{copy.subtitle}</Text>

      <Text style={styles.sectionLabel}>Type</Text>
      <View style={styles.chipGrid}>
        {HAZARD_ORDER.map((t) => (
          <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
            <Text style={styles.chipIcon}>{HAZARD_TYPE_ICONS[t]}</Text>
            <Text style={[styles.chipLabel, type === t && styles.chipLabelActive]}>{HAZARD_TYPE_LABELS[t]}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Severity: {severity} / 5</Text>
      <View style={styles.severityRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setSeverity(n)} style={[styles.severityDot, n <= severity && styles.severityDotActive]}>
            <Text style={[styles.severityText, n <= severity && styles.severityTextActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Location</Text>
      {location ? (
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>📍 {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</Text>
          {location.accuracyMeters ? <Text style={styles.locationAccuracy}>Accuracy ~{Math.round(location.accuracyMeters)}m</Text> : null}
          <Button title="Update Location" variant="secondary" onPress={handleCaptureLocation} loading={isLocating} />
        </View>
      ) : (
        <Button title="📍 Capture My Location" onPress={handleCaptureLocation} loading={isLocating} variant="secondary" />
      )}
      {locationError ? <Text style={styles.errorText}>{locationError}</Text> : null}

      <Text style={styles.sectionLabel}>Photo evidence (optional)</Text>
      <View style={styles.photoRow}>
        {photos.map((p) => (
          <Pressable key={p.uri} onPress={() => removePhoto(p.uri)} style={styles.photoThumbWrap}>
            <Image source={{ uri: p.uri }} style={styles.photoThumb} />
            <Text style={styles.photoRemove}>Remove</Text>
          </Pressable>
        ))}
        {photos.length < 3 && (
          <View style={styles.photoButtons}>
            <Button title="📷 Camera" variant="secondary" onPress={() => handleAddPhoto(true)} />
            <Button title="🖼️ Gallery" variant="secondary" onPress={() => handleAddPhoto(false)} style={{ marginTop: spacing.sm }} />
          </View>
        )}
      </View>
      {!isOnline && photos.length > 0 ? (
        <Text style={styles.offlinePhotoNote}>Note: while offline, photos are kept on this device but won't upload with the background sync - resubmit online later to attach them.</Text>
      ) : null}

      <Text style={styles.sectionLabel}>Description (optional)</Text>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={4}
        maxLength={1000}
        placeholder="Briefly describe what you're seeing..."
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
      />

      <Button title={isOnline ? 'Submit Report' : 'Save Report (Offline)'} large onPress={handleSubmit} loading={isSubmitting} style={{ marginTop: spacing.lg, marginBottom: spacing.xl }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  sectionLabel: { ...typography.bodyBold, color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#FEE2E2' },
  chipIcon: { fontSize: 16, marginRight: 6 },
  chipLabel: { ...typography.small, color: colors.text },
  chipLabelActive: { color: colors.primaryDark, fontWeight: '700' },
  severityRow: { flexDirection: 'row', gap: spacing.sm },
  severityDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface
  },
  severityDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  severityText: { ...typography.bodyBold, color: colors.text },
  severityTextActive: { color: colors.textOnPrimary },
  locationBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  locationText: { ...typography.bodyBold, color: colors.text },
  locationAccuracy: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.sm },
  errorText: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' },
  photoThumbWrap: { marginRight: spacing.sm, marginBottom: spacing.sm, alignItems: 'center' },
  photoThumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.border },
  photoRemove: { ...typography.caption, color: colors.danger, marginTop: 4 },
  photoButtons: { marginBottom: spacing.sm },
  offlinePhotoNote: { ...typography.caption, color: colors.warning, marginTop: spacing.xs },
  textArea: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 100,
    textAlignVertical: 'top',
    color: colors.text,
    ...typography.body
  },
  successWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  successIcon: { fontSize: 56, marginBottom: spacing.md },
  successTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  successBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.lg },
  successBtn: { minWidth: 220, marginTop: spacing.sm }
});
