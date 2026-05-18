# Slice 17 — API: Order Retrieval + Cancellation

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 13](./13-order-creation-api.md), [Slice 21](./21-wallet-service-api.md)
> **Branch:** `ihm/feat/order-retrieval-cancel-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

Customers list their orders, view detail, and cancel. Staff/Owner list their shop's orders. Cancellation is atomic: status update + wallet refund (if WALLET) + slot capacity decrement (if SLOT) happen in one Prisma transaction.

Builds on order creation ([Slice 13](./13-order-creation-api.md)) and wallet service ([Slice 21](./21-wallet-service-api.md)).

## 2. Goal

Three working endpoints: `GET /orders` (role-scoped list), `GET /orders/:id` (single with ETA + queuePosition), `PATCH /orders/:id/cancel` (atomic cancel with refund + slot decrement). Notification dispatch on cancel.

## 3. Files to Create / Modify

### Modify
- `apps/api/src/modules/orders/orders.service.ts` — add `listOrders()`, `getOrderById()`, `cancelOrder()`
- `apps/api/src/modules/orders/orders.controller.ts` — wire the three routes

### Create
- `apps/api/src/modules/orders/__tests__/orders-cancel.spec.ts`
- `apps/api/src/modules/orders/__tests__/orders-list.spec.ts`
- `apps/api/src/modules/orders/__tests__/orders.controller.spec.ts` (or extend if exists)

### Read first
- [`docs/05-api-contract.md`](../05-api-contract.md) §`GET /orders`, §`GET /orders/:id`, §`PATCH /orders/:id/cancel`
- [`CONTEXT.md`](../../CONTEXT.md) §"Cancel window", §"Cancel WALLET refund", §"Order State Machine"

## 4. Implementation Rules

### Endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/orders` | Authenticated | Scoped by role: CUSTOMER own; STAFF/OWNER own shop. Paginated. |
| GET | `/orders/:id` | Authenticated | Role guard same as above. Includes `queuePosition`, `etaMins`. |
| PATCH | `/orders/:id/cancel` | CUSTOMER | Own order only. Status must be QUEUED or SCHEDULED. Atomic refund + slot decrement. |

### Scoping rules
- CUSTOMER: `where: { customerId: currentUser.id }`.
- STAFF / SHOP_OWNER: `where: { shopId: currentUser.shopId }`. Reject if `currentUser.shopId` is null.
- PLATFORM_ADMIN: out of scope here (admin has separate endpoints).

### Sort order
- SLOT orders first, by `slot.date` ASC then `slot.template.startTime` ASC.
- Then QUEUE orders, by `createdAt` ASC.
- This applies to `GET /orders` for staff/owner. Customer can also benefit from this sort but is not required to use it (CUSTOMER list can be `createdAt DESC` for "most recent first" — chose: **createdAt DESC** for customer; **SLOT-first sort** for staff/owner).

### Pagination
- Query params: `page` (default 1), `limit` (default 20, max 100).
- Return `{ data: Order[], pagination: { page, limit, total } }`.

### `getOrderById`
- Returns Order with all OrderFiles, the Shop, and computed `queuePosition` + `etaMins` (use helpers from [Slice 15](./15-orders-gateway-eta-api.md)).
- `queuePosition` is only meaningful when status is QUEUED or PROCESSING; otherwise omit or set to null.

### `cancelOrder` (atomic)

1. Load order; 404 if not found.
2. Role check: must be `order.customerId === currentUser.id` else 403.
3. Status check: must be in {QUEUED, SCHEDULED}; else 400 "Cannot cancel order in this status."
4. Open `prisma.$transaction`:
   - Update `order.status = CANCELLED`, `cancelledAt = now()`.
   - If `paymentMethod === 'WALLET'`: call `walletService.credit(customerId, totalPrice, 'ORDER_REFUND', orderId, tx)`.
   - If `pickupMode === 'SLOT'`: `prisma.shopSlot.update({ where: { id: slotId }, data: { currentCount: { decrement: 1 } } })`.
5. After commit:
   - `notificationsService.notifyOrderCancelled(order, customer, staffAndOwner[])`.
   - `ordersGateway.emitStatusChanged(orderId, 'CANCELLED', updatedAt)`.
6. Return updated Order.

### Rules
- **Atomic.** Every mutation inside one transaction; on any throw, all roll back.
- **`currentCount` never < 0** — Prisma `decrement` doesn't check; add a `where: { currentCount: { gte: 1 } }` guard, but in practice this is fine (rejected on order create if 0).
- **Notification + gateway emit must be after commit.**

## 5. Edge Cases

- **Order already cancelled:** 400 "Already cancelled."
- **Order in PROCESSING:** 400.
- **CUSTOMER cancels another customer's order:** 403.
- **STAFF cancels:** 403 (only customer can cancel).
- **CASH order cancelled:** no wallet credit; only status + slot decrement.
- **QUEUE order cancel:** slot decrement still happens (queue orders also have slotId — they're attached to the active slot).
- **Refund credit fails (impossible — credit always succeeds):** transaction rolls back. Defensive: log and re-raise.
- **Pagination with `limit > 100`:** clamp to 100.
- **Empty page (page beyond available):** return `data: []`.
- **Staff calls GET /orders with no `shopId`:** 403 "Staff must belong to a shop."

## 6. Test Cases

### Service
1. `listOrders` as CUSTOMER returns only that customer's orders.
2. `listOrders` as STAFF returns only that shop's orders.
3. `listOrders` sort: SLOT before QUEUE (for staff).
4. `getOrderById` returns 404 for nonexistent ID.
5. `getOrderById` returns 403 for other customer's order.
6. `getOrderById` includes `queuePosition` and `etaMins` for QUEUED order.
7. `cancelOrder` of QUEUED WALLET order: status CANCELLED, refund inserted, slot decremented, all atomic.
8. `cancelOrder` of QUEUED CASH order: status CANCELLED, no wallet row, slot decremented.
9. `cancelOrder` of PROCESSING: 400.
10. `cancelOrder` of another customer's order: 403.
11. Notification dispatched after commit.
12. Gateway emit fired after commit.

### Controller
13. GET /orders without JWT → 401.
14. GET /orders with no shopId as STAFF → 403.
15. PATCH /orders/:id/cancel returns full updated Order.

## 7. Definition of Done

- [ ] Three endpoints implemented with role-scoped behaviour
- [ ] Cancellation atomic (refund + slot decrement + status in one tx)
- [ ] Notification + gateway emit after commit
- [ ] Pagination implemented
- [ ] Sort order for staff/owner: SLOT first
- [ ] Tests pass — all 15 cases
- [ ] Branch `ihm/feat/order-retrieval-cancel-api`; PR title `[Slice 17]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`docs/05-api-contract.md`](../05-api-contract.md) §Orders endpoints
   - [`CONTEXT.md`](../../CONTEXT.md) §"Cancel window", §"Order State Machine"
2. **Write tests first** for cancel scenarios (most complex).
3. **Implement `cancelOrder`** with `prisma.$transaction` — refund and slot decrement happen with the right `tx` arg passed to `walletService.credit`.
4. **Implement `getOrderById`** with helpers from Slice 15.
5. **Implement `listOrders`** with role-based scoping and SLOT-first sort.
6. **Wire controller routes.**
7. **Run** `npm test -- --testPathPattern=orders` and verify all green.

### Gotchas

- The slot decrement must use `decrement: 1` not direct assignment.
- Notification dispatch must happen AFTER `prisma.$transaction` resolves — never inside, or push failures roll back the cancel.
- Be careful with role-based scoping: a STAFF without `shopId` should never see any orders.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Orders
- [`CONTEXT.md`](../../CONTEXT.md) §"Cancel window", §"Order State Machine"
