import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { setTokenGetter } from '@/services/api';
import type { User } from '@printslot/shared';
import { type Role } from '@printslot/shared';

/**
 * Zustand auth store — UI state only (session, user, role).
 *
 * - Persisted to SecureStore (encrypted on device).
 * - Zustand owns auth session; TanStack Query owns server data.
 * - Never store server responses (order lists, shop lists, etc.) here.
 */

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
}

interface AuthActions {
  setSession: (user: User, accessToken: string) => void;
  updateUser: (user: User) => void;
  clearSession: () => void;
  setHydrated: () => void;
}

/**
 * SecureStore adapter for Zustand persist middleware.
 */
const secureStoreStorage = createJSONStorage<AuthState & AuthActions>(() => ({
  getItem: async (name: string) => {
    const value = await SecureStore.getItemAsync(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string) => {
    await SecureStore.deleteItemAsync(name);
  },
}));

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isHydrated: false,

      // Actions
      setSession: (user: User, accessToken: string) => {
        set({ user, accessToken, isAuthenticated: true });
      },

      updateUser: (user: User) => {
        set({ user });
      },

      clearSession: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      setHydrated: () => {
        set({ isHydrated: true });
      },
    }),
    {
      name: 'printslot-auth',
      storage: secureStoreStorage,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }) as AuthState & AuthActions,
      onRehydrateStorage: () => {
        return (state) => {
          state?.setHydrated();
          // Register the token getter so apiFetch can attach JWT
          setTokenGetter(() => state?.accessToken ?? null);
        };
      },
    },
  ),
);

// Register token getter immediately for non-persisted usage
setTokenGetter(() => useAuthStore.getState().accessToken);
