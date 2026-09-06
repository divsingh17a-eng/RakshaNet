import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/colors';

const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.textOnPrimary, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.primary, border: colors.primary },
  volunteer: { bg: colors.secondary, fg: colors.textOnPrimary, border: colors.secondary },
  neutral: { bg: colors.surface, fg: colors.text, border: colors.border },
  danger: { bg: colors.danger, fg: colors.textOnPrimary, border: colors.danger }
};

export default function Button({ title, onPress, variant = 'primary', disabled, loading, style, large, testID }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        { backgroundColor: v.bg, borderColor: v.border },
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text style={[styles.text, large && styles.textLarge, { color: isDisabled ? colors.textMuted : v.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52
  },
  large: {
    minHeight: 64,
    paddingVertical: spacing.lg
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    backgroundColor: colors.disabled,
    borderColor: colors.disabled
  },
  text: {
    ...typography.bodyBold
  },
  textLarge: {
    fontSize: 18
  }
});
