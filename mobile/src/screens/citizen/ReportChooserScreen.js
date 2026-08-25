import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import { colors, radius, spacing, typography } from '../../theme/colors';

export default function ReportChooserScreen({ navigation }) {
  return (
    <Screen>
      <Text style={styles.title}>What would you like to report?</Text>
      <Text style={styles.subtitle}>Choose the option that best matches what you're seeing.</Text>

      <Pressable style={styles.card} onPress={() => navigation.navigate('ReportForm', { kind: 'hazard' })}>
        <Text style={styles.cardIcon}>⚠️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Report a Hazard</Text>
          <Text style={styles.cardBody}>Flood, landslide, fire, earthquake, cyclone and more.</Text>
        </View>
      </Pressable>

      <Pressable style={styles.card} onPress={() => navigation.navigate('ReportForm', { kind: 'vulnerability' })}>
        <Text style={styles.cardIcon}>🏚️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Report a Vulnerability</Text>
          <Text style={styles.cardBody}>Unsafe housing, blocked roads, or other risks to people.</Text>
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  cardIcon: { fontSize: 32, marginRight: spacing.md },
  cardTitle: { ...typography.h3, color: colors.text },
  cardBody: { ...typography.small, color: colors.textMuted, marginTop: 2 }
});
