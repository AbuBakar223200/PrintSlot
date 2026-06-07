import { useAuthStore } from '../store/useAuthStore';

/**
 * Auth session Interface for non-React modules.
 *
 * The Zustand store remains the implementation detail. Callers that only need
 * request authorization use this seam instead of depending on store hydration
 * or registration side effects.
 */
export const authSession = {
  getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  },

  isHydrated(): boolean {
    return useAuthStore.getState().isHydrated;
  },

  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },
};
