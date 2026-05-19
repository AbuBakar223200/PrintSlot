import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { queryClient } from '@/services/queryClient';
import { useDeviceRegistration } from '@/features/users/hooks/useDeviceRegistration';
import { colors } from '@/config/theme';

/**
 * Root layout - app-wide providers.
 * Route groups own their local auth redirects so mounted screens do not get
 * remounted by a global navigation effect.
 */
export default function RootLayout() {
  // Register this device's Expo push token once auth resolves.
  // Hook is a no-op until isHydrated && isAuthenticated && user?.id is truthy;
  // safe to invoke unconditionally at the top of the component.
  useDeviceRegistration();

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
