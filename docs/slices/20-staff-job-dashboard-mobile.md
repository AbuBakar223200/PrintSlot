# Slice 20 — Mobile: Staff Job Dashboard + Status Advance

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 19](./19-order-status-advance-api.md)
> **Branch:** `ihm/feat/staff-job-dashboard-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Staff (and Shop Owners doing staff duties) need a unified job dashboard for their shop. Tapping a row reveals the full print spec; an "Advance" button moves the order through the state machine.

Stub screens exist at `apps/mobile/app/(staff)/jobs/index.tsx` and `[jobId].tsx`.

## 2. Goal

A polished job list (SLOT first, then QUEUE) with full job detail screen including PrintConfig per file, status advance button with optimistic-lock conflict handling, and 30 s fallback polling.

## 3. Files to Create / Modify

### Modify
- `apps/mobile/src/features/orders/services/orderService.ts` — add `advanceStatus(orderId, status, expectedCurrentStatus)`
- `apps/mobile/src/features/orders/hooks/useOrders.ts` — add `useAdvanceStatus()`
- `apps/mobile/app/(staff)/jobs/index.tsx`
- `apps/mobile/app/(staff)/jobs/[jobId].tsx`

### Create
- `apps/mobile/src/features/orders/__tests__/useAdvanceStatus.test.ts`
- `apps/mobile/src/features/orders/components/JobRow.tsx` (or reuse OrderCard if generic enough)

### Read first
- [Slice 19](./19-order-status-advance-api.md) §Flow
- [Slice 17](./17-order-retrieval-cancel-api.md) §`GET /orders` (staff sort order)

## 4. Implementation Rules

### Service
- `advanceStatus(orderId, status, expectedCurrentStatus): Promise<Order>` — `PATCH /orders/:id/status`.

### Hook
- `useAdvanceStatus()` — `useMutation`. On success: invalidate `['orders']` and `['orders', orderId]`. On 409: invalidate immediately and bubble error.

### List screen
- Use the existing `useOrders()` query — the API auto-scopes by role (staff sees own shop).
- Sort already handled server-side (SLOT first, then QUEUE).
- Display as FlashList of `JobRow`:
  - OrderNumber + StatusBadge
  - Customer name (first name + initial)
  - File count "{n} files"
  - Slot time (for SLOT) or createdAt (for QUEUE)
- `refetchInterval: 30_000` so list refreshes if a customer cancels or new orders come in.
- Pull-to-refresh.
- Tap row → `router.push('/(staff)/jobs/' + order.id)`.

### Detail screen
- Show full job spec:
  - OrderNumber large
  - Customer name + phone (Pressable to dial)
  - Payment method + total price (₹ symbol intentionally not used — use `৳` for BDT)
  - Each OrderFile: name, full PrintConfig (colorMode, paperSize, orientation, copies, duplex, pageRange or "All pages", resolvedPages count, subtotal)
- **Advance Status button:**
  - Label per current status: QUEUED→"Start Processing", SCHEDULED→"Start Processing", PROCESSING→"Mark Ready", READY→"Mark Collected".
  - Hidden for COLLECTED or CANCELLED.
  - On tap: call `useAdvanceStatus().mutate({ orderId, status: nextStatus, expectedCurrentStatus: currentStatus })`.
- **409 handling:** show toast "Status was updated by another device. Refreshing..." and invalidate `['orders']`. After refetch, the button label updates automatically.
- **400 (invalid transition):** show toast "Cannot advance — order state is no longer valid."

### Rules
- **No cancel button** — staff cannot cancel.
- **Server is the source of truth for sort and visibility.**
- **Optimistic lock is server-checked, not client-checked** — UI just sends the current status it sees.

## 5. Edge Cases

- **Order disappears between list and detail (cancelled):** detail returns 404 → show empty state + back.
- **Customer cancels while staff has detail open:** socket would notify the customer, not staff. Staff sees stale state until refetch (30 s).
- **No orders today:** empty state.
- **Staff has no shopId (data error):** API returns 403; show error message.
- **Status advance during disconnect:** mutation fails; retry button shown.
- **PROCESSING for >24h** — no special handling; appears as PROCESSING.

## 6. Test Cases

### useAdvanceStatus
1. Calls `PATCH /orders/:id/status` with correct body.
2. On 409, invalidates `['orders']` and bubbles error.
3. On 200, invalidates `['orders']` and `['orders', orderId]`.

### List screen
4. Renders SLOT orders before QUEUE.
5. Pull-to-refresh works.
6. 30 s refetch interval active.

### Detail screen
7. Advance button label matches current status.
8. 409 response shows conflict toast.
9. Button hidden for COLLECTED.

## 7. Definition of Done

- [ ] Service + hook implemented
- [ ] List screen with FlashList + 30 s refetch
- [ ] Detail screen with full PrintConfig per file
- [ ] Advance button label per status
- [ ] 409 handled with toast + invalidation
- [ ] No cancel button (staff role)
- [ ] Tests pass
- [ ] Branch `ihm/feat/staff-job-dashboard-mobile`; PR title `[Slice 20]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 19](./19-order-status-advance-api.md)
   - [Slice 17](./17-order-retrieval-cancel-api.md) §Sort order
2. **Implement service + hook.**
3. **Build list screen** — reuse OrderCard if possible; or build JobRow if details differ enough.
4. **Build detail screen** with full PrintConfig display per file.
5. **Test the optimistic-lock path** by manually triggering 409 from another device or curl.

### Gotchas

- Use `currency: '৳'` formatter (already exists in `apps/mobile/src/utils/formatCurrency.ts`).
- Phone Pressable: `Linking.openURL('tel:' + phone)`.
- Page range display: if `pageRange === null` show "All pages", else show the range.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`PATCH /orders/:id/status`
- [`AGENTS.md`](../../AGENTS.md) §FlashList
