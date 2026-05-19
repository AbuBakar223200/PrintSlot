import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { queryClient } from '@/services/queryClient';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useDeviceRegistration } from '@/features/users/hooks/useDeviceRegistration';
import { colors } from '@/config/theme';

/**
 * Root layout — providers, auth listener, role-based redirect.
 *
 * Flow:
 * 1. Wait for Zustand hydration (SecureStore → memory)
 * 2. If not authenticated → redirect to (auth)/login
 * 3. If authenticated → redirect to appropriate role group
 */
export default function RootLayout() {
  const { isAuthenticated, isHydrated, user } = useAuthStore();

  // Register this device's Expo push token once auth resolves.
  // Hook is a no-op until isHydrated && isAuthenticated && user?.id is truthy;
  // safe to invoke unconditionally at the top of the component.
  useDeviceRegistration();

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.replace('/(auth)/login');
      return;
    }

    // Role-based routing
    switch (user?.role) {
      case 'CUSTOMER':
        router.replace('/(customer)/' as never);
        break;
      case 'STAFF':
        router.replace('/(staff)/jobs/' as never);
        break;
      case 'SHOP_OWNER':
        // Temporary target until Slice 30 (owner-route-group-mobile) builds
        // out the owner shell at /(owner)/shop/. Slice 30 will flip this
        // back to '/(owner)/shop/' when that route exists.
        router.replace('/(owner)/profile' as never);
        break;
      case 'PLATFORM_ADMIN':
        router.replace('/(admin)/shops/' as never);
        break;
      default:
        router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isHydrated, user?.role]);

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
