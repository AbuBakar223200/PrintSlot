import { useQuery } from '@tanstack/react-query';
import { adminAnalyticsService } from '@/features/admin/services/adminAnalyticsService';

/** Query key for platform analytics. */
export const adminAnalyticsKey = ['admin', 'analytics'] as const;

/** Platform-wide analytics (`GET /admin/analytics`). */
export function useAdminAnalytics() {
  return useQuery({
    queryKey: adminAnalyticsKey,
    queryFn: () => adminAnalyticsService.getAnalytics(),
    staleTime: 60_000,
  });
}
