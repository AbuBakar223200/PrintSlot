import React, { useEffect } from 'react';
import { Stack, router, useRootNavigationState } from 'expo-router';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { Role } from '@printslot/shared';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { resolveProtectedRouteRedirect } from '@/features/auth/navigation/roleRedirect';

interface RoleProtectedStackProps {
  requiredRole: Role;
  screenOptions?: NativeStackNavigationOptions;
}

export function RoleProtectedStack({
  requiredRole,
  screenOptions,
}: RoleProtectedStackProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const role = useAuthStore((s) => s.user?.role);
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  const redirectPath = resolveProtectedRouteRedirect({
    isHydrated,
    isAuthenticated,
    role,
    requiredRole,
  });

  useEffect(() => {
    if (!isNavigationReady) return;

    if (redirectPath) {
      router.replace(redirectPath as never);
    }
  }, [isNavigationReady, redirectPath]);

  if (!isHydrated || !isNavigationReady || redirectPath) {
    return null;
  }

  return <Stack screenOptions={screenOptions} />;
}
