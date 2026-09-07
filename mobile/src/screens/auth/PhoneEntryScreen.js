import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { describeApiError } from '../../api/client';
import { ROLES } from '../../constants';

const ROLE_OPTIONS = [
  { value: ROLES.CITIZEN, label: 'Citizen' },
  { value: ROLES.VOLUNTEER, label: 'Volunteer' }
];

export default function PhoneEntryScreen({ navigation }) {
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  // Only applies on a brand-new phone number's first sign-up - an existing
  // account's role never changes here (see backend/src/controllers/auth.controller.js).
  const [role, setRole] = useState(ROLES.CITIZEN);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = useCallback(async () => {
    const trimmed = phone.trim();
    if (trimmed.length < 8) {
      setError('Enter a valid phone number, e.g. +919800000001');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      // devCode only comes back when no real SMS gateway (Twilio) is
      // configured on the backend - see backend/src/services/otp.service.js.
      // Passed through so OtpVerifyScreen can auto-fill it instead of
      // sending the user to hunt for it in a backend console they can't see.
      const result = await requestOtp(trimmed, role);
      navigation.navigate('OtpVerify', { phone: trimmed, devCode: result?.devCode });
    } catch (err) {
      setError(describeApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, role, requestOtp, navigation]);

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.brand}>RakshaNet</Text>
        <Text style={styles.tagline}>Disaster-risk intelligence &amp; strategic relocation</Text>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="+919800000001"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={[styles.label, { marginTop: spacing.md }]}>I am a...</Text>
        <View style={styles.roleRow}>
          {ROLE_OPTIONS.map((opt) => (
            <Text
              key={opt.value}
              onPress={() => setRole(opt.value)}
              style={[styles.roleOption, role === opt.value && styles.roleOptionActive]}
            >
              {opt.label}
            </Text>
          ))}
        </View>

        <Button title="Send OTP" large onPress={handleContinue} loading={isSubmitting} style={{ marginTop: spacing.lg }} />

        <Text style={styles.hint}>
          {isSubmitting
            ? "Connecting - this can take up to a minute the first time if the server is waking up."
            : "No password needed. We'll text you a one-time code."}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  brand: { ...typography.h1, color: colors.primary, textAlign: 'center' },
  tagline: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xl },
  label: { ...typography.bodyBold, color: colors.text, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text
  },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  roleRow: { flexDirection: 'row', gap: spacing.sm },
  roleOption: {
    ...typography.bodyBold,
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textMuted,
    overflow: 'hidden'
  },
  roleOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: '#FFFFFF'
  }
});
