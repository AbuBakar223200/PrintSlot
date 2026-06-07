import Constants from 'expo-constants';

/**
 * Environment configuration for the mobile app.
 * All public env vars must be prefixed with EXPO_PUBLIC_ in .env.
 */
const env = {
  /** Supabase project URL */
  SUPABASE_URL: Constants.expoConfig?.extra?.SUPABASE_URL
    ?? process.env.EXPO_PUBLIC_SUPABASE_URL
    ?? '',

  /** Supabase anonymous (public) key — safe for mobile */
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.SUPABASE_ANON_KEY
    ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ?? '',

  /** NestJS API base URL */
  API_URL: Constants.expoConfig?.extra?.API_URL
    ?? process.env.EXPO_PUBLIC_API_URL
    ?? 'http://localhost:3000/api',
} as const;

export default env;
