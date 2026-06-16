import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@printslot/shared';
import { ownerStaffService } from '@/features/owner/services/ownerStaffService';

/** Query key for a shop's staff roster. */
export function ownerStaffKey(shopId: string | null | undefined) {
  return ['owner', 'staff', shopId ?? ''] as const;
}

/** The shop's staff members (`GET /shops/:id/staff`). */
export function useOwnerStaff(shopId: string | null) {
  return useQuery({
    queryKey: ownerStaffKey(shopId),
    queryFn: () => ownerStaffService.listStaff(shopId as string),
    enabled: !!shopId,
    staleTime: 30_000,
  });
}

/** Promote a customer to staff at this shop. */
export function useAddStaff() {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { shopId: string; email: string }>({
    mutationFn: ({ shopId, email }) => ownerStaffService.addStaff(shopId, email),
    onSuccess: (_user, { shopId }) => {
      void queryClient.invalidateQueries({ queryKey: ownerStaffKey(shopId) });
    },
  });
}

/** Demote a staff member back to a customer. */
export function useRemoveStaff() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, { shopId: string; userId: string }>({
    mutationFn: ({ shopId, userId }) => ownerStaffService.removeStaff(shopId, userId),
    onSuccess: (_result, { shopId }) => {
      void queryClient.invalidateQueries({ queryKey: ownerStaffKey(shopId) });
    },
  });
}
