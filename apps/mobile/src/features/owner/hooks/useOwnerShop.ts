import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Shop } from '@printslot/shared';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  ownerShopService,
  type CreateShopInput,
  type UpdateShopInput,
} from '@/features/owner/services/ownerShopService';

/** Query key for the owner's own shop. */
export function ownerShopKey(ownerId: string | null | undefined) {
  return ['owner', 'shop', ownerId ?? ''] as const;
}

/** Resolve the signed-in owner's user id. */
export function useOwnerId(): string | null {
  return useAuthStore((s) => s.user?.id ?? null);
}

/** The owner's shop, resolved from the session (`GET /shops`, filtered by ownerId). */
export function useOwnerShop() {
  const ownerId = useOwnerId();

  return useQuery({
    queryKey: ownerShopKey(ownerId),
    queryFn: () => ownerShopService.getMyShop(ownerId as string),
    enabled: !!ownerId,
    staleTime: 30_000,
  });
}

/** Create and request a new shop (PENDING admin approval), then prime the cache. */
export function useCreateShop() {
  const queryClient = useQueryClient();
  const ownerId = useOwnerId();

  return useMutation<Shop, Error, CreateShopInput>({
    mutationFn: (input) => ownerShopService.createShop(input),
    onSuccess: (shop) => {
      queryClient.setQueryData(ownerShopKey(ownerId), shop);
      void queryClient.invalidateQueries({ queryKey: ownerShopKey(ownerId) });
    },
  });
}

/** Persist owner edits to the shop, then refresh the cache. */
export function useUpdateShop() {
  const queryClient = useQueryClient();
  const ownerId = useOwnerId();

  return useMutation<Shop, Error, { shopId: string; input: UpdateShopInput }>({
    mutationFn: ({ shopId, input }) => ownerShopService.updateShop(shopId, input),
    onSuccess: (shop) => {
      queryClient.setQueryData(ownerShopKey(ownerId), shop);
      void queryClient.invalidateQueries({ queryKey: ownerShopKey(ownerId) });
    },
  });
}

/** Resubmit a REJECTED shop for review. */
export function useResubmitShop() {
  const queryClient = useQueryClient();
  const ownerId = useOwnerId();

  return useMutation<Shop, Error, string>({
    mutationFn: (shopId) => ownerShopService.resubmitShop(shopId),
    onSuccess: (shop) => {
      queryClient.setQueryData(ownerShopKey(ownerId), shop);
      void queryClient.invalidateQueries({ queryKey: ownerShopKey(ownerId) });
    },
  });
}
