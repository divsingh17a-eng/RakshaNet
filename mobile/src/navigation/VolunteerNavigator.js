import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TasksScreen from '../screens/volunteer/TasksScreen';
import VerifyReportScreen from '../screens/volunteer/VerifyReportScreen';
import FieldSurveyScreen from '../screens/volunteer/FieldSurveyScreen';
import RiskMapScreen from '../screens/volunteer/RiskMapScreen';
import TaskHistoryScreen from '../screens/volunteer/TaskHistoryScreen';
import ProfileScreen from '../screens/citizen/ProfileScreen';
import SyncStatusPill from '../components/SyncStatusPill';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator();
const TasksStack = createNativeStackNavigator();

const TAB_ICONS = {
  Tasks: '\u{1F4CB}',
  FieldSurvey: '\u{1F4DD}',
  RiskMap: '\u{1F5FA}',
  TaskHistory: '\u{1F4C5}',
  Profile: '\u{1F464}'
};

function TasksNavigator() {
  return (
    <TasksStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <SyncStatusPill />
      }}
    >
      <TasksStack.Screen name="TasksList" component={TasksScreen} options={{ title: 'Nearby Reports' }} />
      <TasksStack.Screen name="VerifyReport" component={VerifyReportScreen} options={{ title: 'Verify Report' }} />
    </TasksStack.Navigator>
  );
}

// Volunteer dashboard (PRD sec.10.2): operational, task/evidence-focused.
// Deliberately does not expose relocation-approval or other authority-only
// controls - those live only in the web Command Center (officer/admin).
export default function VolunteerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerRight: () => <SyncStatusPill />,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: () => <Text style={{ fontSize: 20 }}>{TAB_ICONS[route.name]}</Text>
      })}
    >
      <Tab.Screen name="Tasks" component={TasksNavigator} options={{ title: 'Tasks', headerShown: false }} />
      <Tab.Screen name="FieldSurvey" component={FieldSurveyScreen} options={{ title: 'Survey', headerTitle: 'Field Survey' }} />
      <Tab.Screen name="RiskMap" component={RiskMapScreen} options={{ title: 'Map', headerTitle: 'Risk Map' }} />
      <Tab.Screen name="TaskHistory" component={TaskHistoryScreen} options={{ title: 'History', headerTitle: 'Task History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
