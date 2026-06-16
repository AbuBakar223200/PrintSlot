import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminConfigService, type UpdateConfigInput } from '@/features/admin/services/adminConfigService';

/** Query key for the AppConfig rows. */
export const adminConfigKey = ['admin', 'config'] as const;

/** The editable AppConfig rows (`GET /admin/config`). */
export function useAdminConfig() {
  return useQuery({
    queryKey: adminConfigKey,
    queryFn: () => adminConfigService.listConfig(),
    staleTime: 60_000,
  });
}

/** Update one config value (`PATCH /admin/config/:key`). Invalidates the list. */
export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConfigInput) => adminConfigService.updateConfig(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminConfigKey });
    },
  });
}
