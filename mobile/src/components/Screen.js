import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme/colors';

// Consistent full-screen wrapper with safe-area insets + optional
// pull-to-refresh, used by every data screen so loading/empty/error states
// sit inside the same layout.
export default function Screen({ children, scroll = true, onRefresh, refreshing, style, contentContainerStyle }) {
  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
        <View style={[styles.container, contentContainerStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.container, contentContainerStyle]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined
        }
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: spacing.md,
    flexGrow: 1
  }
});
