import { useQuery } from '@tanstack/react-query';
import { staffJobService } from '@/features/staff/services/staffJobService';
import { staffJobsKey } from '@/features/staff/hooks/useStaffJobs';

/**
 * Active jobs at the owner's shop. Owners see the same queue as staff, so this
 * reuses `staffJobService` (and its query key) — but keyed by the owner-resolved
 * `shopId` rather than `user.shopId`, which owners do not carry. The job detail
 * route still reuses the staff `useStaffJob` hook on tap.
 */
export function useOwnerJobs(shopId: string | null) {
  return useQuery({
    queryKey: staffJobsKey(shopId),
    queryFn: () => staffJobService.listJobs(shopId as string),
    enabled: !!shopId,
    refetchInterval: 30_000,
  });
}
