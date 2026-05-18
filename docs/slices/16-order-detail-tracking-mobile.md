# Slice 16 — Mobile: Order Detail + Real-Time Tracking + StatusBadge

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 15](./15-orders-gateway-eta-api.md)
> **Branch:** `ihm/feat/order-detail-tracking-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

After placing an order ([Slice 14](./14-order-creation-wizard-mobile.md)) the customer lands here. The screen is also navigated to from order history ([Slice 18](./18-order-history-cancel-mobile.md)). Real-time updates come from socket.io ([Slice 15](./15-orders-gateway-eta-api.md)) with 30 s polling as a fallback.

`apps/mobile/app/(customer)/orders/[orderId].tsx` exists as a stub. `apps/mobile/src/features/orders/hooks/useOrderTracking.ts` exists as a stub. `apps/mobile/src/services/socket.ts` exists with socket.io client setup (verify).

## 2. Goal

A polished order detail screen that:
- Fetches the order via TanStack Query with 30 s `refetchInterval`.
- Joins socket.io room on mount, leaves on unmount.
- Updates TanStack cache directly from `order:status_changed` and `order:queue_updated` events.
- Renders OrderNumber, StatusBadge, queue position + ETA, OrderFiles with PrintConfig, payment + total, and "Cancel Order" button when applicable.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/src/features/orders/services/orderService.ts` — add `getOrder(orderId)`
- `apps/mobile/src/features/orders/hooks/useOrder.ts` — implement
- `apps/mobile/src/features/orders/hooks/useOrderTracking.ts` — implement
- `apps/mobile/src/services/socket.ts` — verify singleton client; create if stub
- `apps/mobile/src/components/shared/StatusBadge.tsx` — implement if stub
- `apps/mobile/app/(customer)/orders/[orderId].tsx`

### Create
- `apps/mobile/src/features/orders/__tests__/useOrderTracking.test.ts`
- `apps/mobile/src/components/shared/__tests__/StatusBadge.test.tsx`

### Read first
- [Slice 15](./15-orders-gateway-eta-api.md) §Events
- [`CONTEXT.md`](../../CONTEXT.md) §WebSocket Events, §"Real-time"
- [`AGENTS.md`](../../AGENTS.md) §"Real-time WebSocket"

## 4. Implementation Rules

### Service
- `getOrder(orderId): Promise<Order>` — calls `GET /orders/:id`. Returns the shared `Order` with embedded `OrderFile[]` and computed `queuePosition`, `etaMins`.

### `useOrder` hook
- `useQuery({ queryKey: ['orders', orderId], queryFn: () => getOrder(orderId), refetchInterval: 30_000 })`.

### `useOrderTracking` hook
- On mount:
  - Connect socket if not connected (`socket.connect()`).
  - `socket.emit('order:join', { orderId })`.
  - Subscribe to `order:status_changed`: update cache via `queryClient.setQueryData(['orders', orderId], (prev) => ({ ...prev, status, updatedAt }))`.
  - Subscribe to `order:queue_updated`: update `queuePosition` and `etaMins` in cache.
  - Subscribe to `connect` and `disconnect` to manage banner state via Zustand (or local state).
- On unmount:
  - `socket.emit('order:leave', { orderId })`.
  - `socket.off('order:status_changed', handler)` etc.

### Socket singleton
```ts
// apps/mobile/src/services/socket.ts
import { io, Socket } from 'socket.io-client';
import env from '@/config/env';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

let socket: Socket | null = null;
export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${env.API_URL}/orders`, {
      autoConnect: false,
      auth: () => ({ token: useAuthStore.getState().accessToken }),
    });
  }
  return socket;
}
```

### StatusBadge
- Props: `{ status: OrderStatus }`.
- Renders coloured pill with localised label.
- Colours: `QUEUED=#3B82F6`, `SCHEDULED=#A855F7`, `PROCESSING=#F59E0B`, `READY=#10B981`, `COLLECTED=#64748B`, `CANCELLED=#EF4444`.

### Screen layout
- **Header card:** OrderNumber (`PS-XXXXX`, large), StatusBadge.
- **Status-specific section:**
  - `QUEUED`/`PROCESSING`: queue position + ETA "Position 3 • ~12 min."
  - `SCHEDULED`: slot date + time.
  - `READY`: pickup instructions.
  - `COLLECTED`: completed timestamp.
  - `CANCELLED`: cancelled timestamp + reason if any.
- **Shop card:** name + address.
- **Files list:** each OrderFile with name, PrintConfig summary, subtotal.
- **Payment + total:** payment method + total price (৳).
- **Cancel Order button:** visible only when `status IN ('QUEUED', 'SCHEDULED')`. Opens confirmation modal. Calls `PATCH /orders/:id/cancel` (to be implemented in [Slice 17](./17-order-retrieval-cancel-api.md)). On success: invalidate `['orders', orderId]` and `['orders']`.
- **Disconnect banner:** shown when socket disconnected. Subtle, "Live updates paused — reconnecting..."

### Rules
- **Never store server data in Zustand** — TanStack Query is the cache.
- **OrderNumber, not UUID.** UUIDs only in API URLs.
- **Cleanup on unmount.** Mandatory `socket.off` and `order:leave`.
- **Reconnect logic:** socket.io auto-reconnects; on `connect` event, re-emit `order:join`.

## 5. Edge Cases

- **Order not found (404):** show "Order not found" + Back button.
- **Permission denied (403):** show "Not authorised" + Back button. (Customer viewing someone else's order.)
- **Socket fails to connect (network):** banner shown; polling fallback keeps screen fresh.
- **Order cancelled while viewing:** status updates via socket → button disappears, banner shows "Cancelled".
- **App backgrounded:** socket disconnects after a few seconds (system); reconnects when foregrounded. `order:join` re-emitted on reconnect.
- **Multiple sockets for same user (multi-device):** all receive emits.
- **`processingStartedAt` is null** (no timestamps yet) — fine; only display when present.

## 6. Test Cases

### `useOrderTracking`
1. On mount, calls `socket.emit('order:join', { orderId })`.
2. On unmount, calls `socket.emit('order:leave', ...)` and unsubscribes handlers.
3. `order:status_changed` event updates the query cache's `status` field.
4. `order:queue_updated` event updates the cache's `queuePosition` and `etaMins`.

### StatusBadge
5. Renders correct colour for each `OrderStatus`.

### Screen
6. OrderNumber displayed as `PS-XXXXX`.
7. Cancel button hidden for `PROCESSING` order.
8. Cancel button visible for `QUEUED` order.

## 7. Definition of Done

- [ ] `useOrder` and `useOrderTracking` hooks implemented
- [ ] Socket client singleton in `services/socket.ts`
- [ ] `StatusBadge` with correct colours per status
- [ ] Screen renders all status-specific sections
- [ ] Cancel flow wired (depends on [Slice 17](./17-order-retrieval-cancel-api.md))
- [ ] Cleanup on unmount (no leaked listeners or sockets)
- [ ] Disconnect banner shown when socket offline
- [ ] Tests pass
- [ ] Branch `ihm/feat/order-detail-tracking-mobile`; PR title `[Slice 16]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 15](./15-orders-gateway-eta-api.md) §Events
   - [`CONTEXT.md`](../../CONTEXT.md) §"WebSocket Events", §"Real-time"
2. **Install `socket.io-client`** if not present.
3. **Implement `socket.ts` singleton.** Pass token via `auth()` callback so it reads fresh token on each connection.
4. **Implement `useOrder`** — simple useQuery.
5. **Implement `useOrderTracking`** — careful cleanup, handler refs.
6. **Build StatusBadge** as a tiny isolated component.
7. **Build screen** — match design language of existing screens.
8. **Smoke test** with a second client (staff acting via API): observe status change reflected on customer screen without refresh.

### Gotchas

- Always store event handlers in `useRef` or memoise — passing inline arrow to `.on()`/`.off()` won't unbind correctly.
- React StrictMode runs effects twice in dev — make sure `order:join` is idempotent (it is — joining the same room twice is fine).
- `socket.connect()` and `socket.disconnect()` on app foreground/background events (`AppState`) — defer this to a later refinement; auto-reconnect is enough for v1.
- Cache update via `queryClient.setQueryData(['orders', orderId], updater)` — the updater must return a NEW object, not mutate.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §"WebSocket Events", §"Real-time"
- [`AGENTS.md`](../../AGENTS.md) §"PrintSlot-specific mobile rules — Real-time"
- [`docs/05-api-contract.md`](../05-api-contract.md) §`GET /orders/:id`
- [socket.io client docs](https://socket.io/docs/v4/client-api/)
