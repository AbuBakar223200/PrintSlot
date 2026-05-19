import { useQuery } from '@tanstack/react-query';
import { shopService } from '@/features/shops/services/shopService';

export function useShops(search?: string) {
  return useQuery({
    queryKey: ['shops', search ?? ''],
    queryFn: () => shopService.listShops(search),
    staleTime: 30_000,
  });
}
