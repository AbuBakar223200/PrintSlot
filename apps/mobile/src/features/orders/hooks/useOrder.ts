import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Order } from '@printslot/shared';
import { orderService } from '@/features/orders/services/orderService';

/** Query key for a single order detail view. */
export function orderKey(orderId: string) {
  return ['orders', orderId] as const;
}

/**
 * A single order by id (`GET /orders/:id`). WebSocket `order:status_changed` is
 * the primary live signal (see `useOrderSocket`); this 30s poll is the documented
 * fallback (CLAUDE.md). Disabled until an id is present.
 */
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: orderKey(orderId),
    queryFn: () => orderService.getOrder(orderId),
    enabled: !!orderId,
    refetchInterval: 30_000,
  });
}

/**
 * Cancel a QUEUED/SCHEDULED order the customer owns. On success the order detail,
 * the order list and the wallet balance (refund) caches are refreshed so the
 * StatusBadge and timeline re-render to CANCELLED. Errors (e.g. the server now
 * rejects the transition) propagate to the caller to surface.
 */
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation<Order, Error & { statusCode?: number }, string>({
    mutationFn: (orderId) => orderService.cancelOrder(orderId),
    onSuccess: async (order) => {
      queryClient.setQueryData(orderKey(order.id), order);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKey(order.id) }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
      ]);
    },
  });
}
