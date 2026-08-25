import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PhoneEntryScreen from '../screens/auth/PhoneEntryScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen name="PhoneEntry" component={PhoneEntryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} options={{ title: 'Verify Code' }} />
    </Stack.Navigator>
  );
}
