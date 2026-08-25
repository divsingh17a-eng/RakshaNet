import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import CitizenNavigator from './CitizenNavigator';
import VolunteerNavigator from './VolunteerNavigator';
import { LoadingState } from '../components/StateViews';
import { colors, spacing, typography } from '../theme/colors';
import { ROLES } from '../constants';

// Branches the whole app's navigation on user.role (FR-01) - Citizen and
// Volunteer share one app with different home screens/navigators; the
// backend enforces the same role boundary server-side (never only hidden UI).
export default function RootNavigator() {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) return <LoadingState label="Loading RakshaNet..." />;
  if (!isAuthenticated) return <AuthNavigator />;

  if (user.role === ROLES.CITIZEN) return <CitizenNavigator />;
  if (user.role === ROLES.VOLUNTEER) return <VolunteerNavigator />;

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Unsupported account type</Text>
      <Text style={styles.body}>
        This account ({user.role}) is an Officer/Responder/Admin role. Please use the RakshaNet web
        Command Center instead.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  title: { ...typography.h3, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textMuted, textAlign: 'center' }
});
