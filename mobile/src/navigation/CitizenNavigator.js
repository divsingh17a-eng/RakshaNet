import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SosScreen from '../screens/citizen/SosScreen';
import ReportChooserScreen from '../screens/citizen/ReportChooserScreen';
import ReportFormScreen from '../screens/shared/ReportFormScreen';
import MyReportsScreen from '../screens/citizen/MyReportsScreen';
import AlertsScreen from '../screens/citizen/AlertsScreen';
import RiskMapScreen from '../screens/citizen/RiskMapScreen';
import ProfileScreen from '../screens/citizen/ProfileScreen';
import SyncStatusPill from '../components/SyncStatusPill';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const ReportStack = createNativeStackNavigator();

const TAB_ICONS = {
  Sos: '\u{1F6A8}',
  Report: '\u{1F4E3}',
  MyReports: '\u{1F4CB}',
  Alerts: '\u{1F514}',
  RiskMap: '\u{1F5FA}',
  Profile: '\u{1F464}'
};

function ReportNavigator() {
  return (
    <ReportStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <SyncStatusPill />
      }}
    >
      <ReportStack.Screen name="ReportChooser" component={ReportChooserScreen} options={{ title: 'Report' }} />
      <ReportStack.Screen name="ReportForm" component={ReportFormScreen} options={{ title: 'Report' }} />
    </ReportStack.Navigator>
  );
}

// Citizen dashboard (PRD sec.10.1): SOS, Report Hazard/Vulnerability, My
// Reports, Alerts, Nearby Risk Map, Profile/Settings. Minimal text, large
// tap targets, one-handed usable (PRD sec.12).
export default function CitizenNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <SyncStatusPill />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
      })}
    >
      <Tab.Screen name="Sos" component={SosScreen} options={{ title: 'SOS', headerShown: false }} />
      <Tab.Screen name="Report" component={ReportNavigator} options={{ title: 'Report', headerShown: false }} />
      <Tab.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My Reports', headerTitle: 'My Reports' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
      <Tab.Screen name="RiskMap" component={RiskMapScreen} options={{ title: 'Map', headerTitle: 'Nearby Risk Map' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
