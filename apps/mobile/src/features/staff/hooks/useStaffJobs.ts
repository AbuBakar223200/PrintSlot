import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  staffJobService,
  type AdvanceStatusInput,
  type StaffJob,
} from '@/features/staff/services/staffJobService';

/** Query key for the active job list at a given shop. */
export function staffJobsKey(shopId: string | null | undefined) {
  return ['staff', 'jobs', shopId ?? ''] as const;
}

/** Query key for a single job. */
export function staffJobKey(orderId: string) {
  return ['staff', 'job', orderId] as const;
}

/** Resolve the signed-in staff member's shop id from the auth session. */
export function useStaffShopId(): string | null {
  return useAuthStore((s) => s.user?.shopId ?? null);
}

/**
 * Active jobs at the staff member's shop. WebSocket `order:status_changed` is the
 * primary live signal; this 30s poll is the documented fallback (see CLAUDE.md).
 */
export function useStaffJobs() {
  const shopId = useStaffShopId();

  return useQuery({
    queryKey: staffJobsKey(shopId),
    queryFn: () => staffJobService.listJobs(shopId as string),
    enabled: !!shopId,
    refetchInterval: 30_000,
  });
}

/** A single job by order id. */
export function useStaffJob(orderId: string) {
  return useQuery({
    queryKey: staffJobKey(orderId),
    queryFn: () => staffJobService.getJob(orderId),
    enabled: !!orderId,
    refetchInterval: 30_000,
  });
}

/**
 * Advance a job's status with the optimistic lock. On success the job cache and
 * the dashboard list are invalidated so the StatusBadge re-renders. A 409 (status
 * already changed) surfaces to the caller, which refetches and lets staff retry.
 */
export function useAdvanceJobStatus() {
  const queryClient = useQueryClient();
  const shopId = useStaffShopId();

  return useMutation<StaffJob, Error & { statusCode?: number }, AdvanceStatusInput>({
    mutationFn: (input) => staffJobService.advanceStatus(input),
    onSuccess: async (job) => {
      queryClient.setQueryData(staffJobKey(job.id), job);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: staffJobKey(job.id) }),
        queryClient.invalidateQueries({ queryKey: staffJobsKey(shopId) }),
      ]);
    },
  });
}
