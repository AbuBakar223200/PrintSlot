# PrintSlot — Use Cases

> Companion to [`docs/PRD.md`](./PRD.md) and [`docs/02-feature-registry.md`](./02-feature-registry.md). This document enumerates every use case the v1 system must support, organised by actor. Each use case is the level of detail an implementer can verify against during QA.

---

## Actors

| Actor | Description |
|---|---|
| **Customer** | A registered user who places print orders. The default role on registration. |
| **Staff** | A user promoted by a Shop Owner to operate jobs at a specific shop. |
| **Shop Owner** | A user who registers and operates exactly one print shop. Also performs all Staff actions. |
| **Platform Admin** | The seeded operator who governs the platform. Exactly one account per deployment. |

---

## Use Case Index

| ID | Title | Actor | Priority |
|---|---|---|---|
| UC-01 | Register a new account | Anonymous | P0 |
| UC-02 | Log in | Anonymous | P0 |
| UC-03 | Update profile | All authenticated | P0 |
| UC-04 | Register a push device | All authenticated | P0 |
| UC-05 | Toggle interface language | All authenticated | P1 |
| UC-06 | Browse active shops | Customer | P0 |
| UC-07 | Search shops by name | Customer | P0 |
| UC-08 | View shop details and pricing | Customer | P0 |
| UC-09 | Upload print files | Customer | P0 |
| UC-10 | Configure print settings per file | Customer | P0 |
| UC-11 | Preview order price | Customer | P0 |
| UC-12 | Place order in queue mode ("Print Now") | Customer | P0 |
| UC-13 | Place order in slot mode ("Schedule Pickup") | Customer | P0 |
| UC-14 | Pay via Wallet | Customer | P0 |
| UC-15 | Pay via cash at pickup | Customer | P0 |
| UC-16 | View live queue position and ETA | Customer | P0 |
| UC-17 | Track order status in real time | Customer | P0 |
| UC-18 | Cancel a queued or scheduled order | Customer | P0 |
| UC-19 | Receive automatic Wallet refund on cancellation | Customer | P0 |
| UC-20 | View order history | Customer | P0 |
| UC-21 | View order receipt | Customer | P0 |
| UC-22 | View Wallet balance and transactions | Customer | P0 |
| UC-23 | Receive push notifications | All authenticated | P0 |
| UC-24 | View in-app notification list | All authenticated | P0 |
| UC-25 | Mark notifications as read | All authenticated | P0 |
| UC-26 | View staff job dashboard | Staff / Owner | P0 |
| UC-27 | View full job specification | Staff / Owner | P0 |
| UC-28 | Advance order status step by step | Staff / Owner | P0 |
| UC-29 | Handle optimistic-lock conflict | Staff / Owner | P0 |
| UC-30 | Register a shop | Shop Owner | P0 |
| UC-31 | Edit shop details and pricing | Shop Owner | P0 |
| UC-32 | Resubmit a rejected shop | Shop Owner | P0 |
| UC-33 | Open and close shop time slots | Shop Owner | P0 |
| UC-34 | Promote a Customer to Staff | Shop Owner | P0 |
| UC-35 | Demote a Staff member | Shop Owner | P0 |
| UC-36 | View shop daily analytics | Shop Owner | P0 |
| UC-37 | Approve or reject a shop application | Platform Admin | P0 |
| UC-38 | Suspend or reinstate a shop | Platform Admin | P0 |
| UC-39 | Manage SlotTemplates | Platform Admin | P0 |
| UC-40 | Top up any customer's Wallet | Shop Owner / Platform Admin | P0 |
| UC-41 | Manage AppConfig values | Platform Admin | P0 |
| UC-42 | View platform-wide analytics | Platform Admin | P0 |

---

## UC-01 — Register a new account

**Actor:** Anonymous user
**Goal:** Create a new account as a Customer or Shop Owner
**Preconditions:** User has a valid, unused email and a password ≥ 6 chars

**Main Flow:**
1. User opens the register screen.
2. User chooses the role (CUSTOMER default, or SHOP_OWNER).
3. User enters name, email, optional phone, password, confirm password.
4. User taps "Create Account."
5. Client validates: email format, password length, password match.
6. App calls `POST /auth/register` with `{ name, email, phone?, password, role }`.
7. Server creates a Supabase Auth user and a mirror `User` row with role.
8. Server returns `{ user, accessToken }`.
9. Mobile persists the session to SecureStore via Zustand.
10. Root layout redirects to the appropriate role group (`/(customer)/`, `/(owner)/shop/`).

**Alternative Flows:**
- **Email already registered:** server returns 409 → screen shows inline error.
- **Role = STAFF or PLATFORM_ADMIN:** server returns 400 — these roles cannot self-register.
- **Validation error:** client displays per-field error; submit button stays disabled until corrected.

**Postconditions:** A new `User` row exists with the chosen role; session active.

---

## UC-02 — Log in

**Actor:** Anonymous user
**Goal:** Authenticate and reach the role-appropriate landing screen

**Main Flow:**
1. User opens login screen.
2. User enters email and password.
3. App calls `POST /auth/login`.
4. Server validates against Supabase Auth, fetches `User` from DB (source of truth for role).
5. Server returns `{ user, accessToken }`.
6. Mobile persists session and redirects by role.

**Alternative Flow:**
- **Invalid credentials:** server returns 401 → inline error.
- **No DB user (Supabase Auth user exists but no mirror row):** server returns 404 → inline error.

**Postconditions:** Authenticated session; redirected to role group.

---

## UC-03 — Update profile

**Actor:** Any authenticated user
**Goal:** Change own name, phone, or language

**Main Flow:**
1. User opens profile/settings screen.
2. User edits one or more of: name, phone, language (EN | BN).
3. User taps "Save."
4. App calls `PATCH /users/me`.
5. Server updates the row and returns the full updated `User`.
6. Mobile updates `authStore.user` and invalidates `['auth', 'me']` query.

**Postconditions:** Profile fields updated; future requests reflect new data.

---

## UC-04 — Register a push device

**Actor:** Any authenticated user
**Goal:** Have the device's Expo push token stored server-side so notifications arrive

**Main Flow:**
1. Mobile app launches in authenticated state.
2. `useDeviceRegistration` hook fires on mount.
3. Hook obtains Expo push token via `getExpoPushTokenAsync()` and stable device ID.
4. App calls `PATCH /users/me/device` with `{ token, deviceId }`.
5. Server upserts `UserDevice` on `@@unique([userId, deviceId])`.

**Alternative Flow:**
- **Permission denied for push notifications:** registration silently skipped; in-app notifications still arrive via DB list.

**Postconditions:** `UserDevice` row exists for this `(userId, deviceId)` pair.

---

## UC-05 — Toggle interface language

**Actor:** Any authenticated user
**Goal:** Switch the UI between English and Bengali

**Main Flow:**
1. User taps language toggle in settings.
2. App optimistically updates `i18next.changeLanguage(lang.toLowerCase())`.
3. App calls `PATCH /users/me { language }`.
4. On success, `authStore.user.language` is updated.

**Postconditions:** UI re-renders in the new language; preference persists across app launches.

---

## UC-06 — Browse active shops

**Actor:** Customer
**Goal:** See the list of shops they can order from

**Main Flow:**
1. Customer opens "Shops" tab.
2. App calls `GET /shops` — returns shops with `status = ACTIVE` only.
3. List rendered as FlashList of `ShopCard`s with name and address.
4. Pull-to-refresh re-fetches.

**Alternative Flow:**
- **No active shops on platform:** empty state shown.

---

## UC-07 — Search shops by name

**Actor:** Customer

**Main Flow:**
1. Customer types in search field on home or shops screen.
2. Input debounced 300 ms.
3. App calls `GET /shops?search=<query>`.
4. Server returns active shops whose name contains the query.

---

## UC-08 — View shop details and pricing

**Actor:** Customer

**Main Flow:**
1. Customer taps a shop card.
2. App calls `GET /shops/:id` and `GET /shops/:id/slots/active` in parallel.
3. Screen shows: name, address, phone, pricing rates (colorRate, bwRate, a3Surcharge, duplexDiscount), "Print Now" button (only if active slot exists), "Schedule Pickup" button.

**Alternative Flow:**
- **Shop not ACTIVE:** screen still loads (used by owner viewing own PENDING shop). Customer-facing buttons hidden if not ACTIVE.

---

## UC-09 — Upload print files

**Actor:** Customer

**Main Flow:**
1. Customer enters order wizard with target shop selected.
2. Customer taps "Add file."
3. App opens `expo-document-picker` (or image picker for images).
4. Customer selects a file. Client validates MIME and size ≤ 20 MB.
5. App uploads via `POST /upload` (multipart).
6. Server validates MIME, stores file in Cloudinary `printslot/pending/`, runs pdf-parse if PDF.
7. Server returns `{ fileUrl, fileName, mimeType, fileSize, detectedPages: number | null }`.
8. Wizard adds the file to its list. Max 10 files enforced client-side.

**Alternative Flows:**
- **Unsupported MIME:** server returns 415 → inline error on FilePickerCard.
- **File > 20 MB:** server returns 413 → inline error.
- **pdf-parse fails on PDF:** server returns `detectedPages: null`; UI asks customer to enter page count manually.
- **Non-PDF file:** UI requires manual page count input.

---

## UC-10 — Configure print settings per file

**Actor:** Customer

**Main Flow:**
1. For each uploaded file, customer opens its `PrintConfigForm`.
2. Customer sets: colorMode (COLOR | BW), paperSize (A4 | A3 | LETTER), orientation (PORTRAIT | LANDSCAPE), copies (integer ≥ 1), duplex (bool), pageRange (optional, e.g. `"1-5,7"`).
3. Client validates pageRange format and that all referenced pages ≤ detectedPages.

**Alternative Flow:**
- **Invalid pageRange:** inline error; submit disabled.

---

## UC-11 — Preview order price

**Actor:** Customer

**Main Flow:**
1. Customer taps "Preview Price" inside wizard.
2. App calls `POST /orders/preview-price` with shopId + files array (file metadata + config).
3. Server runs the identical price formula used by `POST /orders`.
4. Server returns per-file `subtotalPrice` and `totalPrice`.
5. Wizard displays totals.

**Alternative Flows:**
- **Page range out of bounds:** server returns 400 with field error.
- **Server-calculated price differs from client estimate:** server is authoritative.

---

## UC-12 — Place order in queue mode

**Actor:** Customer

**Main Flow:**
1. Customer is on a shop's detail screen with an active slot.
2. Customer taps "Print Now," enters wizard in QUEUE mode.
3. Wizard skips slot selection.
4. Customer uploads, configures, previews price, picks payment method (WALLET or CASH), confirms.
5. App calls `POST /orders` with `pickupMode: QUEUE`.
6. Server auto-assigns to the active ShopSlot (`SlotsService.getActiveSlot`).
7. Server calculates price, generates `orderNumber` (`PS-XXXXX`), creates Order + OrderFiles, increments `ShopSlot.currentCount`, and (if WALLET) debits Wallet — all in one transaction.
8. Server fires `ORDER_PLACED` notification to customer and `NEW_ORDER` to staff + owner.
9. Mobile navigates to order detail screen.

**Alternative Flows:**
- **No active slot at submission time:** 400 → "Print Now unavailable right now."
- **Wallet insufficient:** 402 → "Insufficient Wallet balance."
- **Shop status changed to non-ACTIVE between preview and submit:** 400.

---

## UC-13 — Place order in slot mode

**Actor:** Customer

**Main Flow:**
1. Customer taps "Schedule Pickup" on shop detail screen.
2. Wizard step 1: date picker (today to today + 3), slot list (`GET /shops/:id/slots?date=`).
3. Customer selects a slot (only open, non-full slots shown).
4. Steps 2–4 identical to UC-12.
5. App calls `POST /orders` with `pickupMode: SLOT, slotId`.
6. Server validates date within horizon, capacity, performs atomic transaction.

**Alternative Flows:**
- **Slot fills between preview and submit:** 409 → "This slot is now full."
- **Date > today + 3 days:** 400.

---

## UC-14 — Pay via Wallet

**Actor:** Customer (within UC-12 or UC-13)

**Main Flow:**
1. Wizard payment step shows current Wallet balance.
2. Customer selects WALLET.
3. Server inserts DEBIT `WalletTransaction` inside the same transaction as Order creation. Re-checks balance before insert.
4. After commit, `WALLET_DEDUCTED` notification fired. If new balance < `LOW_BALANCE_THRESHOLD`, `LOW_BALANCE` notification fired.

**Alternative Flow:**
- **Balance < totalPrice at debit time:** 402 — no Order is created.

---

## UC-15 — Pay via cash at pickup

**Actor:** Customer

**Main Flow:**
1. Wizard payment step. Customer selects CASH.
2. Order created without Wallet debit.
3. At pickup, Staff sets status to COLLECTED — this implicitly marks cash received. No separate payment step.

---

## UC-16 — View live queue position and ETA

**Actor:** Customer

**Main Flow:**
1. Customer is on order detail screen for a QUEUED order.
2. Screen displays `queuePosition` and `etaMins`.
3. Both values update on every `order:queue_updated` socket event.
4. Both recompute on every TanStack Query refetch (30 s fallback).

**Computation:**
- `queuePosition`: count of orders at the same shop+date with status QUEUED or PROCESSING and `createdAt` < this order's `createdAt`, plus 1.
- `etaMins`: ETA algorithm using last 20 READY orders or fallback rate.

---

## UC-17 — Track order status in real time

**Actor:** Customer

**Main Flow:**
1. Customer opens order detail screen.
2. Socket emits `order:join { orderId }`.
3. Server tracks the socket in room `order:${orderId}`.
4. When staff advances status, server emits `order:status_changed { orderId, status, updatedAt }` to the room.
5. Mobile updates TanStack Query cache directly — UI re-renders.
6. On unmount, socket emits `order:leave` and cleans up listeners.

**Alternative Flow:**
- **Socket disconnects:** disconnect indicator shown; 30 s polling fallback keeps cache fresh; on reconnect, `order:join` re-emitted automatically.

---

## UC-18 — Cancel a queued or scheduled order

**Actor:** Customer
**Preconditions:** Order status is `QUEUED` or `SCHEDULED`

**Main Flow:**
1. Customer taps "Cancel Order" on order detail screen.
2. Confirmation modal.
3. App calls `PATCH /orders/:id/cancel`.
4. Server, atomically: sets status CANCELLED + cancelledAt; if WALLET, credits `ORDER_REFUND` WalletTransaction; if SLOT, decrements `ShopSlot.currentCount`.
5. Fires `ORDER_CANCELLED` notification.

**Alternative Flow:**
- **Status is PROCESSING/READY/COLLECTED:** 400 — cancel not allowed.

---

## UC-19 — Receive automatic Wallet refund on cancellation

**Actor:** Customer

**Main Flow:** Same as UC-18. The refund is a CREDIT `WalletTransaction` with `reason: ORDER_REFUND` and `orderId` set, inserted inside the same Prisma transaction. Atomic — no partial state.

---

## UC-20 — View order history

**Actor:** Customer

**Main Flow:**
1. Customer opens "Orders" tab.
2. App calls `GET /orders` — returns own orders, paginated.
3. List shows OrderCard per row: OrderNumber, shop name, status badge, total price (৳), relative date.
4. Tapping a row navigates to order detail.

---

## UC-21 — View order receipt

**Actor:** Customer

**Main Flow:**
1. Customer opens order detail screen.
2. Screen shows: OrderNumber (PS-XXXXX), shop name + address, each OrderFile with its PrintConfig + subtotal, payment method, total price (৳), createdAt timestamp.

---

## UC-22 — View Wallet balance and transactions

**Actor:** Customer

**Main Flow:**
1. Customer opens Wallet tab.
2. App calls `GET /wallet` for current balance (sum of all CREDIT − DEBIT).
3. App calls `GET /wallet/transactions` for paginated history.
4. List shows: type (CREDIT/DEBIT), reason, amount (+৳ green or −৳ red), createdAt.
5. If balance < 50, low-balance banner shown.

---

## UC-23 — Receive push notifications

**Actor:** Any authenticated user

**Main Flow:** Server fires `NotificationsService.send(userId, type, title, body, orderId?)` for any of the 12 event types. Service:
1. Creates a `Notification` DB row (always, regardless of push outcome).
2. Fetches all `UserDevice` rows for the user.
3. Sends Expo push to each.
4. On `DeviceNotRegistered`, deletes that UserDevice row silently.

---

## UC-24 — View in-app notification list

**Actor:** Any authenticated user

**Main Flow:**
1. User opens Notifications tab.
2. App calls `GET /notifications` paginated.
3. List shows: icon (per type), title, body, relative time, unread indicator.
4. Unread count badge shown on tab icon.

---

## UC-25 — Mark notifications as read

**Actor:** Any authenticated user

**Main Flow:** Tapping an unread notification calls `PATCH /notifications/:id/read`. "Mark all read" calls `PATCH /notifications/read-all`. Cache invalidated after each.

---

## UC-26 — View staff job dashboard

**Actor:** Staff or Shop Owner

**Main Flow:**
1. User opens "Jobs" tab.
2. App calls `GET /orders` — server scopes to `User.shopId`.
3. List sorted: SLOT orders first (by slot date+time), then QUEUE orders (by createdAt).
4. Each row shows OrderNumber, status badge, file count, customer name, total price.
5. `refetchInterval: 30_000` provides fallback polling.

---

## UC-27 — View full job specification

**Actor:** Staff or Shop Owner

**Main Flow:**
1. Staff taps a job row.
2. App calls `GET /orders/:id`.
3. Screen shows: OrderNumber, customer name, payment method, total price, each OrderFile with full PrintConfig (colorMode, paperSize, orientation, copies, duplex, pageRange or full document, resolvedPages count, subtotalPrice).
4. "Advance Status" button at bottom; label adapts to current status.

---

## UC-28 — Advance order status step by step

**Actor:** Staff or Shop Owner

**Main Flow:**
1. Staff taps "Advance Status" with target = next valid status.
2. App calls `PATCH /orders/:id/status` with `{ status, expectedCurrentStatus }`.
3. Server checks: optimistic lock matches, transition valid, role owns shop.
4. Server updates status, stamps timestamps (processingStartedAt or readyAt), fires gateway events and notifications.

**Valid transitions:** QUEUED→PROCESSING, SCHEDULED→PROCESSING, PROCESSING→READY, READY→COLLECTED. Any other returns 400.

---

## UC-29 — Handle optimistic-lock conflict

**Actor:** Staff or Shop Owner

**Main Flow:**
1. Two staff members tap "Advance" near-simultaneously.
2. The first request wins; the second's `expectedCurrentStatus` no longer matches the DB.
3. Server returns 409.
4. Mobile shows toast "Status was updated by another device — refreshing" and invalidates the orders query. The user can retry from the new state.

---

## UC-30 — Register a shop

**Actor:** Shop Owner
**Preconditions:** Registered as SHOP_OWNER; has no existing shop

**Main Flow:**
1. After login, owner lands on shop screen with "Create Shop" CTA.
2. Owner enters name, address, phone, pricing rates.
3. App calls `POST /shops`.
4. Server creates Shop with `status: PENDING` and `ownerId = currentUser.id`.
5. Owner sees "Pending approval" state. App polls/refetches.

**Alternative Flow:**
- **Owner already has a shop:** server returns 409 (unique ownerId).

---

## UC-31 — Edit shop details and pricing

**Actor:** Shop Owner

**Main Flow:**
1. Owner opens shop screen and taps "Edit."
2. Owner changes name/address/phone or any pricing rate.
3. App calls `PATCH /shops/:id`.
4. Server updates and returns updated Shop.

**Note:** Edits are permitted at any shop status; price changes affect only new orders (already-placed orders use their original total).

---

## UC-32 — Resubmit a rejected shop

**Actor:** Shop Owner
**Preconditions:** Shop status is `REJECTED`

**Main Flow:**
1. Owner sees rejection reason on shop screen.
2. Owner edits shop fields to address the reason.
3. Owner taps "Resubmit."
4. App calls `PATCH /shops/:id/resubmit`.
5. Server transitions status to PENDING.

**Alternative Flow:**
- **Status is SUSPENDED:** server returns 400 — admin reinstatement required.

---

## UC-33 — Open and close shop time slots

**Actor:** Shop Owner

**Main Flow:**
1. Owner opens Slots screen.
2. Screen lists dates today → today + 3 and all non-deleted SlotTemplates.
3. Per (template, date), owner toggles open/closed and sets maxOrders.
4. App calls `POST /shops/:id/slots` with `{ templateId, date, isOpen, maxOrders }`.
5. Server upserts ShopSlot row.

**Alternative Flow:**
- **Reducing maxOrders below currentCount:** allowed; slot immediately closes to new bookings; existing Orders unaffected.

---

## UC-34 — Promote a Customer to Staff

**Actor:** Shop Owner

**Main Flow:**
1. Owner opens Staff tab and taps "Add Staff."
2. Owner enters the userId (or email — implementation choice; for v1, userId).
3. App calls `POST /shops/:id/staff { userId }`.
4. Server verifies target has role CUSTOMER. If yes, sets role STAFF and shopId.
5. Server fires `STAFF_ASSIGNED` notification.

**Alternative Flow:**
- **Target user is not CUSTOMER:** 400.

---

## UC-35 — Demote a Staff member

**Actor:** Shop Owner

**Main Flow:**
1. Owner taps "Remove" on a staff row.
2. App calls `DELETE /shops/:id/staff/:userId`.
3. Server sets role CUSTOMER and shopId NULL.
4. Removal succeeds even if staff has PROCESSING orders — those continue under their original assignment.

---

## UC-36 — View shop daily analytics

**Actor:** Shop Owner

**Main Flow:**
1. Owner opens Analytics tab.
2. Date picker defaults to today.
3. App calls `GET /shops/:id/analytics?date=YYYY-MM-DD`.
4. Server returns: totalOrders, revenue (COLLECTED orders only), byStatus counts, avgProcessingMins.
5. UI shows cards + status breakdown chips.

---

## UC-37 — Approve or reject a shop application

**Actor:** Platform Admin

**Main Flow:**
1. Admin opens Shops tab > Pending sub-tab.
2. Admin taps Approve → `PATCH /shops/:id/status { status: 'ACTIVE' }`.
3. OR taps Reject → modal asks for `rejectionReason` → `PATCH /shops/:id/status { status: 'REJECTED', rejectionReason }`.
4. Server fires `SHOP_APPROVED` or `SHOP_REJECTED` notification to the owner.

---

## UC-38 — Suspend or reinstate a shop

**Actor:** Platform Admin

**Main Flow:**
1. Admin opens an ACTIVE shop. Taps "Suspend" → `PATCH /shops/:id/status { status: 'SUSPENDED' }`.
2. Server fires `SHOP_SUSPENDED` notification.
3. SUSPENDED shop's existing orders complete; new orders blocked.
4. Admin can later reinstate: `PATCH /shops/:id/status { status: 'ACTIVE' }` (or SUSPENDED→REJECTED).

---

## UC-39 — Manage SlotTemplates

**Actor:** Platform Admin

**Main Flow:**
1. Admin views global SlotTemplate list.
2. Create: `POST /slots/templates { startTime, endTime }`.
3. Edit: `PATCH /slots/templates/:id`.
4. Retire: `DELETE /slots/templates/:id` → sets `deletedAt`. Existing ShopSlots referencing it remain valid; template hidden from list.

---

## UC-40 — Top up any customer's Wallet

**Actor:** Shop Owner or Platform Admin

**Main Flow:**
1. Actor opens admin/owner Wallet management.
2. Enters userId and amount (10 ≤ amount ≤ 10 000).
3. App calls `POST /wallet/topup { userId, amount }`.
4. Server inserts CREDIT WalletTransaction with `reason: TOPUP_ADMIN`.
5. Server fires `WALLET_TOPUP` notification to recipient.

**Alternative Flow:**
- **Amount out of bounds:** 400.

---

## UC-41 — Manage AppConfig values

**Actor:** Platform Admin

**Main Flow:**
1. Admin opens Config screen.
2. Screen lists known keys (`LOW_BALANCE_THRESHOLD`, `SLOT_DURATION_MINS`) with current values.
3. Admin edits a value inline and taps Save.
4. App calls `PATCH /admin/config/:key { value }`.
5. Server upserts AppConfig row.

---

## UC-42 — View platform-wide analytics

**Actor:** Platform Admin

**Main Flow:**
1. Admin opens Analytics tab.
2. App calls `GET /admin/analytics`.
3. Server returns: totalShops, activeShops, pendingApprovals, totalOrders, totalRevenue (COLLECTED orders), revenuePerShop list.
4. UI renders summary cards + per-shop revenue table.

---

## Cross-Cutting Behaviours

| Behaviour | Where it applies |
|---|---|
| **Server response envelope** `{ data, message, statusCode }` | Every API response |
| **Push token fan-out** to all `UserDevice` rows; delete on `DeviceNotRegistered` | UC-23 |
| **Notification DB row always created** even if push fails | UC-23 |
| **Atomic Wallet debit** inside Prisma transaction with balance recheck | UC-14, UC-19 |
| **Atomic Slot capacity** inside Prisma transaction | UC-12, UC-13, UC-18 |
| **Optimistic lock** on status advance | UC-28, UC-29 |
| **i18n via translation keys** — no hardcoded strings | All UI |
| **Real-time tracking primary, polling fallback** | UC-17, UC-26 |
| **BST timezone interpretation** for slot times | UC-12, UC-33 |
| **OrderNumber is human-facing**, UUID is API-facing | UC-21, UC-27 |

---

## Done When…

The platform is considered "use-case complete" when:
- Every UC above has a passing end-to-end test or manual QA walkthrough.
- Every Alternative Flow is verified (especially 400/402/403/409 error paths).
- Both iOS and Android emulators have been used to smoke-test each customer-facing UC.
