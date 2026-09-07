import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { describeApiError } from '../../api/client';

export default function PhoneEntryScreen({ navigation }) {
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
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
      await requestOtp(trimmed);
      navigation.navigate('OtpVerify', { phone: trimmed });
    } catch (err) {
      setError(describeApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [phone, requestOtp, navigation]);

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
  hint: { ...typography.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg }
});
