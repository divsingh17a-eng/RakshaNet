import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { NetworkProvider } from './src/context/NetworkContext';
import RootNavigator from './src/navigation/RootNavigator';

// RakshaNet mobile - one shared app for Citizen and Volunteer roles
// (SIH 2026, PS 26191, Team Jeevan Setu). Role-based navigation lives in
// RootNavigator; offline queue + auto-sync live in NetworkContext.
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NetworkProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </NetworkProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
