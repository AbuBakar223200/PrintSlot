# Product Requirements Document
## PrintSlot — Campus Print Shop Platform

---

## 1. Overview

PrintSlot digitizes the print shop experience for university campuses and local communities in Bangladesh. Today, customers queue physically at print shops, verbally describe print settings, and wait with no visibility into their job's progress. Errors in print configuration (wrong color mode, wrong paper size, duplicate copies) are discovered only at pickup. Shop staff manage an informal pile of jobs with no structured dashboard, no customer communication, and no revenue records.

PrintSlot replaces this entirely. A Customer uploads their documents from their phone, configures print settings per file (color mode, paper size, orientation, copies, duplex, page range), previews the price, and either joins a live Queue ("Print Now") or books a future time Slot ("Schedule Pickup"). Payment is via an in-app Wallet or cash at pickup. Order status advances through the shop floor in real time — the Customer's phone updates the moment Staff marks a job Ready. Shop Owners manage their shop's pricing, slots, and staff from the same app. A Platform Admin governs shop onboarding and platform-wide configuration.

The system is a React Native mobile app (Expo Router, iOS 16+ / Android 8+) backed by a NestJS REST + WebSocket API, Supabase PostgreSQL via Prisma, Cloudinary file storage, socket.io real-time, and Expo push notifications. Built as an academic project by Team ParaDox with real-launch potential.

---

## 2. Target Users

### Customer
University students and local community members who need documents printed. They are mobile-first, expect fast feedback, and currently lose time waiting in physical queues. They manage a Wallet balance and track orders in the app.

### Staff
Print shop employees who operate the printing machines. They see an ordered job dashboard on their phone, advance each Order through status stages, and are notified instantly when a new Order arrives. They are not responsible for pricing or shop configuration.

### Shop Owner
The owner-operator of a registered print shop. They set pricing rates, configure available time Slots, manage their Staff roster, and monitor daily analytics. They also perform Staff duties (advancing order status). They register through the app and become active only after Platform Admin approval.

### Platform Admin
The platform operator. Responsible for approving or rejecting Shop registrations, managing global Slot templates, adjusting platform-wide AppConfig values, and viewing cross-shop analytics. There is exactly one Platform Admin account, seeded at deployment.

---

## 3. Goals

1. **Eliminate physical queues.** Customers must be able to place Orders remotely and receive a real-time ETA without arriving at the shop first.
2. **Zero print configuration errors.** All PrintConfig options are captured digitally per OrderFile before printing begins. Staff sees the exact spec.
3. **Real-time job tracking.** Order status changes are reflected on the Customer's screen within seconds, via WebSocket with polling fallback.
4. **Trusted pricing.** Price is always computed server-side from current shop rates. Customers see the exact total before confirming. No surprises at pickup.
5. **Controlled shop onboarding.** No shop appears to Customers until Platform Admin approves it.
6. **Offline resilience.** Customers can view cached order state when offline. Mutations are blocked with a clear offline message.
7. **Bilingual support.** The app is fully usable in English and Bengali.
8. **Atomic financial safety.** Wallet debits and Slot capacity increments are race-condition-free via database transactions.

---

## 4. Non-Goals

The following are explicitly out of scope for v1:

- **Payment gateway integration** (bKash, card). Wallet top-up in v1 is admin-credit only. The gateway endpoint (`POST /wallet/topup/gateway`) is a P1 stub — no other feature depends on it.
- **PDF receipt export and image sharing.** These are P1 features that do not block v1 delivery.
- **Advanced analytics** (trend charts, per-staff productivity, revenue forecasting). v1 analytics are day-level counts and revenue totals.
- **Multi-shop ownership.** One Shop Owner owns exactly one Shop. Managing a chain of shops is not supported.
- **Customer support / dispute flow.** No in-app dispute or refund-request UI. Refunds are manual admin wallet credits.
- **Web dashboard.** Platform Admin and Shop Owners are mobile-only in v1. No browser-based management panel.
- **Document preview before printing.** Customers upload and configure but cannot preview the rendered output.
- **Hardware integration.** PrintSlot does not send jobs directly to printers. Staff reads the spec from the app and operates machines manually.
- **Guest ordering.** All customers must be registered and authenticated.

---

## 5. Core User Flows

### Flow 1 — Customer Places a Queue Order ("Print Now")

1. Customer opens the app and selects a Shop from the shop list.
2. Customer taps "Print Now." The button is only visible if `GET /shops/:id/slots/active` returns a non-null active ShopSlot for the current BST time window.
3. Customer uploads 1–10 files via `POST /upload`. For each file:
   - PDF: `detectedPages` auto-populated by server via `pdf-parse`.
   - DOCX / PPTX / XLS / XLSX / image: Customer manually enters page count.
4. Customer sets PrintConfig per file: colorMode, paperSize, orientation, copies, duplex, and optional pageRange.
5. Customer taps "Preview Price." App calls `POST /orders/preview-price` and shows total price breakdown per file.
6. Customer selects payment method: Wallet or Cash.
7. Customer confirms the Order. App calls `POST /orders` with `pickupMode: QUEUE`.
8. Server atomically: calculates price server-side, deducts Wallet if applicable, assigns the Order to the active ShopSlot, sets status to `QUEUED`, generates OrderNumber (`PS-XXXXX`).
9. Customer lands on Order Detail screen showing OrderNumber, QueuePosition, and ETA.
10. Staff and Shop Owner receive a `NEW_ORDER` push notification and in-app Notification.
11. As Staff advances Order status, Customer's screen updates in real time via `order:status_changed` WebSocket event.
12. When status reaches `READY`, Customer receives an `ORDER_READY` push notification.
13. Customer presents OrderNumber at counter. Staff sets status to `COLLECTED`.

**Acceptance Criteria:**
- "Print Now" button only appears when an active ShopSlot exists for the current time window.
- `totalPrice` is never accepted from the client body; always computed server-side.
- Wallet debit is atomic: insufficient balance returns 402.
- Order is assigned to the active ShopSlot's `slotId`; `slotId` is never null.
- OrderNumber is human-readable (`PS-XXXXX`) and unique.
- QueuePosition and ETA update on every status change that shifts queue order.

---

### Flow 2 — Customer Books a Slot ("Schedule Pickup")

1. Customer opens the app and selects a Shop.
2. Customer taps "Schedule Pickup."
3. Customer selects a date (today through today + 3 days). App calls `GET /shops/:id/slots?date=YYYY-MM-DD` and shows available ShopSlots (isOpen, currentCount < maxOrders).
4. Customer selects a Slot.
5. Customer uploads files and sets PrintConfig as in Flow 1.
6. Customer previews price, selects payment method, and confirms.
7. Server atomically: increments `ShopSlot.currentCount`, sets Order status to `SCHEDULED`.
8. Customer lands on Order Detail showing Slot time, OrderNumber, and price.
9. On the scheduled day, Staff processes the Order and advances status. Customer receives real-time updates.

**Acceptance Criteria:**
- Slots beyond today + 3 days are rejected with 400.
- Full slots (`currentCount >= maxOrders`) do not appear in the slot picker.
- `ShopSlot.currentCount` increments inside a Prisma transaction — no race conditions.
- Customer can cancel while status is `SCHEDULED`; Wallet payment is refunded automatically.

---

### Flow 3 — Staff Processes Jobs

1. Staff opens the app and sees the job dashboard for their Shop.
2. Dashboard shows: Slot orders first (sorted by Slot time), then Queue orders (sorted by `createdAt`).
3. Staff taps an Order to see the full spec: OrderNumber, files, PrintConfig per file, payment method, total price.
4. Staff sets status to `PROCESSING` (supplying `expectedCurrentStatus: QUEUED` or `SCHEDULED`). Server validates the optimistic lock — if another Staff member already advanced the Order, 409 is returned and Staff is prompted to refresh.
5. Staff prints the documents as specified.
6. Staff sets status to `READY`. Customer receives `ORDER_READY` push notification.
7. Customer arrives and quotes their OrderNumber. Staff sets status to `COLLECTED`. For CASH orders, this implicitly marks payment received.

**Acceptance Criteria:**
- Only Staff of the Order's Shop can advance its status.
- Optimistic lock (`expectedCurrentStatus`) prevents two Staff members from double-advancing.
- Status can only advance in the defined sequence: `QUEUED/SCHEDULED → PROCESSING → READY → COLLECTED`.
- WebSocket `order:status_changed` fires on every advance.

---

### Flow 4 — Shop Owner Onboarding

1. Shop Owner registers via `POST /auth/register` with `role: SHOP_OWNER`.
2. Shop Owner creates their Shop via `POST /shops` (name, address, phone, pricing rates). Shop starts with `status: PENDING`.
3. Platform Admin sees the new Shop in their approval queue (`GET /admin/analytics` surfaces `pendingApprovals`).
4. Platform Admin approves: `PATCH /shops/:id/status { status: ACTIVE }`. Shop Owner and customers can now use the Shop.
5. Alternatively, Platform Admin rejects with a `rejectionReason`. Shop Owner receives a `SHOP_REJECTED` push notification. They can edit details and resubmit (`PATCH /shops/:id/resubmit`).

**Acceptance Criteria:**
- A PENDING shop is invisible to Customers in shop listings.
- A REJECTED shop cannot accept new Orders; Shop Owner can resubmit once after REJECTED.
- A SUSPENDED shop cannot accept new Orders; only Platform Admin can reinstate (SUSPENDED → ACTIVE). Shop Owner cannot resubmit from SUSPENDED state.
- Push + in-app Notification sent on APPROVED and REJECTED outcomes.

---

### Flow 5 — Customer Cancels an Order

1. Customer opens Order Detail for an Order with status `QUEUED` or `SCHEDULED`.
2. Customer taps "Cancel Order."
3. App calls `PATCH /orders/:id/cancel`.
4. Server validates status is cancellable, then:
   - Sets `status: CANCELLED`, records `cancelledAt`.
   - If `paymentMethod: WALLET`, creates a `WalletTransaction(CREDIT, reason: ORDER_REFUND)` automatically.
   - If `pickupMode: SLOT`, decrements `ShopSlot.currentCount`.
5. Customer and Shop Owner / Staff receive an `ORDER_CANCELLED` Notification.

**Acceptance Criteria:**
- Cancel only permitted when status is `QUEUED` or `SCHEDULED` — any other status returns 400.
- Wallet refund is automatic and atomic for WALLET payment orders.
- `ShopSlot.currentCount` is decremented for SLOT orders, freeing the capacity.

---

### Flow 6 — Platform Admin Manages AppConfig and SlotTemplates

1. Platform Admin views current AppConfig via `GET /admin/config` (e.g. `LOW_BALANCE_THRESHOLD: 50`, `SLOT_DURATION_MINS: 30`).
2. Platform Admin updates a value via `PATCH /admin/config/:key`.
3. Platform Admin creates a new SlotTemplate via `POST /slots/templates` (startTime, endTime). Duration is derived from `AppConfig.SLOT_DURATION_MINS`.
4. Shop Owners can then open ShopSlots based on the template for specific dates.
5. If a SlotTemplate is retired, Platform Admin soft-deletes it (`DELETE /slots/templates/:id` sets `deletedAt`). Existing ShopSlots referencing it remain valid.

---

## 6. Features

### 6.1 Authentication & Registration
- Public registration for `CUSTOMER` and `SHOP_OWNER` roles only.
- `STAFF` and `PLATFORM_ADMIN` accounts created by privileged actors (Shop Owner assigns Staff; Admin seeded at deploy).
- Supabase Auth issues JWTs. NestJS validates via `supabase-jwt.strategy.ts`. Role stored in DB — not JWT claims — so role changes take effect immediately without token rotation.
- `PATCH /users/me` updates profile (name, phone, language).
- `PATCH /users/me/device` upserts a UserDevice row (for push notifications). One User may have multiple UserDevices (multi-device support). On `DeviceNotRegistered` error from Expo, the UserDevice row is silently deleted.

### 6.2 Shop Management
- Shop Owner creates and edits their Shop (name, address, phone, pricing rates: colorRate, bwRate, a3Surcharge, duplexDiscount).
- All shops searchable by Customers after ACTIVE.
- Platform Admin can approve, reject (with reason), or suspend any Shop.
- Rejected shops can resubmit; suspended shops require Admin reinstatement.

### 6.3 File Upload
- Single endpoint: `POST /upload`. Server validates MIME type and size (max 20 MB).
- Accepted types: PDF, DOCX, PPTX, XLS, XLSX, JPG, PNG.
- Server auto-detects page count for PDF via `pdf-parse`. All other types require customer-entered page count.
- Files stored in Cloudinary `printslot/pending/` with 24-hour TTL. On Order creation, API moves file to `printslot/orders/{orderId}/`. Abandoned uploads auto-expire — no cleanup code needed.

### 6.4 Order Placement & Pricing
- Two pickup modes: `QUEUE` (Print Now) and `SLOT` (Schedule Pickup).
- 1–10 OrderFiles per Order, each with independent PrintConfig.
- Price preview (`POST /orders/preview-price`) uses identical formula to order creation — no surprises.
- Pricing formula per OrderFile:
  - `base = resolvedPages × copies × rate`
  - `surcharge = A3 pages × a3Surcharge`
  - `discount = duplex ? base × (1 − duplexDiscount) : base`
  - `subtotal = discount + surcharge`
- `totalPrice` = sum of all OrderFile subtotals. Never accepted from client.
- `resolvedPages` derived from `pageRange` if specified, else `detectedPages`.

### 6.5 Queue Mode & ETA
- QUEUE orders auto-assigned to the currently active ShopSlot (BST time window containing `now`).
- QueuePosition = rank of order among all `QUEUED/PROCESSING` orders at the same Shop for the same day, by `createdAt`.
- ETA algorithm uses the last 20 completed Orders at the Shop to compute per-page processing rates. Fallback: `shop.defaultProcessingMins / 10` when < 10 completed orders exist.
- QueuePosition and ETA broadcast via `order:queue_updated` WebSocket event on every status change.

### 6.6 Slot Mode
- Customer selects a date (today to today + 3 days) and sees only open, non-full ShopSlots.
- `ShopSlot.currentCount` incremented atomically on order creation.
- Cancellation decrements `currentCount` and frees capacity.

### 6.7 Wallet
- Balance = `SUM(CREDIT amounts) − SUM(DEBIT amounts)` per user. No stored balance column.
- Debit inside Prisma transaction with balance re-check before insert.
- Top-up in v1: admin credit only (`POST /wallet/topup`, min 10 BDT, max 10,000 BDT).
- Gateway top-up (`POST /wallet/topup/gateway`) is P1, isolated behind its own endpoint.
- `LOW_BALANCE` Notification fires after every debit where new balance < `AppConfig.LOW_BALANCE_THRESHOLD`.
- Customer views balance and paginated WalletTransaction history.

### 6.8 Real-Time Order Tracking
- socket.io namespace `/orders`. Customer joins room `order:{orderId}` on Order Detail screen mount.
- `order:status_changed` event fires on every Staff status advance.
- `order:queue_updated` event fires on every queue position change.
- TanStack Query polls `GET /orders/:id` every 30 seconds as silent fallback.
- Disconnect banner shown when WebSocket is offline. Reconnect auto-rejoins room.

### 6.9 Staff Job Dashboard
- Unified job list scoped to Staff's Shop.
- Sort order: Slot orders first (by Slot time), then Queue orders (by `createdAt`).
- Status advance with optimistic lock: `PATCH /orders/:id/status` requires `expectedCurrentStatus`.
- 409 returned on mismatch — Staff prompted to refresh and retry.

### 6.10 Push & In-App Notifications
Twelve events trigger both a `Notification` DB record and an Expo push to all UserDevice rows for the recipient:

| Event | Recipient |
|---|---|
| `ORDER_PLACED` | Customer |
| `ORDER_ACCEPTED` | Customer |
| `ORDER_READY` | Customer |
| `ORDER_CANCELLED` | Customer |
| `NEW_ORDER` | Staff + Shop Owner |
| `WALLET_TOPUP` | Customer |
| `WALLET_DEDUCTED` | Customer |
| `SHOP_APPROVED` | Shop Owner |
| `SHOP_REJECTED` | Shop Owner |
| `SHOP_SUSPENDED` | Shop Owner |
| `STAFF_ASSIGNED` | Promoted Staff user |
| `LOW_BALANCE` | Customer (after debit below threshold) |

In-app Notification list: paginated, filterable by read/unread. Mark individual or all as read.

### 6.11 Staff Management
- Shop Owner promotes existing Customer-role users to Staff: `POST /shops/:id/staff { userId }`.
- Only `CUSTOMER`-role users can be promoted. Any other role is rejected.
- Shop Owner demotes Staff: `DELETE /shops/:id/staff/:userId` — role reverts to `CUSTOMER`, `shopId` cleared.
- Staff belongs to exactly one Shop.

### 6.12 Slot Template & Shop Slot Management
- Platform Admin creates/edits/soft-deletes global SlotTemplates (startTime, endTime).
- Shop Owner opens ShopSlots per template per date: sets `isOpen`, `maxOrders`.
- `maxOrders` can be reduced below `currentCount` — existing Orders unaffected; slot closes to new bookings immediately.

### 6.13 Analytics
- **Shop Owner** (scoped to own shop, by date): totalOrders, revenue (COLLECTED only), byStatus counts, avgProcessingMins.
- **Platform Admin** (platform-wide): totalShops, totalOrders, revenuePerShop table, pendingApprovals count.
- Revenue counts COLLECTED orders only. Cancelled excluded. Both WALLET and CASH payment methods included.

### 6.14 Internationalisation
- All UI strings use i18n translation keys (`feature.component.label` format).
- Two languages: English (default) and Bengali.
- Language stored on User (`language: EN | BN`). Toggle in settings screen.
- No hardcoded strings in components.

### 6.15 Offline Handling
- TanStack Query stale cache shown when network unavailable.
- Disconnect banner rendered app-wide when offline.
- All mutation actions (Order placement, cancellation, top-up) blocked with inline offline error — no API calls fired.

---

## 7. Permissions and Roles

| Action | CUSTOMER | STAFF | SHOP_OWNER | PLATFORM_ADMIN |
|---|---|---|---|---|
| Register (CUSTOMER / SHOP_OWNER) | ✅ | — | — | — |
| Update own profile | ✅ | ✅ | ✅ | ✅ |
| Register/manage UserDevice (push token) | ✅ | ✅ | ✅ | ✅ |
| Browse active Shops | ✅ | ✅ | ✅ | ✅ |
| View Shop detail | ✅ | ✅ | ✅ | ✅ |
| Create own Shop | — | — | ✅ (one only) | — |
| Edit own Shop | — | — | ✅ | — |
| Approve / reject / suspend any Shop | — | — | — | ✅ |
| Upload files | ✅ | — | — | — |
| Preview price | ✅ | — | — | — |
| Place an Order | ✅ | — | — | — |
| View own Orders | ✅ | — | — | — |
| View own Shop's Orders | — | ✅ | ✅ | — |
| Advance Order status | — | ✅ (own shop) | ✅ (own shop) | — |
| Cancel own Order (QUEUED/SCHEDULED) | ✅ | — | — | — |
| View own Wallet balance + history | ✅ | — | — | — |
| Top-up any Customer's Wallet (admin credit) | — | — | ✅ | ✅ |
| Initiate gateway top-up (P1) | ✅ | — | — | — |
| View own Notifications | ✅ | ✅ | ✅ | ✅ |
| Mark Notifications read | ✅ | ✅ | ✅ | ✅ |
| Assign / remove Staff | — | — | ✅ (own shop) | — |
| View own Staff list | — | — | ✅ | — |
| Open/close ShopSlots | — | — | ✅ (own shop) | — |
| View available Slots (as Customer) | ✅ | — | — | — |
| Create/edit/delete SlotTemplates | — | — | — | ✅ |
| View / update AppConfig | — | — | — | ✅ |
| View own Shop analytics | — | — | ✅ | — |
| View platform-wide analytics | — | — | — | ✅ |

---

## 8. Data Model

### Core Entities

**User** — Represents any registered account. Holds role, language preference, and optional `shopId` (set for STAFF and SHOP_OWNER). Push tokens live in separate UserDevice rows — not on User.

**UserDevice** — One row per registered device per user. Stores the Expo push token. Upserted on every app launch. Deleted on `DeviceNotRegistered` push error. Enables multi-device push fan-out.

**Shop** — A print shop on the platform. Holds pricing rates (colorRate, bwRate, a3Surcharge, duplexDiscount), status (PENDING / ACTIVE / REJECTED / SUSPENDED), and `defaultProcessingMins` for ETA fallback. One Shop per Shop Owner (`ownerId` unique).

**SlotTemplate** — A reusable time window definition (startTime HH:MM, endTime HH:MM) managed by Platform Admin. Soft-deleted only — never hard-deleted if ShopSlots reference it.

**ShopSlot** — A specific time window opened by a Shop Owner for a specific Shop and date. Has `maxOrders` and `currentCount` (incremented atomically). Unique on (shopId, templateId, date).

**Order** — The central entity. Links Customer, Shop, ShopSlot, and one or more OrderFiles. Carries `pickupMode` (QUEUE or SLOT), `status`, `paymentMethod`, pre-computed `totalPages / colorPages / bwPages`, and server-calculated `totalPrice`. OrderNumber (`PS-XXXXX`) is human-readable; UUID is used in all API calls. `slotId` is always NOT NULL — QUEUE mode auto-assigns to active ShopSlot.

**OrderFile** — One row per uploaded file per Order. Carries the complete PrintConfig (colorMode, paperSize, orientation, copies, duplex, pageRange), `resolvedPages`, and `subtotalPrice`. Each file is priced independently.

**WalletTransaction** — Immutable ledger entry. Type is CREDIT or DEBIT; amount is always positive. Balance computed by aggregation. Reason enum: TOPUP_ADMIN, TOPUP_GATEWAY, ORDER_PAYMENT, ORDER_REFUND.

**Notification** — One row per in-app notification event per user. Carries type (12 event types), read flag, and optional orderId link.

**AppConfig** — Key-value store. Known keys: `LOW_BALANCE_THRESHOLD` (default 50 BDT), `SLOT_DURATION_MINS` (default 30). Managed exclusively by Platform Admin.

### Key Relationships
```
User ──< Order           (customerId → User)
User ──< WalletTransaction
User ──< Notification
User ──< UserDevice
User >── Shop            (ownerId, 1:1 UNIQUE)
User >── Shop            (shopId FK, N:1 — for STAFF)

Shop ──< Order
Shop ──< ShopSlot
Shop ──< User            (staff members)

SlotTemplate ──< ShopSlot
ShopSlot ──< Order       (all orders, via slotId NOT NULL)

Order ──< OrderFile
Order ──< WalletTransaction  (refund/payment link via orderId)
Order ──< Notification       (orderId reference)
```

### Key Constraints
- Wallet balance never stored as a column. Always recomputed via aggregate.
- Wallet debit and Slot capacity increment both use `prisma.$transaction` with re-check before mutating.
- Order status transitions are strictly linear: `QUEUED/SCHEDULED → PROCESSING → READY → COLLECTED`. Cancel only from `QUEUED` or `SCHEDULED`.
- OrderNumber generated server-side via Postgres sequence `order_number_seq`. Format: `PS-` + zero-padded 5-digit integer. No gaps, no duplicates.
- All datetimes stored UTC. Slot times interpreted in BST (UTC+6).
- Currency: BDT (৳) hardcoded platform-wide.

---

## 9. Edge Cases

### Order Placement
- **No active Slot at time of "Print Now".** Server returns 400. Client must check `GET /shops/:id/slots/active` before showing the button. If the Slot closed between check and submit, the server returns 400.
- **Slot fills between preview and submission.** Server returns 409 (slot full) on Order creation. Client prompts Customer to choose a different Slot.
- **Shop suspended between preview and submission.** Server returns 400 (`shop.status !== ACTIVE`). Client surfaces error and refreshes Shop detail.
- **Wallet balance drops between preview and submission** (concurrent Order from another device). Server debit transaction re-checks balance and returns 402 if insufficient.
- **Customer enters a pageRange exceeding detectedPages.** Server validates range against `detectedPages`; returns 400 with field error.
- **Customer uploads 0 files or more than 10.** Server returns 400.
- **PDF file where `pdf-parse` fails to detect pages.** Server returns `detectedPages: null`; Client falls back to manual entry.
- **Customer attempts to book a Slot more than 3 days ahead.** Server returns 400.

### Order Cancellation
- **Customer tries to cancel a PROCESSING/READY/COLLECTED order.** Server returns 400.
- **Customer cancels a WALLET order — refund race condition.** Refund is a new CREDIT row inside the same transaction that sets `status: CANCELLED`. Atomic — no partial state.
- **Slot cancellation at capacity boundary.** `ShopSlot.currentCount` decremented inside transaction. Cannot go below 0.

### Status Advancement
- **Two Staff members tap "Advance" simultaneously.** Optimistic lock: whichever arrives second gets a 409. Staff prompted to refresh. No double-advance possible.
- **Staff tries to advance an Order belonging to a different Shop.** Server returns 403.
- **Staff tries to skip a status step.** Only valid transitions accepted; invalid status returns 400.

### Notifications & Devices
- **Customer uninstalls app — token becomes stale.** Next push dispatch gets `DeviceNotRegistered` from Expo. That `UserDevice` row is deleted silently. `Notification` DB record still created.
- **Customer has 3 devices logged in simultaneously.** Push fans out to all 3 `UserDevice` rows.
- **LOW_BALANCE notification after every debit.** Fires every time the new balance is below threshold — not just the first crossing. Expected behaviour.

### Shop & Staff
- **Shop Owner tries to assign a user already STAFF or SHOP_OWNER.** Server returns 400.
- **Shop Owner tries to demote Staff who has PROCESSING orders.** Demotion succeeds immediately — Staff role changes to CUSTOMER, `shopId` cleared. Existing Orders continue to completion under the original Staff; new orders assigned to remaining staff.
- **Shop Owner reduces `maxOrders` below current `currentCount`.** Allowed. Slot is immediately closed to new bookings (`currentCount >= maxOrders`). Existing Orders unaffected.
- **Rejected Shop tries to resubmit after Suspension.** `PATCH /shops/:id/resubmit` is blocked for SUSPENDED shops (400). Only REJECTED shops can resubmit.
- **SlotTemplate soft-deleted while ShopSlots reference it.** Existing ShopSlots remain valid and orders continue. Template hidden from `GET /slots/templates` list.

### Wallet
- **Admin top-up below 10 BDT or above 10,000 BDT.** Rejected with 400. Enforced in `WalletService`.
- **Customer balance goes negative.** Impossible — debit transaction checks balance ≥ amount before inserting.

---

## 10. Error States

| HTTP Code | Trigger | Expected Client Behaviour |
|---|---|---|
| 400 | Validation failure (Zod), invalid status transition, cancellation of non-cancellable order, pageRange out of bounds, files count outside 1–10, booking horizon exceeded, wallet top-up limit violated, resubmit on non-REJECTED shop | Show inline field error or toast with server `message` |
| 401 | Missing or expired JWT | Redirect to login screen; clear auth store |
| 402 | Insufficient Wallet balance | Show "Insufficient balance" with link to Wallet top-up screen |
| 403 | Role not permitted for endpoint | Show "Access denied" screen or toast |
| 404 | Order / Shop / Slot / User not found | Show "Not found" empty state with back navigation |
| 409 | Optimistic lock conflict (status advance), Slot already full, duplicate ShopSlot | Show "Conflict" toast; trigger refetch of affected resource |
| 413 | Uploaded file exceeds 20 MB | Show "File too large (max 20 MB)" error on upload screen |
| 415 | Unsupported MIME type | Show "File type not supported" with list of accepted types |
| 500 | Unhandled server exception | Show generic "Something went wrong, please try again" toast; log to error tracking |

### Network / WebSocket Errors
- **API request times out.** TanStack Query retries automatically (default 3 attempts). After exhausting retries, show error state with "Retry" button.
- **WebSocket disconnects.** Disconnect banner shown. TanStack Query polling (30s) maintains eventual consistency. On reconnect, `order:join` re-emitted; banner dismissed.
- **Device goes fully offline.** Stale cache shown for all screens. Mutation actions (place order, cancel, top-up) blocked with inline "You are offline" message. No API calls fired.

---

## 11. Acceptance Criteria

The project is complete when every criterion below is satisfied.

### Code Quality
1. Every module has a test file in `__tests__/` written before the implementation (TDD: red → green).
2. `npm test` passes with zero failures across `apps/api`, `apps/mobile`, and `packages/shared`.
3. All shared types live in `packages/shared/src/types/`. No type duplication between API and mobile.
4. `grep -r "@prisma/client" apps/mobile` returns zero results.

### API Layer
5. Every endpoint returns `{ data: T, message: string, statusCode: number }` via `ResponseInterceptor`.
6. Every protected endpoint has `@Roles()` decorator. Unauthorized role returns 403 (verified in controller specs).
7. All DTOs validated via `ZodValidationPipe`. Invalid input returns 400 with field-level errors.
8. All exceptions pass through `HttpExceptionFilter`. No raw errors reach the client.
9. `totalPrice` is never accepted from request body on any endpoint.

### Mobile Layer
10. All navigation uses `router.push()` / `router.replace()` from `expo-router`. Zero uses of `useNavigation()`.
11. TanStack Query is the sole cache for server data. No server responses stored manually in Zustand.
12. Every screen checks connectivity. Stale cache shown with disconnect banner when offline. All mutations blocked with offline error.
13. All user-visible strings use i18n keys. No hardcoded English or Bengali text in `.tsx` files.

### Notifications
14. Every notification dispatch null-checks push token. Missing token skips push silently; `Notification` DB record still created.
15. Every notification event creates a `Notification` row regardless of push token presence.

### Architecture
16. Each feature's code lives in its designated folder per the CONTEXT.md feature ownership table. No cross-feature imports except `components/shared/`, `components/ui/`, and `packages/shared`.
17. Naming conventions followed: `camelCase.ts`, `PascalCase.tsx`, `fileName.test.ts`, `useXxxStore.ts`, `useXxx.ts` hooks, `action-resource.dto.ts`.

### Feature Completeness
18. All P0 features in `docs/02-feature-registry.md` are implemented and pass their stated acceptance criteria.
19. Every P0 feature manually smoke-tested end-to-end on both iOS simulator and Android emulator.
20. All unhappy paths verified: invalid input, wrong role, insufficient balance, full slot, double cancel attempt.
21. For every feature touching order status: WebSocket event fires and UI updates without manual refresh. Verified with simultaneous staff and customer clients.

---

## 12. Testing Requirements

### What Makes a Good Test
Tests must verify **external observable behaviour** — what the module returns or does — not internal implementation details. Do not test which private methods are called or how many times. Tests must be independent, deterministic, and not rely on test execution order.

### API Unit Tests (Jest, per module)

| Module | What to Test |
|---|---|
| `OrdersService` | Price calculation formula for all ColorMode × PaperSize × duplex combinations; cancel permission guard; status transition validation; QUEUE active-slot assignment; SLOT booking horizon enforcement |
| `WalletService` | Debit insufficient balance returns 402; LOW_BALANCE threshold trigger; top-up min/max limits; balance aggregation formula |
| `SlotsService` | Capacity increment atomicity; closed slot filter; `active` slot detection against BST time window |
| `ShopsService` | Status transition rules (all valid and invalid paths); resubmit guard for SUSPENDED state |
| `StaffService` | Promotion blocks non-CUSTOMER roles; demotion reverts role and clears shopId |
| `NotificationsService` | All 12 event types produce a Notification row; push skipped when no UserDevice; UserDevice deleted on DeviceNotRegistered |
| `AuthService` | Register blocked for STAFF / PLATFORM_ADMIN roles |

### API Integration / E2E Tests (Jest + Supertest)

- Full Order creation flow: upload → preview price → place order → verify OrderFile rows, totalPrice, slotId, OrderNumber format.
- Concurrent wallet debit: two simultaneous requests for same user; only one succeeds, second returns 402.
- Concurrent slot booking: two simultaneous requests for last slot; only one succeeds, second returns 409.
- Optimistic lock: two simultaneous status advances; second returns 409.
- Role guard: all protected endpoints return 403 with wrong role.

### Mobile Unit Tests (Jest + React Native Testing Library)

| Component / Hook | What to Test |
|---|---|
| `useOrders` | Correct query key; invalidates on mutation success |
| `useWallet` | Balance query; LOW_BALANCE toast trigger |
| `OrderCard` | Renders OrderNumber, status badge, ETA correctly; does not crash with `count=0` |
| `PrintConfigForm` | Page range validation; copies min 1 enforced |
| `SlotPicker` | Only renders open, non-full slots; disabled state for past dates |
| Price preview | Matches server formula for given inputs |
| Offline banner | Renders when connectivity store is `offline` |

### Test Prior Art
- Controller specs: follow the `__tests__/` pattern established for `OrdersController` and `WalletController` — mock `PrismaService`, test role guards, DTO validation, and response shapes.
- Service specs: use real logic with mocked Prisma calls. No integration DB in unit tests.
- E2E specs: use `apps/api/test/` directory with a real test database (not mocks) — per the project's TDD decision to avoid mock-vs-production divergence.

---

## 13. Open Questions

1. **ETA algorithm calibration.** The algorithm requires 10+ completed Orders to exit fallback mode. For newly onboarded Shops, the fallback (`defaultProcessingMins / 10`) may be inaccurate. Should Shop Owner be allowed to tune `defaultProcessingMins` after launch, or should Platform Admin control it?

2. **Order editing before PROCESSING.** Currently, once an Order is placed it cannot be modified. Should Customers be allowed to edit PrintConfig (e.g. change copies) while the Order is still `QUEUED` or `SCHEDULED`? This would require recalculating price and potentially adjusting the Wallet debit.

3. **Multi-file page detection accuracy.** For non-PDF types (DOCX, PPTX, images), page count is customer-entered. Customers may enter an incorrect count, causing wrong pricing. Is server-side page detection for DOCX/PPTX via LibreOffice or a cloud API in scope for a future version?

4. **Staff account creation flow.** Currently, a user must first register as CUSTOMER, then be promoted by Shop Owner. This requires the future Staff member to know the platform exists and self-register. Should Shop Owner be able to invite Staff via email (create an account on their behalf)?

5. **Cash payment confirmation.** For CASH orders, `COLLECTED` status implicitly means cash was received. If a Customer pays but Staff forgets to advance status, the order remains `READY` in the dashboard indefinitely. Should there be a timeout or a separate "cash received" confirmation step?

6. **Render cold start on demo day.** Render free tier spins down after inactivity. Should the deployment use a paid tier or configure a keep-alive ping before demos? (Tracked in risk register.)

7. **Notification delivery guarantees.** Expo push notifications are best-effort. For critical events (`ORDER_READY`, `ORDER_CANCELLED`) should there be an in-app fallback that auto-pops up when the Customer opens the Orders list, even if they missed the push?

8. **OrderNumber gap tolerance.** The `PS-XXXXX` sequence uses a Postgres sequence — gaps occur on rolled-back transactions. Is this acceptable, or is a gap-free sequence required for auditing?
