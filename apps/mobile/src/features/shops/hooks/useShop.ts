import { useQuery } from '@tanstack/react-query';
import { shopService } from '@/features/shops/services/shopService';

export function useShop(shopId: string) {
  return useQuery({
    queryKey: ['shops', shopId],
    queryFn: () => shopService.getShop(shopId),
    staleTime: 60_000,
    enabled: !!shopId,
  });
}

export function useActiveSlot(shopId: string) {
  return useQuery({
    queryKey: ['shops', shopId, 'active-slot'],
    queryFn: () => shopService.getActiveSlot(shopId),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: !!shopId,
  });
}
