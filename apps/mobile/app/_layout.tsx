import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { queryClient } from '@/services/queryClient';
import { useDeviceRegistration } from '@/features/users/hooks/useDeviceRegistration';
import { colors } from '@/config/theme';

/**
 * App shell — applies the top safe-area inset globally so no screen's content
 * overlaps the status bar / camera notch. Backgrounds stay full-bleed; only the
 * navigator content is padded. Lives inside SafeAreaProvider so the hook resolves.
 */
function AppShell() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      />
    </View>
  );
}

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
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
