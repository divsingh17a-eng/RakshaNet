import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { captureLocation } from '../../services/locationService';
import { triggerSosOnline } from '../../api/sos';
import { enqueueSos } from '../../db/queue';
import { describeApiError } from '../../api/client';
import { useNetwork } from '../../context/NetworkContext';

export default function SosScreen() {
  const { isOnline, refreshPendingCount } = useNetwork();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(null); // { status, location, at }

  const doTrigger = useCallback(async () => {
    setIsSending(true);
    let location = null;
    try {
      location = await captureLocation();
    } catch (locErr) {
      setIsSending(false);
      Alert.alert('Could not get location', locErr.message || 'Enable location and try again.');
      return;
    }

    const payload = { lng: location.lng, lat: location.lat, accuracyMeters: location.accuracyMeters, message: message.trim() || undefined };

    try {
      if (!isOnline) throw Object.assign(new Error('offline'), { isOfflineShortCircuit: true });
      await triggerSosOnline(payload);
      setSent({ status: 'sent', location, at: new Date() });
    } catch (err) {
      const offline = err.isOfflineShortCircuit || describeApiError(err).offline;
      if (offline) {
        await enqueueSos({
          localUuid: Crypto.randomUUID(),
          lng: location.lng,
          lat: location.lat,
          accuracyMeters: location.accuracyMeters,
          message: message.trim() || undefined
        });
        await refreshPendingCount();
        setSent({ status: 'queued', location, at: new Date() });
      } else {
        Alert.alert('SOS could not be sent', describeApiError(err).message);
      }
    } finally {
      setIsSending(false);
    }
  }, [isOnline, message, refreshPendingCount]);

  const confirmAndTrigger = useCallback(() => {
    Alert.alert(
      'Send SOS?',
      'This immediately alerts responders with your live location. Only use this in a real emergency.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: doTrigger }
      ]
    );
  }, [doTrigger]);

  if (sent) {
    return (
      <Screen>
        <View style={styles.confirmWrap}>
          <Text style={styles.confirmIcon}>{sent.status === 'sent' ? '\u{1F6A8}' : '\u{1F4E5}'}</Text>
          <Text style={styles.confirmTitle}>{sent.status === 'sent' ? 'SOS Sent' : 'SOS Saved - Sending When Online'}</Text>
          <Text style={styles.confirmBody}>
            {sent.status === 'sent'
              ? 'Responders have been alerted with your location. Stay where you are if it is safe to do so.'
              : "You're offline. Your SOS is saved and will be sent the moment your connection returns - this happens automatically."}
          </Text>
          {sent.location ? (
            <Text style={styles.confirmMeta}>📍 {sent.location.lat.toFixed(5)}, {sent.location.lng.toFixed(5)}</Text>
          ) : null}
          <Text style={styles.confirmMeta}>🕐 {sent.at.toLocaleTimeString()}</Text>
          <Button title="Back to SOS" variant="secondary" onPress={() => { setSent(null); setMessage(''); }} style={{ marginTop: spacing.lg, minWidth: 200 }} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.wrap}>
        <Text style={styles.heading}>Emergency SOS</Text>
        <Text style={styles.subheading}>Press the button below to alert responders with your live location.</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send SOS emergency alert"
          onPress={confirmAndTrigger}
          disabled={isSending}
          style={({ pressed }) => [styles.sosButton, pressed && styles.sosButtonPressed, isSending && styles.sosButtonDisabled]}
        >
          {isSending ? <ActivityIndicator color="#fff" size="large" /> : <Text style={styles.sosButtonText}>SOS</Text>}
        </Pressable>

        <Text style={styles.hint}>Tap, then confirm. Works even without internet.</Text>

        <TextInput
          style={styles.messageInput}
          placeholder="Optional: add a short message (e.g. 'trapped on roof')"
          placeholderTextColor={colors.textMuted}
          value={message}
          onChangeText={setMessage}
          maxLength={500}
          multiline
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  heading: { ...typography.h1, color: colors.text, textAlign: 'center' },
  subheading: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl, maxWidth: 320 },
  sosButton: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8
  },
  sosButtonPressed: { backgroundColor: colors.primaryDark },
  sosButtonDisabled: { opacity: 0.7 },
  sosButtonText: { color: '#fff', fontSize: 48, fontWeight: '900', letterSpacing: 2 },
  hint: { ...typography.small, color: colors.textMuted, marginTop: spacing.lg, textAlign: 'center' },
  messageInput: {
    marginTop: spacing.xl,
    width: '100%',
    minHeight: 60,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    ...typography.body
  },
  confirmWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  confirmIcon: { fontSize: 64, marginBottom: spacing.md },
  confirmTitle: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  confirmBody: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md, maxWidth: 320 },
  confirmMeta: { ...typography.small, color: colors.text, marginTop: 2 }
});
