import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Order, OrderStatus } from '@printslot/shared';
import { getSocket } from '@/services/socket';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { orderKey } from '@/features/orders/hooks/useOrder';

/** Server → client payload for `order:status_changed`. */
interface StatusChangedPayload {
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
}

/** Server → client payload for `order:queue_updated`. */
interface QueueUpdatedPayload {
  orderId: string;
  position: number;
  etaMins: number;
}

/** Live queue position + ETA pushed over the socket (never part of the REST Order). */
export interface OrderLiveStats {
  position: number | null;
  etaMins: number | null;
}

export interface OrderTracking extends OrderLiveStats {
  /** True while the socket is connected; drives the "reconnecting…" banner. */
  connected: boolean;
}

/**
 * Real-time order tracking over socket.io (`/orders` namespace). On mount it
 * joins the order's room and listens for:
 *
 *  - `order:status_changed` → patches the order's `status` in the TanStack Query
 *    cache so the StatusBadge + Timeline re-render immediately, then invalidates
 *    to reconcile the full row with the server.
 *  - `order:queue_updated`  → returns live `position`/`etaMins` (these are not on
 *    the REST `Order`, so they live in local state, not the query cache).
 *
 * The 30s `refetchInterval` on `useOrder` is the documented fallback when the
 * socket drops. Leaves the room and removes listeners on unmount.
 */
export function useOrderTracking(orderId: string): OrderTracking {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const [live, setLive] = useState<OrderLiveStats>({ position: null, etaMins: null });

  useEffect(() => {
    if (!orderId || !token) {
      return;
    }

    const socket = getSocket(token);

    const join = () => {
      setConnected(true);
      socket.emit('order:join', { orderId });
    };

    const onDisconnect = () => setConnected(false);

    const onStatusChanged = (payload: StatusChangedPayload) => {
      if (payload.orderId !== orderId) {
        return;
      }
      queryClient.setQueryData<Order>(orderKey(orderId), (prev) =>
        prev ? { ...prev, status: payload.status, updatedAt: payload.updatedAt } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: orderKey(orderId) });
    };

    const onQueueUpdated = (payload: QueueUpdatedPayload) => {
      if (payload.orderId !== orderId) {
        return;
      }
      setLive({ position: payload.position, etaMins: payload.etaMins });
    };

    if (socket.connected) {
      join();
    }

    socket.on('connect', join);
    socket.on('disconnect', onDisconnect);
    socket.on('order:status_changed', onStatusChanged);
    socket.on('order:queue_updated', onQueueUpdated);

    return () => {
      socket.emit('order:leave', { orderId });
      socket.off('connect', join);
      socket.off('disconnect', onDisconnect);
      socket.off('order:status_changed', onStatusChanged);
      socket.off('order:queue_updated', onQueueUpdated);
    };
  }, [orderId, token, queryClient]);

  return { connected, ...live };
}
