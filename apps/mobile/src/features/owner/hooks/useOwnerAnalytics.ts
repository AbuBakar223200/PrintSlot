import { useQuery } from '@tanstack/react-query';
import { ownerAnalyticsService } from '@/features/owner/services/ownerAnalyticsService';

/** Query key for a shop's analytics. */
export function ownerAnalyticsKey(shopId: string | null | undefined) {
  return ['owner', 'analytics', shopId ?? ''] as const;
}

/** The owner's shop analytics (`GET /shops/:id/analytics`). */
export function useOwnerAnalytics(shopId: string | null) {
  return useQuery({
    queryKey: ownerAnalyticsKey(shopId),
    queryFn: () => ownerAnalyticsService.getAnalytics(shopId as string),
    enabled: !!shopId,
    staleTime: 60_000,
  });
}
