import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '@/features/auth/services/authApi';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { RegisterInput, LoginInput, AuthResponse } from '@printslot/shared';

/**
 * TanStack Query hook for GET /auth/me.
 * Only enabled when the user has a valid access token.
 */
export function useMe() {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.getMe,
    enabled: !!accessToken,
    staleTime: 5 * 60 * 1000, // 5 minutes — user data rarely changes
  });
}

/**
 * TanStack Mutation hook for POST /auth/login.
 * On success: stores session in Zustand (persisted to SecureStore).
 */
export function useLogin() {
  const { setSession } = useAuthStore();

  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (data: AuthResponse) => {
      setSession(data.user, data.accessToken);
    },
  });
}

/**
 * TanStack Mutation hook for POST /auth/register.
 * On success: stores session in Zustand (persisted to SecureStore).
 */
export function useRegister() {
  const { setSession } = useAuthStore();

  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (data: AuthResponse) => {
      setSession(data.user, data.accessToken);
    },
  });
}
