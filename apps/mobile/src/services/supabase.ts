import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import env from '@/config/env';

/**
 * Expo SecureStore adapter for Supabase auth session persistence.
 * Sessions are encrypted at rest on device.
 */
const secureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Supabase client configured for React Native.
 * Uses SecureStore for token persistence (encrypted on device).
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      storage: secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Disable for React Native
    },
  },
);
