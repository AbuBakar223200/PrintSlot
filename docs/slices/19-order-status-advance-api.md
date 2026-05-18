# Slice 19 — API: Order Status Advance + Optimistic Lock

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 13](./13-order-creation-api.md), [Slice 15](./15-orders-gateway-eta-api.md), [Slice 23](./23-notifications-service-api.md)
> **Branch:** `ihm/feat/order-status-advance-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

Staff and Shop Owners advance order status as they print. The endpoint must use an optimistic lock to prevent two staff from double-advancing the same order simultaneously. Status changes emit gateway events (Slice 15) and trigger notifications (Slice 23).

## 2. Goal

`PATCH /orders/:id/status` endpoint with strict transition rules, optimistic lock via `expectedCurrentStatus`, role + ownership guard, automatic timestamps, gateway emit, and notifications.

## 3. Files to Create / Modify

### Modify
- `apps/api/src/modules/orders/orders.service.ts` — add `advanceStatus()`
- `apps/api/src/modules/orders/orders.controller.ts` — wire route
- `apps/api/src/modules/orders/dto/update-order-status.dto.ts` — verify Zod schema or create

### Create
- `apps/api/src/modules/orders/__tests__/orders-advance.spec.ts`

### Read first
- [`CONTEXT.md`](../../CONTEXT.md) §"Order State Machine", §"Optimistic lock"
- [Slice 15](./15-orders-gateway-eta-api.md) §emit helpers
- [Slice 23](./23-notifications-service-api.md) §notifyOrderAccepted, §notifyOrderReady

## 4. Implementation Rules

### DTO
```ts
UpdateOrderStatusDto = {
  status: OrderStatus,                   // target status
  expectedCurrentStatus: OrderStatus,    // current status as client knows it
}
```

### Endpoint
- `PATCH /orders/:id/status` — STAFF or SHOP_OWNER.

### Valid transitions

| From | To |
|---|---|
| QUEUED | PROCESSING |
| SCHEDULED | PROCESSING |
| PROCESSING | READY |
| READY | COLLECTED |

Anything else → 400.

### Flow

1. Load order. 404 if not found.
2. Role check: `STAFF` or `SHOP_OWNER` AND `order.shopId === currentUser.shopId`. Else 403.
3. Optimistic lock: if `order.status !== expectedCurrentStatus` → 409 "Order status has changed, please refresh."
4. Transition validity check: if `(order.status, status)` not in valid map → 400.
5. Update order:
   - `status = target`
   - if target = `PROCESSING`: `processingStartedAt = now()`
   - if target = `READY`: `readyAt = now()`
6. After commit:
   - `ordersGateway.emitStatusChanged(orderId, status, updatedAt)`.
   - If target = `PROCESSING`: `notificationsService.notifyOrderAccepted(order, customer)`.
   - If target = `READY`: `notificationsService.notifyOrderReady(order, customer)`.
   - Queue position change? Trigger `ordersGateway.emitQueueUpdated` for all orders behind this one in the same shop+date queue. (Note: cheap implementation — emit only for the changed order. A robust implementation refetches positions for all behind. For v1, emit only for the changed order.)
7. Return updated order.

### Rules
- **Optimistic lock check is BEFORE transition validation** — gives the client the right error reason.
- **Timestamps stamped server-side** — never accept from body.
- **Role + shop ownership both checked.**
- **No emit/notification inside transaction** — after commit only.

## 5. Edge Cases

- **Two staff tap advance simultaneously:** first request wins; second returns 409.
- **Skip step (QUEUED → READY):** 400.
- **Advance CANCELLED order:** 400 (no valid transition from CANCELLED).
- **Staff for shop A tries to advance shop B's order:** 403.
- **Customer tries to advance:** 403.
- **Body missing `expectedCurrentStatus`:** 400 (Zod).
- **Body with `processingStartedAt`:** 400 (Zod `.strict()`).
- **Advance to COLLECTED:** stamps no extra timestamp (only `updatedAt`).

## 6. Test Cases

### Service
1. QUEUED → PROCESSING: status updated, `processingStartedAt` set.
2. PROCESSING → READY: `readyAt` set.
3. READY → COLLECTED: updates `updatedAt` only.
4. QUEUED → READY: 400.
5. PROCESSING → QUEUED: 400 (backward).
6. Optimistic lock mismatch: 409.
7. Different shop: 403.
8. CUSTOMER role: 403.
9. Gateway emit called with correct args.
10. Notification fired for PROCESSING (ORDER_ACCEPTED) and READY (ORDER_READY); not for COLLECTED.

### Controller
11. PATCH /orders/:id/status without JWT: 401.
12. PATCH with role CUSTOMER: 403.
13. PATCH with body missing `expectedCurrentStatus`: 400.

## 7. Definition of Done

- [ ] DTO with Zod `.strict()`
- [ ] `advanceStatus` flow correctly enforced
- [ ] Optimistic lock returns 409 with the correct order
- [ ] Timestamps stamped on PROCESSING and READY
- [ ] Notifications fired on PROCESSING and READY
- [ ] Gateway emit fired
- [ ] Tests pass — all 13 cases
- [ ] Branch `ihm/feat/order-status-advance-api`; PR title `[Slice 19]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §Order State Machine
   - [Slice 15](./15-orders-gateway-eta-api.md) §emit helpers
2. **Write the service spec first** covering all 10 cases.
3. **Implement `advanceStatus`** with the explicit step order (load → role → lock → transition → update → emit → notify).
4. **Use a `VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]>` map** for the transition matrix to keep the logic tight.

### Gotchas

- Order of checks matters for the right error code: 404 → 403 → 409 → 400.
- `expectedCurrentStatus` is a contract with the client — the client always sends the status it currently sees.
- Notifications and gateway emit happen sequentially, both AFTER the DB commit.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §"Order State Machine", §"Optimistic lock"
- [`docs/05-api-contract.md`](../05-api-contract.md) §`PATCH /orders/:id/status`
