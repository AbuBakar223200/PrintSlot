import { useQuery } from '@tanstack/react-query';
import { slotsApi } from '@/features/slots/services/slotsApi';

export function useShopSlots(shopId: string, date: string) {
  return useQuery({
    queryKey: ['shops', shopId, 'slots', date],
    queryFn: () => slotsApi.getOpenSlots(shopId, date),
    staleTime: 30_000,
    enabled: shopId.length > 0 && date.length > 0,
  });
}
