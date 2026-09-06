import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import RootNavigator from './src/navigation/RootNavigator';
import { updateMe } from './src/api/auth';
import { ROLES } from './src/constants';

// RakshaNet mobile - one shared native app for Citizen and Volunteer roles
// (SIH 2026, PS 26191, Team Jeevan Setu). Role-based navigation lives in
// RootNavigator; offline queue + auto-sync live in NetworkContext.

// Same value as app.json's extra.eas.projectId - required by
// getExpoPushTokenAsync to know which EAS project to mint the token for.
const EAS_PROJECT_ID = '0839dc05-b2fc-4fcd-a61a-4730089b9b81';

// Real push notifications for the existing backend alert system
// (backend/src/services/alert.service.js raiseAlert -> push.service.js) -
// the single biggest gap for a disaster-response app: without this, closing
// the app means missing an SOS acknowledgment, a zone-crossing warning, or a
// relocation approval entirely. Shown even while the app is already open -
// the default behavior suppresses foreground notifications, which is wrong
// for alerts that matter.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

const navigationRef = createNavigationContainerRef();

// Registers this device for push once logged in, and routes a tapped
// notification to the right screen. Lives inside AuthProvider so it can use
// useAuth() - renders nothing itself.
function PushNotificationManager() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted) {
          const requested = await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }
        if (!granted) return;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
        await updateMe({ pushToken: token });
      } catch {
        // Best-effort: denied permission, no physical device, or offline -
        // the app still works fully, it just won't reach a closed instance.
      }
    })();
  }, [isAuthenticated]);

  // Deep linking: a tapped notification's data.screen (see
  // backend/src/services/push.service.js) tells us where to jump. Covers
  // both a cold start (app was closed when tapped) and a tap while already
  // running/backgrounded - this hook reflects the most recent response
  // either way, no separate code path needed for each. Volunteers have no
  // "Alerts" tab in this app (see VolunteerNavigator) - "Tasks" is their
  // nearest equivalent inbox.
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const screen = lastNotificationResponse?.notification.request.content.data?.screen;
    if (!screen || !navigationRef.isReady()) return;
    const target = screen === 'alerts' && user?.role === ROLES.VOLUNTEER ? 'Tasks' : 'Alerts';
    try {
      navigationRef.navigate(target);
    } catch {
      // Screen not present for this role's navigator - fine, just a no-op.
    }
  }, [lastNotificationResponse, user]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <NavigationContainer ref={navigationRef}>
            <PushNotificationManager />
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
