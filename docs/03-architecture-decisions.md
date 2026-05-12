# Architecture Decisions

> See also: [`CONTEXT.md`](../CONTEXT.md) — stack summary, golden rules, and naming conventions that all ADRs below are derived from or extend.

---

## ADR-001 — Single app, role-based routing

**Decision:** One React Native app serves all 4 roles. Expo Router route groups `(auth)`, `(customer)`, `(staff)`, `(admin)` gate access by role. Root `_layout.tsx` reads role from auth state and redirects accordingly.

**Rationale:** Simpler build pipeline, single codebase, route groups already scaffolded. All roles share auth, notification, and wallet infrastructure.

**Alternative considered:** Separate apps per role — rejected: build overhead exceeds benefit for a 5-person team; shared infra (push tokens, wallet) would duplicate across apps.

---

## ADR-002 — Supabase Auth + NestJS JWT validation, role in DB

**Decision:** Supabase issues JWTs on login. NestJS validates them via `supabase-jwt.strategy.ts`. User role stored in `users.role` DB column — not embedded in JWT claims.

**Rationale:** Role is mutable (Platform Admin can change a user's role). JWT is stateless and cached on device — embedding role in token means stale roles until token rotation. DB is authoritative.

**Alternative considered:** Embed role in JWT custom claims — rejected: stale role risk, requires token refresh on every role change.

---

## ADR-003 — Unified Order entity for queue + slot modes

**Decision:** Single `Order` model with `pickupMode: QUEUE | SLOT` and nullable `slotId`. Queue position derived at query time (rank `QUEUED` orders by `createdAt` within same shop + day). No separate tables per mode.

**Rationale:** Minimal-friction UX — one order creation flow, two modes. Single order history query. Single receipt format. Staff dashboard unified view.

**Alternative considered:** Separate `SlotOrder` / `QueueOrder` tables — rejected: duplicates validation, pricing, notification, and receipt logic.

---

## ADR-004 — Wallet as immutable transaction ledger

**Decision:** `WalletTransaction` table records every credit and debit as immutable rows. Current balance = `SUM(amount WHERE type=CREDIT) - SUM(amount WHERE type=DEBIT)` per user. No mutable `balance` column on `User`.

**Rationale:** Full audit trail. Prevents balance corruption on concurrent writes. Refunds are just new CREDIT rows — no update needed.

**Alternative considered:** Mutable `balance` column — rejected: race condition on concurrent orders from same user; no history for disputes.

**Concurrency note:** Wallet debit executed inside a Prisma transaction that re-checks the balance sum before inserting the debit row.

---

## ADR-005 — Cloudinary for all file storage, upload via API only

**Decision:** Files uploaded by customer to NestJS `POST /upload`. NestJS streams to Cloudinary. Cloudinary URL stored on `Order.fileUrl`. Mobile never uploads directly to Cloudinary.

**Rationale:** Already in stack. Server-side upload enforces file type/size validation before Cloudinary receives the file. Mobile credentials never exposed.

**Alternative considered:** Cloudinary direct upload from mobile — rejected: exposes API key on device, bypasses server-side validation.

---

## ADR-006 — socket.io for real-time order status, polling as fallback

**Decision:** `OrdersGateway` (socket.io) emits `order:status_changed` to room `order:{orderId}`. Customer joins room on order detail screen mount. TanStack Query polls `GET /orders/:id` every 30 seconds as silent fallback.

**Rationale:** WebSocket gives instant updates. Polling ensures customer is never stuck if WebSocket drops (mobile network changes, app background/foreground transitions).

**Alternative considered:** Supabase Realtime — rejected: introduces second realtime system; socket.io already scaffolded and better fits staff-to-customer broadcast pattern.

---

## ADR-007 — TanStack Query for server state, Zustand for UI-only state

**Decision:** All API data fetched and cached via TanStack Query. Zustand stores only: current auth session, print config wizard state (before order submitted), language preference, connectivity status.

**Rationale:** Mandated by `CONTEXT.md` Golden Rule #5. Prevents stale server data accumulating in Zustand. TanStack Query handles loading, error, refetch, and optimistic update states automatically.

---

## ADR-008 — Prisma as sole DB access layer, models mapped to shared types at API boundary

**Decision:** All DB access via `PrismaService` inside `apps/api/src/`. API services map Prisma models to shared types from `packages/shared` before returning responses. Mobile never imports `@prisma/client`.

**Rationale:** Mandated by `CONTEXT.md` Golden Rules #1 and #2. Shared types are the contract — Prisma models are implementation detail.

---

## ADR-009 — Slot + queue as single order placement flow

**Decision:** Order placement screen presents one binary choice: "Print Now" (queue) or "Schedule Pickup" (slot). Both paths submit to `POST /orders`. No separate endpoints or screens per mode.

**Rationale:** Minimum friction — one decision point, one API call, one order entity. Agreed during Phase 3 grilling (Q2).

---

## ADR-010 — Shop registration requires Platform Admin approval

**Decision:** `POST /auth/register` with `role: SHOP_OWNER` creates shop record with `status: PENDING`. Shop is not visible to customers until `status: ACTIVE`. Platform Admin patches status via `PATCH /shops/:id/status`.

**Rationale:** Prevents unvetted shops appearing on platform. Agreed during Phase 3 grilling (Q14).

---

## ADR-011 — Price calculated server-side only

**Decision:** Pricing formula lives exclusively in `OrdersService.calculatePrice()`. Client submits print config + shopId; server returns computed `totalPrice` in order response. Client never computes final price independently.

**Rationale:** Prevents client-side price manipulation. Shop rates can change between client render and order submit — server always uses current rates.
