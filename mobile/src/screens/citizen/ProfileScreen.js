import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from '../../api/secureStorage';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { captureLocation } from '../../services/locationService';

const HOME_LOCATION_KEY = 'rakshanet_home_location';

// NOTE (documented gap): the backend has no self-serve profile-update
// endpoint for Citizen/Volunteer accounts (the only /api/users routes are
// admin-only - see backend/src/routes/users.routes.js and docs/API.md).
// So "home location" is stored locally on-device only, as a fallback the
// app itself could use (e.g. to prefill a report when GPS is unavailable);
// it is NOT sent to or recognized by the backend for SMS/IVR reporting yet.
export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [homeLocation, setHomeLocation] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await SecureStore.getItemAsync(HOME_LOCATION_KEY);
      if (raw) setHomeLocation(JSON.parse(raw));
    })();
  }, []);

  const handleSetHomeLocation = useCallback(async () => {
    setIsSaving(true);
    try {
      const loc = await captureLocation();
      await SecureStore.setItemAsync(HOME_LOCATION_KEY, JSON.stringify(loc));
      setHomeLocation(loc);
      Alert.alert('Saved', 'Home location saved on this device.');
    } catch (err) {
      Alert.alert('Could not save location', err.message);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert('Log out?', 'You can log back in any time with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  }, [logout]);

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name || '-'}</Text>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{user?.phone || '-'}</Text>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role === 'volunteer' ? 'Volunteer' : 'Citizen'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Home Location</Text>
      <Text style={styles.sectionBody}>
        Used on this device as a location fallback when GPS is unavailable. Saved locally only - the
        backend does not yet have a profile endpoint to sync this (see project notes).
      </Text>
      {homeLocation ? (
        <View style={styles.card}>
          <Text style={styles.value}>📍 {homeLocation.lat.toFixed(5)}, {homeLocation.lng.toFixed(5)}</Text>
        </View>
      ) : (
        <Text style={styles.sectionBody}>No home location saved yet.</Text>
      )}
      <Button title="Use My Current Location as Home" variant="secondary" onPress={handleSetHomeLocation} loading={isSaving} style={{ marginBottom: spacing.xl }} />

      <Button title="Log Out" variant="danger" onPress={handleLogout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  value: { ...typography.bodyBold, color: colors.text },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md, marginBottom: spacing.xs },
  sectionBody: { ...typography.small, color: colors.textMuted, marginBottom: spacing.sm }
});
