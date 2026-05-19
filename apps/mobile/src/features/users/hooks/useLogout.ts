import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { usersApi } from '../services/usersApi';
import { getDeviceId } from '../services/deviceId';

const REGISTRATION_CACHE_KEY = 'printslot-last-device-registration';

/**
 * Orchestrates logout:
 *
 *   1. Best-effort DELETE /users/me/device/:deviceId (stops push delivery
 *      to the next user of this physical device).
 *   2. Clear the SecureStore registration cache so the next login can
 *      re-register without hitting a stale cache hit.
 *   3. Call authStore.clearSession() — the root layout reacts to
 *      isAuthenticated === false and redirects to /(auth)/login.
 *
 * Network failures during unregistration are swallowed — clearSession
 * always runs. Stale UserDevice rows on the server are cleaned reactively
 * by the NotificationsService DeviceNotRegistered handler (Slice 23).
 */
export function useLogout(): () => Promise<void> {
  const clearSession = useAuthStore((s) => s.clearSession);

  return useCallback(async () => {
    try {
      const deviceId = await getDeviceId();
      await usersApi.unregisterDevice(deviceId);
    } catch (err) {
      console.warn('[logout] device unregistration failed (non-fatal)', err);
    }
    try {
      await SecureStore.deleteItemAsync(REGISTRATION_CACHE_KEY);
    } catch {
      /* cache miss is fine */
    }
    clearSession();
  }, [clearSession]);
}
