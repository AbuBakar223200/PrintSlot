import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { queryClient } from '@/services/queryClient';
import { useDeviceRegistration } from '@/features/users/hooks/useDeviceRegistration';
import { ThemeProvider, useTheme, useThemeTokens } from '@/theme';
import { ToastHost } from '@/components/ui';
import { initI18n } from '@/i18n';
import { useLang } from '@/i18n/useLang';
import { useSettingsStore } from '@/features/settings/store/useSettingsStore';

// Initialize i18n once at module load with the initial language (Phase 0 / F6).
initI18n(useSettingsStore.getState().language);

/**
 * App shell — themed root inside all providers. Applies the top safe-area inset
 * globally (so un-migrated screens stay clear of the notch) and overlays the
 * ToastHost. Migrated screens use the `Screen` primitive for the ambient
 * background; the navigator base color comes from the active theme.
 */
function AppShell() {
  const tokens = useThemeTokens();
  const { name } = useTheme();
  const insets = useSafeAreaInsets();
  useLang(); // keep i18next synced to the settings-store language

  return (
    <View style={[styles.flex, { paddingTop: insets.top, backgroundColor: tokens.bgGradient[1] }]}>
      <StatusBar style={name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: tokens.bgGradient[1] },
          animation: 'fade',
        }}
      />
      <ToastHost />
    </View>
  );
}

/**
 * Root layout — app-wide providers. Route groups own their local auth redirects.
 */
export default function RootLayout() {
  // Register this device's Expo push token once auth resolves (no-op until ready).
  useDeviceRegistration();

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AppShell />
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
