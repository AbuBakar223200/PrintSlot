import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { usersApi } from '../services/usersApi';
import { getDeviceId } from '../services/deviceId';

const REGISTRATION_CACHE_KEY = 'printslot-last-device-registration';
const EXPO_PROJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CachedRegistration {
  userId: string;
  token: string;
  deviceId: string;
}

async function readCache(): Promise<CachedRegistration | null> {
  const raw = await SecureStore.getItemAsync(REGISTRATION_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedRegistration;
  } catch {
    return null;
  }
}

async function writeCache(value: CachedRegistration): Promise<void> {
  await SecureStore.setItemAsync(REGISTRATION_CACHE_KEY, JSON.stringify(value));
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function getExpoProjectId(): string | null {
  const projectId =
    (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId
    ?? (Constants.easConfig as { projectId?: string } | undefined)?.projectId
    ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

  if (!projectId || !EXPO_PROJECT_ID_PATTERN.test(projectId)) {
    return null;
  }

  return projectId;
}

async function fetchExpoPushToken(): Promise<string | null> {
  const projectId = getExpoProjectId();
  if (!projectId) return null;

  const result = await Notifications.getExpoPushTokenAsync({ projectId });
  return result.data;
}

/**
 * Internal — runs the full registration flow and writes the cache.
 * Exported for tests. Side-effects only; throws on any failure so the
 * caller can decide whether to swallow.
 */
export async function registerDeviceOnce(userId: string): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;

  const token = await fetchExpoPushToken();
  if (!token) return;

  const deviceId = await getDeviceId();

  const cached = await readCache();
  if (cached && cached.userId === userId && cached.token === token && cached.deviceId === deviceId) {
    return;
  }

  await usersApi.registerDevice({ token, deviceId });
  await writeCache({ userId, token, deviceId });
}

/**
 * Side-effect hook — registers this device's Expo push token with the API
 * once per authenticated user.id within a single mount.
 *
 * Fires when (isHydrated && isAuthenticated && user.id) becomes truthy, and
 * re-fires if user.id changes (logout → relogin as a different user).
 *
 * Failures are swallowed and logged — registration is best-effort. The next
 * cold start retries. No AppState foreground listener; deferred to a future
 * notification-hardening slice.
 */
export function useDeviceRegistration(): void {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const ranForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !userId) return;
    if (ranForRef.current === userId) return;
    ranForRef.current = userId;
    registerDeviceOnce(userId).catch((err) => {
      console.warn('[device-registration]', err);
    });
  }, [isHydrated, isAuthenticated, userId]);
}
