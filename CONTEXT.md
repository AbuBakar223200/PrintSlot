# PrintSlot — Agent Context

Read this before touching any file.

> **🎨 UI Ground Truth (mobile).** For ANY mobile UI work, two references are authoritative and must be read first:
> 1. **`docs/09-ui-ux-design-spec.md`** — the locked design system + per-screen spec.
> 2. **`prototype/`** — the interactive high-fidelity prototype (open `prototype/index.html`); the visual source of truth.
>
> **Precedence on conflict:** the **prototype + spec define the visual / interaction design**; the **PRD / CONTEXT / `docs/05-api-contract.md` define behavior & feature scope**. If they disagree, **PRD wins for behavior, the prototype wins for look** (e.g. the prototype's customer wallet "Top Up" button is a demo artifact the PRD forbids — it stays out). Never ship UI that diverges from these two.

---

## Document Map

Use this to know which file to open before doing any work.

| I need to know… | Read |
|---|---|
| What we are building and why | `docs/PRD.md` §1–4 |
| Core user flows step by step | `docs/PRD.md` §5 |
| Full feature list with acceptance criteria | `docs/PRD.md` §6 + `docs/02-feature-registry.md` |
| Every entity, field, constraint, pricing formula, ETA algorithm | `docs/04-data-model.md` |
| Every API endpoint, request/response shape, WebSocket events | `docs/05-api-contract.md` |
| High-level architecture, ADRs, module folder layout | `docs/TECHNICAL_DESIGN.md` |
| Full ADR text (rationales, alternatives considered) | `docs/03-architecture-decisions.md` |
| Recent architecture handoff notes for future agents | `docs/architecture-handoff.md` |
| What "done" looks like (21 criteria) | `docs/06-definition-of-done.md` |
| Coding rules, patterns, examples for NestJS + React Native | `docs/CODING_STANDARDS.md` |
| Known risks and mitigations | `docs/07-risk-register.md` |
| Implementation slice status and GitHub issue mapping | `docs/08-implementation-slices.md` |
| UI/UX design system, tokens, per-screen spec (read before any mobile UI work) | docs/09-ui-ux-design-spec.md |
| What is explicitly NOT being built in v1 | `docs/PRD.md` §4 (Non-Goals) — summary below |

---

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

9. **Reuse before writing new code.**
   Before adding any function, component, hook, service, DTO, type, utility, or test helper, search the repo for an existing equivalent. Reuse, extend, or move existing code instead of duplicating it. If duplication is unavoidable, document the reason in the PR/commit notes.

---

## Git Workflow

```
main          ← production-stable, never branch from here for dev work
development   ← integration branch, base for all feature branches
ihm/<type>/<desc>  ← feature branches
```

| Action | Command |
|---|---|
| Start new feature | `git checkout -b ihm/<type>/<desc> origin/development` |
| PR target | `development` (never `main`) |
| Release | `development` → `main` only at release time |

**Branch naming:** `ihm/<type>/<kebab-case-description>` — see `CLAUDE.md` for full rules.

---

## Naming Conventions

- Files: `camelCase.ts` (services, hooks, utils)
- Components: `PascalCase.tsx`
- Test files: `fileName.test.ts` or `fileName.spec.ts`
- Zustand stores: `useXxxStore.ts`
- TanStack hooks: `useXxx.ts` (wraps useQuery/useMutation)
- NestJS DTOs: `action-resource.dto.ts` (e.g. `create-order.dto.ts`)
- NestJS modules: `<feature>.module.ts`
- NestJS services: `<feature>.service.ts`
- NestJS controllers: `<feature>.controller.ts`
- NestJS gateways: `<feature>.gateway.ts` (WebSocket — orders module only)
- Mobile API wrappers: `<feature>.api.ts` (typed fetch functions, called by hooks)
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

**Profile**
A User's editable self-data: name, phone, and (after Slice 33) language. Mutated via `PATCH /users/me`. The user-facing screen is the Profile screen — never call it "Settings" (Settings refers to AppConfig).
_Avoid_: settings, account, my info, preferences

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

---

## Order State Machine

The only valid status transitions. Any other transition → 400.

```
                    [Customer]
QUEUED     ──────────────────────────► CANCELLED
    │                                       ▲
    │ [Staff]                               │ [Customer, before PROCESSING only]
    ▼                                       │
PROCESSING ──► READY ──► COLLECTED    SCHEDULED
                               ▲           │
                               │           │ [Staff]
                               └───────────┘
```

Linear form:
```
QUEUED     → PROCESSING → READY → COLLECTED   (queue mode, staff-driven)
SCHEDULED  → PROCESSING → READY → COLLECTED   (slot mode, staff-driven)
QUEUED     → CANCELLED                         (customer only)
SCHEDULED  → CANCELLED                         (customer only)
```

- `processingStartedAt` stamped on → PROCESSING.
- `readyAt` stamped on → READY.
- `cancelledAt` stamped on → CANCELLED.
- Optimistic lock: `PATCH /orders/:id/status` requires `expectedCurrentStatus`; 409 on mismatch.

---

## Pricing Formula

Lives exclusively in `OrdersService.calculatePrice()`. Never on the client.

```
Per OrderFile:
  base      = resolvedPages × copies × (colorMode=COLOR ? colorRate : bwRate)
  surcharge = paperSize=A3  ? resolvedPages × copies × a3Surcharge : 0
  body      = duplex        ? base × (1 − duplexDiscount)           : base
  subtotal  = body + surcharge

Order:
  totalPrice = SUM(subtotal for all OrderFiles)
  resolvedPages = pageRange ? parseRange(pageRange).length : detectedPages
```

`totalPrice`, `subtotalPrice`, `resolvedPages` — never accepted from any client request body.
`POST /orders/preview-price` uses the identical formula — they must never diverge.

---

## API Error Codes

| Code | Meaning in this system |
|---|---|
| 400 | Zod validation failure; violated business rule (cancel too late, wrong status step, resubmit on SUSPENDED shop, file count outside 1–10, page range out of bounds, booking horizon exceeded, wallet top-up limits violated) |
| 401 | Missing or expired JWT → redirect to login |
| 402 | Insufficient Wallet balance — only this code, nothing else |
| 403 | Role or ownership violation |
| 404 | Resource not found |
| 409 | Optimistic lock mismatch; slot full; duplicate (shopId, templateId, date) |
| 413 | File exceeds 20 MB (Multer, automatic) |
| 415 | Unsupported MIME type |
| 500 | Unhandled server exception — log server-side, return generic message to client |

---

## WebSocket Events (namespace `/orders`)

Handshake auth: `{ token: <supabase-jwt> }`.

| Event | Direction | Payload | When |
|---|---|---|---|
| `order:join` | Client → Server | `{ orderId }` | Customer mounts Order Detail screen |
| `order:leave` | Client → Server | `{ orderId }` | Customer unmounts Order Detail screen |
| `order:status_changed` | Server → Client | `{ orderId, status, updatedAt }` | Staff advances status |
| `order:queue_updated` | Server → Client | `{ orderId, position, etaMins }` | Any status change that shifts queue positions |

- Always emit `order:leave` and `socket.off(...)` in the `useEffect` cleanup.
- On reconnect, re-emit `order:join` automatically.
- Update TanStack Query cache directly on socket events — do not push to Zustand.
- TanStack Query polls `GET /orders/:id` every 30 s as fallback — never `setInterval` in `useEffect`.

---

## Notification Events (all 12)

Every event must: (1) create a `Notification` DB row, (2) push to all `UserDevice` rows for the recipient. Push failure is non-fatal. DB record is always created regardless of push outcome.

| Event type | Recipient |
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
| `STAFF_ASSIGNED` | Promoted user |
| `LOW_BALANCE` | Customer (fires after every debit where new balance < `AppConfig.LOW_BALANCE_THRESHOLD`) |

---

## ETA Algorithm (summary)

Full spec: `docs/04-data-model.md` § Queue ETA Algorithm.

1. Take the last 20 completed Orders (`status=READY`) at this Shop.
2. Compute `avgMinsPerColorPage` and `avgMinsPerBWPage` from their `processingStartedAt → readyAt` durations.
3. **Fallback** (< 10 completed orders): use `shop.defaultProcessingMins / 10` as rate for both.
4. For each Order ahead in the queue: `estimated = colorPages × colorRate + bwPages × bwRate`.
5. Customer ETA = sum of all orders ahead + this order's own estimate.

Broadcast via `order:queue_updated` on every status change that affects queue position. Never stored — always recomputed fresh.

---

## V1 Non-Goals

Do not build these. Any PR adding them will be rejected.

- Payment gateway (bKash / card). Wallet top-up is admin-credit only in v1.
- PDF receipt export and receipt image sharing (P1 — after v1).
- Web dashboard. All roles are mobile-only.
- Multi-shop ownership. One Shop Owner = one Shop.
- Customer support / dispute / manual refund UI.
- Document preview before printing.
- Direct printer integration (hardware).
- Guest ordering. All users must be registered.
- Advanced analytics (trend charts, per-staff productivity, forecasting).

---

## Module API Responsibilities (quick reference)

| Module | Owns |
|---|---|
| `auth` | Register, login, JWT validation, `GET /auth/me` |
| `users` | Profile update, UserDevice upsert/delete |
| `shops` | Shop CRUD, status transitions (`PATCH /shops/:id/status`), slot availability queries |
| `slots` | SlotTemplate CRUD (admin), ShopSlot open/close (owner) |
| `upload` | File validation, Cloudinary upload, PDF page detection via `pdf-parse` |
| `orders` | Order creation, price calculation, status advance, cancel, history, ETA, WebSocket gateway (`OrdersGateway`) |
| `wallet` | Balance query, transaction history, debit, credit, top-up (admin + gateway stub) |
| `notifications` | Notification row creation, Expo push fan-out, mark-read |
| `staff` | Staff assignment (`POST /shops/:id/staff`), demotion (`DELETE /shops/:id/staff/:userId`) |
| `admin` | Platform analytics, AppConfig CRUD |
