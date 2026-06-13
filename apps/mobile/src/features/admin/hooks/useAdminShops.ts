import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminShopService, type UpdateShopStatusInput } from '@/features/admin/services/adminShopService';

/** Query key for the platform shop list. */
export const adminShopsKey = ['admin', 'shops'] as const;

/** All shops in the platform (`GET /shops`). */
export function useAdminShops() {
  return useQuery({
    queryKey: adminShopsKey,
    queryFn: () => adminShopService.listShops(),
    staleTime: 30_000,
  });
}

/**
 * Transition a shop's status (`PATCH /shops/:id/status`). Invalidates the shop
 * list (and the platform analytics, whose counts depend on shop status) on
 * success — TanStack Query is the cache.
 */
export function useUpdateShopStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateShopStatusInput) => adminShopService.updateStatus(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminShopsKey });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] });
    },
  });
}
