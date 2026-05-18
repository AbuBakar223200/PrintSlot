import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'printslot-device-id';

/**
 * Returns an RFC 4122 v4-shaped UUID string.
 *
 * Not cryptographically strong — uses Math.random. Sufficient for our use:
 * the deviceId is an opaque per-user identifier (UserDevice is uniquely keyed
 * by [userId, deviceId]), not a security secret. Avoids pulling in
 * expo-crypto or react-native-get-random-values (Hermes on RN 0.74 does not
 * ship a Web Crypto polyfill).
 */
export function randomUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns a stable deviceId for this install of the app, generating and
 * persisting one on first call. The same install always returns the same id;
 * reinstalling the app (Keychain/Keystore wipe) produces a new id and a new
 * UserDevice row server-side — stale rows are reactively cleaned up by the
 * NotificationsService DeviceNotRegistered handler.
 */
export async function getDeviceId(): Promise<string> {
  const cached = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (cached) return cached;
  const fresh = randomUuid();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, fresh);
  return fresh;
}
