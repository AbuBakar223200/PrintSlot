import React, { useEffect } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import { colors } from '@/config/theme';
import { getRoleHomePath } from '@/features/auth/navigation/roleRedirect';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

/**
 * Auth group layout - headerless stack for login/register flow.
 * Redirects authenticated users while this auth group is mounted.
 */
export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const role = useAuthStore((s) => s.user?.role);
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  useEffect(() => {
    if (!isNavigationReady || !isHydrated || !isAuthenticated) return;

    const homePath = getRoleHomePath(role);
    if (homePath) {
      router.replace(homePath as never);
    }
  }, [isAuthenticated, isHydrated, isNavigationReady, role]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
