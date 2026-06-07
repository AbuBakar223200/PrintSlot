# Slice 18 — Mobile: Order History + OrderCard + Cancel Flow

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 16](./16-order-detail-tracking-mobile.md), [Slice 17](./17-order-retrieval-cancel-api.md)
> **Branch:** `ihm/feat/order-history-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Customers need to see their past and active orders, and be able to cancel from either the list or the detail screen. The list is the primary entry point for revisiting orders.

`apps/mobile/app/(customer)/orders/index.tsx` exists as a stub. `apps/mobile/src/components/shared/OrderCard.tsx` exists (may be stub — implement).

## 2. Goal

Paginated order history screen with OrderCard rows, pull-to-refresh, empty state, and cancel flow (wired through `useCancelOrder()` and confirmation modal). Reuse for both list and detail screen.

## 3. Files to Create / Modify

### Modify
- `apps/mobile/src/features/orders/services/orderService.ts` — add `listOrders(page, limit)` and `cancelOrder(orderId)`
- `apps/mobile/src/features/orders/hooks/useOrders.ts` — add `useOrders()` paginated and `useCancelOrder()` mutation
- `apps/mobile/src/components/shared/OrderCard.tsx` — implement if stub
- `apps/mobile/app/(customer)/orders/index.tsx`
- `apps/mobile/app/(customer)/orders/[orderId].tsx` — wire cancel button to `useCancelOrder()` (Slice 16 left this as a TODO)

### Create
- `apps/mobile/src/features/orders/__tests__/useOrders.test.ts` (or extend existing test)
- `apps/mobile/src/components/shared/__tests__/OrderCard.test.tsx`

### Read first
- [Slice 17](./17-order-retrieval-cancel-api.md) §Endpoints
- [`AGENTS.md`](../../AGENTS.md) — FlashList, OrderCard rules

## 4. Implementation Rules

### Service
- `listOrders(page = 1, limit = 20): Promise<{ data: Order[]; pagination: {...} }>`.
- `cancelOrder(orderId): Promise<Order>` — calls `PATCH /orders/:id/cancel`.

### Hooks
- `useOrders()` — use `useInfiniteQuery` or simple `useQuery` (paginated). Use simpler `useQuery` for v1 with manual page state. Stale time 30 s. `refetchInterval: 30_000` for active orders.
- `useCancelOrder()` — `useMutation`. On success invalidate `['orders']` and `['orders', orderId]` and `['wallet', 'balance']`.

### OrderCard
- Props: `{ order: Order, onPress?: () => void }`.
- Layout:
  - Top row: OrderNumber (PS-XXXXX) + StatusBadge.
  - Middle: shop name, file count "{n} files".
  - Bottom: total price (৳) + relative createdAt ("2 hours ago").
- Use `intl-relative-time` or simple custom formatter.

### Screen
- FlashList of OrderCard rows.
- Pull-to-refresh.
- Empty state: "You haven't placed any orders yet." + CTA to browse shops.
- Tapping a card → `router.push('/(customer)/orders/' + order.id)`.
- "New Order" floating button → `router.push('/(customer)/shops')` (or shows shop list).

### Cancel flow
- On order detail screen, tapping "Cancel Order" → open native `<Modal presentationStyle="formSheet">` with confirmation.
- On confirm: call `useCancelOrder().mutate(orderId)`.
- On success: invalidations + show toast "Order cancelled, refund issued" (if WALLET).
- On 400: toast "Order cannot be cancelled in its current state."
- On 403: toast "Not authorised."

## 5. Edge Cases

- **No orders yet:** empty state.
- **Cancel raced with status advance (e.g. staff just moved to PROCESSING):** server returns 400 → friendly error.
- **Network error during fetch:** show error with retry.
- **Customer offline:** show stale cache; mutations blocked with offline message (cross-cutting, deferred but mention).
- **Pagination edge:** if total < limit, no load-more.
- **Mixed status orders in list:** sorted by createdAt DESC.

## 6. Test Cases

### useOrders / useCancelOrder
1. `useOrders()` fetches paginated orders.
2. `useCancelOrder().mutate(id)` calls `PATCH /orders/:id/cancel`.
3. On success, invalidates `['orders']`, `['orders', id]`, `['wallet', 'balance']`.

### OrderCard
4. Renders OrderNumber (PS-XXXXX format).
5. Renders correct StatusBadge.
6. `onPress` callback invoked on press.

### Screen
7. Empty state shown when API returns empty.
8. Pull-to-refresh triggers refetch.
9. Cancel modal opens on tap of cancel button (detail screen).

## 7. Definition of Done

- [ ] `listOrders` and `cancelOrder` services
- [ ] `useOrders` and `useCancelOrder` hooks
- [ ] OrderCard implemented and tested
- [ ] History screen with FlashList + pull-to-refresh + empty state
- [ ] Cancel modal + flow on detail screen
- [ ] On WALLET refund: toast indicates refund
- [ ] Invalidation correct on cancel success
- [ ] Tests pass
- [ ] Branch `ihm/feat/order-history-mobile`; PR title `[Slice 18]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 17](./17-order-retrieval-cancel-api.md) §Endpoints
   - [Slice 16](./16-order-detail-tracking-mobile.md) — for hooking the cancel button
2. **Implement service methods.**
3. **Implement hooks** with TanStack patterns.
4. **Build OrderCard** as a focused, light component (no queries, only props).
5. **Build screen** with FlashList.
6. **Wire cancel button** on detail screen using `useCancelOrder()` and a native Modal.

### Gotchas

- OrderCard must be light — no queries inside the row (per AGENTS.md). Pass primitives from parent.
- Use native `<Modal presentationStyle="formSheet">` for cancel confirmation — not a JS bottom-sheet library.
- Relative time formatting: hoist `Intl.RelativeTimeFormat` to module scope.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Orders
- [`AGENTS.md`](../../AGENTS.md) §FlashList, §"Light list items", §Modals
