import React, { useEffect } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import { useThemeTokens } from '@/theme';
import { getRoleHomePath } from '@/features/auth/navigation/roleRedirect';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

/**
 * Auth group layout - headerless stack for login/register flow.
 * Redirects authenticated users while this auth group is mounted.
 */
export default function AuthLayout() {
  const tokens = useThemeTokens();
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
        contentStyle: { backgroundColor: tokens.bgGradient[1] },
        animation: 'slide_from_right',
      }}
    />
  );
}
