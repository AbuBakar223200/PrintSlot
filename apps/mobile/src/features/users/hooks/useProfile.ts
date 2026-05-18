import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { usersApi } from '../services/usersApi';
import type { UpdateProfileInput } from '../dto/updateProfile.dto';

/**
 * TanStack Mutation hook for PATCH /users/me.
 *
 * On success: updates the auth store synchronously first (so the header
 * re-renders immediately with the new name), then invalidates the
 * ['auth','me'] query. The auth store's `user` is session state — not a
 * cached server resource — so writing to it from a mutation success is
 * not a Golden Rule #5 violation.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => usersApi.updateProfile(input),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
