# PrintSlot — Agent Context

Read this before touching any file.

## What This App Does

PrintSlot digitizes the print shop experience. Customers upload documents, configure print settings per file, pay via wallet or cash, and either join a live queue or book a time slot. Staff manage jobs through status stages. Shop Owners run their shop and staff. Platform Admin governs the platform.

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native (Expo Router) — managed workflow, no ejecting |
| API | NestJS |
| DB | Supabase PostgreSQL via Prisma ORM |
| Auth | Supabase Auth (JWT) |
| Files | Cloudinary (`printslot/pending/` TTL 24h → `printslot/orders/{orderId}/`) |
| Push | Expo Notifications (fan-out to all UserDevice rows per user) |
| Realtime | socket.io (`OrdersGateway`) |
| Monorepo | Turborepo + npm workspaces |
| i18n | i18next + react-i18next (EN + BN) |
| PDF/Share | expo-print + expo-sharing |
| Deployment | Render (API) + Expo EAS (mobile) |

---

## Golden Rules

1. **Types live in `packages/shared/src/types/` only.**
   Both apps import from `@printslot/shared`. Never duplicate types.

2. **`@prisma/client` is ONLY imported inside `apps/api/src/`.**
   Mobile NEVER touches Prisma. API maps Prisma models → shared types before returning.

3. **TDD: Write the test first, then the implementation.**
   Test files live in `__tests__/` next to source files.

4. **Feature = vertical slice.**
   One feature spans mobile feature folder + API module folder.
   Do not create cross-feature imports (except `components/shared/`, `components/ui/`, `packages/shared`).

5. **Zustand = local/UI state. TanStack Query = server/remote state.**
   Never store server responses in Zustand manually — let TanStack Query cache them.

6. **Expo Router handles navigation.**
   Never use `useNavigation()` directly — use typed `router.push()` from expo-router.

7. **Price is always server-calculated.**
   Never accept `totalPrice`, `subtotalPrice`, or `resolvedPages` from client body.

8. **Push tokens live in `UserDevice`, never on `User`.**
   Dispatch fans out to all `UserDevice` rows for a user. Delete row on `DeviceNotRegistered`.

---

## Naming Conventions

- Files: `camelCase.ts` (services, hooks, utils)
- Components: `PascalCase.tsx`
- Test files: `fileName.test.ts` or `fileName.spec.ts`
- Zustand stores: `useXxxStore.ts`
- TanStack hooks: `useXxx.ts` (wraps useQuery/useMutation)
- NestJS DTOs: `action-resource.dto.ts` (e.g. `create-order.dto.ts`)
- i18n keys: `feature.component.label` (e.g. `orders.card.status`)

---

## Feature Ownership

| Feature | Mobile path | API path |
|---|---|---|
| Auth | `src/features/auth/` | `src/modules/auth/` |
| Orders | `src/features/orders/` | `src/modules/orders/` |
| Shops | `src/features/shops/` | `src/modules/shops/` |
| Wallet | `src/features/wallet/` | `src/modules/wallet/` |
| Upload | `src/features/upload/` | `src/modules/upload/` |
| Notifications | `src/features/notifications/` | `src/modules/notifications/` |
| Staff | `src/features/staff/` | `src/modules/staff/` |
| Users | `src/features/users/` | `src/modules/users/` |
| Devices | `src/features/devices/` | `src/modules/users/` (shared module) |
| Admin | `src/features/admin/` | `src/modules/admin/` |
| Slots | `src/features/slots/` | `src/modules/slots/` |

---

## API Response Shape

All API responses follow:
```json
{ "data": {}, "message": "ok", "statusCode": 200 }
```
The `response.interceptor.ts` handles this automatically.

Error shape (via `HttpExceptionFilter`):
```json
{ "data": null, "message": "<reason>", "statusCode": 4xx }
```

---

## Domain Language

Use these terms exactly. No synonyms.

**Order**
A print job placed by a Customer at a specific Shop. Contains one or more OrderFiles. Has one pickupMode (QUEUE or SLOT).
_Avoid_: job request, print request, booking (booking = Slot reservation specifically)

**OrderFile**
A single uploaded file within an Order, with its own independent print configuration (colorMode, paperSize, orientation, copies, duplex, pageRange).
_Avoid_: attachment, document, file (too generic)

**PrintConfig**
The set of six options applied to an OrderFile: colorMode, paperSize, orientation, copies, duplex, pageRange.
_Avoid_: print settings, print options

**Slot**
A time window (e.g. 09:00–09:30) at a specific Shop on a specific date, opened by the Shop Owner. Customers book a Slot to schedule pickup.
_Avoid_: time slot (redundant), appointment, booking (booking is the act, Slot is the window)

**SlotTemplate**
A reusable time window definition (startTime, endTime) created by Platform Admin. Shop Owners activate templates per date to create Slots.
_Avoid_: time template, slot definition

**Queue**
The ordered list of QUEUE-mode Orders at a Shop, sorted by createdAt. A Customer joins the Queue by choosing "Print Now."
_Avoid_: line, waitlist

**QueuePosition**
The rank of an Order within the Shop's active Queue. Derived at query time — never stored.
_Avoid_: queue number, position number

**ETA**
Estimated minutes until an Order is ready. Computed from weighted per-page processing rates of the shop's last 20 completed Orders.
_Avoid_: wait time, estimated wait

**Wallet**
An in-app balance held per Customer. Funded by admin credit or payment gateway. Debited on order placement. Balance = sum of all WalletTransactions.
_Avoid_: account balance, credits, points

**WalletTransaction**
An immutable ledger entry recording a single credit or debit to a Customer's Wallet.
_Avoid_: payment, charge, transaction (too generic — always say WalletTransaction)

**Shop**
A print shop registered on the platform, owned by a Shop Owner. Has its own pricing rates and Slots.
_Avoid_: store, vendor, printer

**UserDevice**
A registered mobile device belonging to a User, storing an Expo push token. One User can have multiple UserDevices.
_Avoid_: device, push token (push token is a field on UserDevice, not the entity itself)

**OrderNumber**
The human-readable reference for an Order shown to customers and staff (format: `PS-XXXXX`). Used at counter pickup. UUID is used for all server/API operations.
_Avoid_: order ID (ambiguous — could mean UUID or OrderNumber), reference number

**AppConfig**
A key-value store of platform-wide settings managed by Platform Admin (e.g. `LOW_BALANCE_THRESHOLD`, `SLOT_DURATION_MINS`).
_Avoid_: settings, config, platform settings

---

## Roles

| Role | Can do |
|---|---|
| `CUSTOMER` | Browse shops, upload files, place orders, manage wallet, track orders |
| `STAFF` | View and advance job status for own shop's orders, view files |
| `SHOP_OWNER` | All Staff actions + manage shop, staff, slots, pricing, analytics |
| `PLATFORM_ADMIN` | All actions + approve/reject shops, manage AppConfig, SlotTemplates, platform analytics |

---

## Key Business Rules

- **Price server-only.** `totalPrice` computed in `OrdersService`. Client never sends it.
- **Cancel window.** Customer can cancel only while `status IN (QUEUED, SCHEDULED)`.
- **Wallet debit is atomic.** Balance re-checked inside Prisma transaction before debit row inserted.
- **Slot capacity is atomic.** `currentCount` incremented inside Prisma transaction on order creation.
- **Staff owns one shop.** `User.shopId` NOT NULL for STAFF role.
- **Staff promotion flow.** User registers as CUSTOMER first. Shop Owner promotes via `POST /shops/:id/staff { userId }` → role changes to STAFF. Blocked if user already has non-CUSTOMER role.
- **Staff demotion flow.** `DELETE /shops/:id/staff/:userId` → role reverts to CUSTOMER, shopId cleared.
- **Max files per order.** 1–10 files. Outside range → 400.
- **Wallet top-up limits.** Min 10 BDT, max 10,000 BDT per transaction. Both admin credit and gateway.
- **OrderNumber format.** `PS-` + zero-padded 5-digit sequence (e.g. `PS-00001`).
- **Active shop required.** Orders blocked if `shop.status !== ACTIVE`. SUSPENDED and REJECTED shops drain existing orders, block new ones.
- **Shop status transitions.** `PENDING→ACTIVE`, `PENDING→REJECTED`, `ACTIVE→SUSPENDED`, `SUSPENDED→ACTIVE` (admin only), `SUSPENDED→REJECTED` (admin). REJECTED shops can resubmit (`→PENDING`). SUSPENDED shops cannot resubmit — admin reinstates only.
- **slotId NOT NULL on all orders.** QUEUE mode auto-assigns to currently active ShopSlot. SLOT mode customer-picks. No free-floating queue exists outside of slots.
- **"Print Now" availability.** Only shown if `GET /shops/:id/slots/active` returns non-null (shop has open slot for current BST time window with capacity).
- **Off-hours ordering.** Customer can place orders 24/7 but only in SLOT mode (future date slots) when no active slot exists right now.
- **Booking horizon.** Max 3 days ahead. Slots beyond `today + 3 days` rejected at order creation.
- **NEW_ORDER recipients.** Both Staff AND Shop Owner receive NEW_ORDER push + in-app notification on order placement.
- **Analytics revenue.** Counts COLLECTED orders only — cancelled excluded.
- **Timezone.** All datetimes stored UTC. Slot times interpreted as BST (UTC+6).
- **Currency.** BDT (৳) hardcoded platform-wide.
- **LOW_BALANCE trigger.** Fires after every debit where resulting balance < `AppConfig.LOW_BALANCE_THRESHOLD`.
- **Optimistic lock on status advance.** `PATCH /orders/:id/status` requires `expectedCurrentStatus`; returns 409 on mismatch.
- **Soft delete for SlotTemplates.** Never hard-deleted. `deletedAt` marks retirement.
- **Shop deactivation drains gracefully.** Active orders complete; new orders blocked immediately.
- **COLLECTED = cash paid** for CASH orders. No separate payment confirmation step.
