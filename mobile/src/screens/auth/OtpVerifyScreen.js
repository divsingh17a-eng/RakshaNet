import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { describeApiError } from '../../api/client';

export default function OtpVerifyScreen({ route }) {
  const { phone } = route.params;
  const { verifyOtp, requestOtp } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleVerify = useCallback(async () => {
    if (code.trim().length < 4) {
      setError('Enter the code you received.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await verifyOtp(phone, code.trim());
      // Navigation swaps automatically once AuthContext's user is set -
      // RootNavigator re-renders into the role-based navigator.
    } catch (err) {
      setError(describeApiError(err).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [code, phone, verifyOtp]);

  const handleResend = useCallback(async () => {
    setIsResending(true);
    try {
      await requestOtp(phone);
    } catch (err) {
      setError(describeApiError(err).message);
    } finally {
      setIsResending(false);
    }
  }, [phone, requestOtp]);

  return (
    <Screen>
      <View style={styles.wrap}>
        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>Sent to {phone}. In the demo environment, check the backend console log.</Text>

        <TextInput
          style={styles.input}
          placeholder="123456"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          maxLength={8}
          value={code}
          onChangeText={setCode}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Verify &amp; Continue" large onPress={handleVerify} loading={isSubmitting} style={{ marginTop: spacing.lg }} />
        <Button title="Resend Code" variant="secondary" onPress={handleResend} loading={isResending} style={{ marginTop: spacing.sm }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.md },
  title: { ...typography.h2, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
    color: colors.text
  },
  error: { ...typography.small, color: colors.danger, marginTop: spacing.xs, textAlign: 'center' }
});
