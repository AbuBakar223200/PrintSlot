# Slice 13 — API: POST /orders (Atomic Order Creation)

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 07](./07-slots-module-api.md), [Slice 12](./12-order-pricing-api.md), [Slice 21](./21-wallet-service-api.md), [Slice 23](./23-notifications-service-api.md)
> **Branch:** `ihm/feat/order-creation-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

This is the most critical endpoint in the platform. It must atomically: validate inputs, calculate price (Slice 12), assign or validate slot (Slice 7), debit wallet if applicable (Slice 21), insert Order + OrderFiles, increment slot capacity, generate orderNumber from the Postgres sequence, then fire notifications and move Cloudinary files. Any failure mid-flight must leave the database in a consistent state.

## 2. Goal

`POST /orders` creates an Order with atomic wallet debit and slot capacity increment. Returns the full Order with OrderFiles. Fires `ORDER_PLACED` (customer) and `NEW_ORDER` (staff + owner) notifications.

## 3. Files to Create / Modify

### Modify
- `apps/api/src/modules/orders/orders.service.ts` — add `createOrder()` + private helpers
- `apps/api/src/modules/orders/orders.controller.ts` — add `POST /orders`
- `apps/api/src/modules/orders/orders.module.ts` — `imports: [SlotsModule, WalletModule, NotificationsModule]`
- `apps/api/src/modules/orders/dto/create-order.dto.ts` — full schema if not done

### Create
- `apps/api/src/modules/orders/__tests__/orders-create.spec.ts` — focused test file for create flow

### Read first
- [Slice 12](./12-order-pricing-api.md) §calculatePrice
- [Slice 07](./07-slots-module-api.md) §getActiveSlot
- [Slice 21](./21-wallet-service-api.md) §debit
- [Slice 23](./23-notifications-service-api.md) §notifyOrderPlaced, §notifyNewOrder
- [`docs/04-data-model.md`](../04-data-model.md) §Order, §OrderFile, §"OrderNumber generation"
- [`CONTEXT.md`](../../CONTEXT.md) §"Queue mode requires an active slot", §"slotId NOT NULL on all orders"

## 4. Implementation Rules

### DTO

```ts
CreateOrderDto = {
  shopId: string (uuid),
  pickupMode: 'QUEUE' | 'SLOT',
  slotId?: string (uuid),    // required if SLOT
  paymentMethod: 'WALLET' | 'CASH',
  files: Array<{
    fileUrl: string,
    fileName: string,
    mimeType: string,
    fileSize: int,
    detectedPages: int (≥ 1),
    colorMode: 'COLOR' | 'BW',
    paperSize: 'A4' | 'A3' | 'LETTER',
    orientation: 'PORTRAIT' | 'LANDSCAPE',
    copies: int (≥ 1),
    duplex: bool,
    pageRange?: string | null,
  }>  // 1..10
}
```

Server **never** accepts `totalPrice`, `subtotalPrice`, `resolvedPages`, `colorPages`, `bwPages` — Zod `.strict()`.

### Endpoint
- `POST /orders` — CUSTOMER role.
- Returns full Order with OrderFiles (mapped to shared types).

### Creation flow (in order)

1. **Validate file count** 1–10 (handled by DTO).
2. **Load shop.** 404 if not found. 400 if `status !== 'ACTIVE'`.
3. **Resolve slot:**
   - If `pickupMode === 'QUEUE'`: call `SlotsService.getActiveSlot(shopId)`. If `null`, 400 "No active slot — Print Now unavailable".
   - If `pickupMode === 'SLOT'`: validate `slotId` provided; load slot; verify `slot.shopId === shopId`; verify date within today→today+3 (BST); verify `isOpen` and `currentCount < maxOrders` (409 if full).
4. **Calculate price** via `calculatePrice(files, shop)`.
5. **Generate orderNumber:** `await prisma.$queryRawUnsafe<{ nextval: bigint }[]>(\`SELECT nextval('order_number_seq')\`)`. Format as `PS-${n.toString().padStart(5, '0')}`.
6. **Open Prisma transaction (`prisma.$transaction`):**
   - If `paymentMethod === 'WALLET'`:
     - Call `walletService.debit(customerId, totalPrice, orderId, tx)` — this re-checks balance inside `tx` and throws 402 if insufficient.
   - Insert `Order` row with all calculated fields.
   - Insert all `OrderFile` rows.
   - Increment `ShopSlot.currentCount` via `prisma.shopSlot.update({ where: { id: slotId }, data: { currentCount: { increment: 1 } } })`. Use the unique constraint to detect race — if a concurrent transaction filled the slot, throw 409.
7. **After commit:**
   - Call `notificationsService.notifyOrderPlaced(order, customer)`.
   - Call `notificationsService.notifyNewOrder(order, staffAndOwner[])`.
   - Fire-and-forget Cloudinary move from `pending/` to `orders/{orderId}/`. Do not block. Errors logged only.
8. **Return** the Order with OrderFiles.

### Atomic considerations
- **Slot capacity must be checked WITHIN the transaction.** Use `update` with optimistic check or `findUnique` + `update` in the tx.
- **Wallet debit must be inside the same transaction.** `WalletService.debit` accepts a `tx` arg.
- **Order + OrderFiles must be inserted in the same transaction.** Use `prisma.order.create({ data: { ..., orderFiles: { create: [...] } } })`.

### orderNumber details
- Generated **inside** the transaction so the sequence does not advance on rollback (though gaps are acceptable per CONTEXT.md).
- Format: `PS-` + zero-padded 5 digits.

## 5. Edge Cases

- **Shop inactive between preview and submit:** 400.
- **Slot fills between preview and submit:** capacity check inside tx returns 409.
- **Wallet balance drops between preview and submit:** debit inside tx throws 402.
- **Concurrent submission (last wallet balance, last slot seat):** transaction isolation ensures only one succeeds.
- **`pickupMode = SLOT` with `slotId` for a different shop:** 400.
- **`slotId` references a slot more than 3 days ahead:** 400.
- **`detectedPages = 0`:** 400 (caught by DTO `min`).
- **Page range out of bounds:** 400 (caught by `calculatePrice`).
- **All files have 1 page each, max 10 files** — valid; no upper page total cap in v1.
- **Cloudinary move fails** — order still created; logged. Files still accessible via original `pending/` URL.
- **Notification dispatch fails** — order still created; failure logged. DB Notification row always created.

## 6. Test Cases

### Service (mocked Prisma, mocked Slots, Wallet, Notifications)

1. QUEUE order with active slot, WALLET payment, sufficient balance → Order created, slot count incremented, debit row inserted, notifications fired.
2. QUEUE order with no active slot → throws 400.
3. SLOT order with slot 4 days ahead → throws 400.
4. SLOT order with full slot → throws 409.
5. WALLET order with insufficient balance → throws 402; no Order, no debit row, no slot increment.
6. CASH order → Order created without debit row.
7. orderNumber matches format `PS-\d{5}`.
8. Cloudinary move is called fire-and-forget (mock spy fires after commit).
9. Both `notifyOrderPlaced` and `notifyNewOrder` are called once each.

### Controller
10. Without JWT → 401.
11. With `STAFF` role → 403.
12. Request with `totalPrice` in body → 400.
13. Request with 11 files → 400.
14. Response envelope `{ data, message, statusCode }`.

## 7. Definition of Done

- [ ] `createOrder()` implements the 8-step flow
- [ ] Wallet debit, slot increment, Order insert all in one Prisma transaction
- [ ] orderNumber generated from `order_number_seq` and formatted
- [ ] `ORDER_PLACED` + `NEW_ORDER` fired after commit
- [ ] Cloudinary move is non-blocking
- [ ] Tests pass — all 14 cases
- [ ] No `totalPrice` accepted from body
- [ ] Branch `ihm/feat/order-creation-api`; PR title `[Slice 13]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - All listed dependency slices' §Implementation Rules
   - [`CONTEXT.md`](../../CONTEXT.md) §"Queue mode", §"slotId NOT NULL", §"Order State Machine"
   - [`docs/04-data-model.md`](../04-data-model.md) §Order, §OrderFile, §"Queue ETA Algorithm" (for colorPages/bwPages sums)
2. **Inject `SlotsService`, `WalletService`, `NotificationsService`** into `OrdersService` constructor.
3. **Write the service spec first** (TDD), covering all 9 service cases.
4. **Implement `createOrder`** step-by-step, matching the flow exactly.
5. **Use `prisma.$transaction(async (tx) => { ... })`** as the outer wrapper for steps 6.
6. **Test concurrent debit/slot scenarios** locally if possible; rely on unit tests + manual concurrency review for v1.

### Gotchas

- `prisma.$queryRawUnsafe` returns `[{ nextval: bigint }]`. Convert with `Number(...)` before formatting.
- `tx.shopSlot.update` with `increment` is atomic at the DB level but you must check the resulting `currentCount` against `maxOrders` after the update (or use `where: { id, currentCount: { lt: maxOrders } }` to fail-fast).
- Cloudinary move requires the existing `publicId` of each pending file; derive from the upload URL.
- Notifications must be dispatched **outside** the transaction (after commit) — never inside, or push failures will roll back the order.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §Order State Machine, §"slotId NOT NULL"
- [`docs/04-data-model.md`](../04-data-model.md) §Order, §"OrderNumber"
- [`docs/05-api-contract.md`](../05-api-contract.md) §`POST /orders`
