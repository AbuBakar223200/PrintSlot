# PrintSlot — UI/UX Design System & Per-Screen Specification

> **This document is the single source of truth for visual and interaction design across all four roles** (Customer, Staff, Shop Owner, Platform Admin). It was locked via a structured design review after a full requirements grilling. **Every mobile UI slice must conform to this spec before it is considered done.** It also governs the reskinning of the already-built screens (login, register, shop list, shop detail, profile).
>
> **Read this before implementing any mobile UI slice.** No exceptions.
>
> **Slices governed by this document:** GitHub issues #24, #26, #28, #30, #32, #34, #36, #37, #38, #39, #40, #41 — corresponding to slices 16, 18, 20, 22, 24, 26, 28, 29, 30, 31, 32, 33.
>
> **Companion documents** (read alongside, not instead of, this one):
> - `CONTEXT.md` — domain language, golden rules, business rules. The law.
> - `docs/PRD.md` — what we are building and why; non-goals.
> - `docs/05-api-contract.md` — every endpoint, request/response shape, WebSocket events, error codes.
> - `AGENTS.md` — full React Native rules with code examples.
> - `docs/slices/*` — per-slice acceptance criteria.

---

## Table of Contents

1. [North Star & Pillars](#1--north-star--pillars)
2. [Locked Design Decisions (13 Forks)](#2--locked-design-decisions-13-forks)
3. [Color Tokens](#3--color-tokens)
4. [StatusBadge & Icon Maps](#4--statusbadge--icon-maps)
5. [Component System](#5--component-system)
6. [Motion Budget](#6--motion-budget)
7. [State System](#7--state-system)
8. [Per-Screen Specification](#8--per-screen-specification)
   - 8.1 [Login](#81-login-built--reskin)
   - 8.2 [Register](#82-register-built--reskin)
   - 8.3 [Home](#83-home-slice-32--40)
   - 8.4 [Shop List](#84-shop-list-slice-05-built--reskin)
   - 8.5 [Shop Detail](#85-shop-detail-slice-06-built--reskin)
   - 8.6 [Order Wizard](#86-order-wizard-slice-14--rebuild-required)
   - 8.7 [Order Detail + Tracking](#87-order-detail--tracking-slice-16-24--trust-surface)
   - 8.8 [Order History](#88-order-history-slice-18-26)
   - 8.9 [Wallet](#89-wallet-slice-22-30--trust-surface)
   - 8.10 [Notifications](#810-notifications-slice-24-32)
   - 8.11 [Profile Hub](#811-profile-hub-built--reskin--extend)
   - 8.12 [Staff Job Dashboard](#812-staff-job-dashboard-slice-20-28)
   - 8.13 [Staff Job Detail + Advance](#813-staff-job-detail--advance-slice-20)
   - 8.14 [Staff Profile](#814-staff-profile)
   - 8.15 [Owner Shop Screen](#815-owner-shop-screen-slice-30)
   - 8.16 [Owner Slots](#816-owner-slots-slice-31-39)
   - 8.17 [Owner Jobs](#817-owner-jobs-slice-31)
   - 8.18 [Owner Analytics](#818-owner-analytics-slice-31)
   - 8.19 [Owner Staff Management](#819-owner-staff-management-slice-26-34)
   - 8.20 [Owner Profile](#820-owner-profile)
   - 8.21 [Admin Shop Approval](#821-admin-shop-approval-slice-28-36)
   - 8.22 [Admin Analytics](#822-admin-analytics-slice-29-37)
   - 8.23 [Admin Config](#823-admin-config-slice-29)
   - 8.24 [Admin Slot Templates](#824-admin-slot-templates-slice-29)
   - 8.25 [Admin Profile](#825-admin-profile)
9. [Build Plan](#9--build-plan)
10. [Open Risks](#10--open-risks)

---

## 1 — North Star & Pillars

**North star:** *Calm, fast, trustworthy utility.*

Printing is a chore. We win on **speed**, **clarity**, and **trust** (price and live status) — not ornament. The aesthetic target is **fintech-grade clean**, localized for Bangladesh: campus environments, outdoor sunlight legibility, and low-end LCD Android hardware.

### Seven Pillars

| # | Pillar | What it means |
|---|---|---|
| A | **One tokenized language** | Every color, radius, font, and spacing value comes from a single semantic token set. Zero raw hex in screens. |
| B | **Foundation before screens** | Tokens, type, icons, ambient background, primitives, and i18n core (F1–F6) land *before* any screen work. |
| C | **Component-first** | Screens are assembled from shared primitives and composites. No bespoke one-off styling per screen. |
| D | **State-complete screens** | Every screen ships loading, empty, error, and offline states — not just the happy path. |
| E | **Shell-consistent, role-tuned** | All four roles share the same shell language (Screen, header avatar → Profile, tab bar), tuned per role's tabs and permissions. |
| F | **Over-invest in trust surfaces** | The price breakdown, status timeline, and wallet ledger get disproportionate design care. These are where trust is won or lost. |
| G | **BD-first** | Sunlight-legible contrast, Bengali typography and numerals, the ৳ currency symbol, and a strict low-end performance budget are first-class — not afterthoughts. |

---

## 2 — Locked Design Decisions (13 Forks)

Each decision below was resolved during the design review and is now **locked**. Do not relitigate without an explicit design-review reopening.

### Fork 1 — Aesthetic direction

**Decision:** Clean, **light-first fintech** — not premium-dark-glass.

**Rationale:** Trust and legibility beat spectacle for a utility used in sunlight on cheap screens. **Kill the old hardcoded blue per-screen gradients and the decorative "orb" blobs.** They fight legibility and were never tokenized.

### Fork 2 — Theme modes

**Decision:** Full **light + dark**, both polished, driven by **strictly semantic tokens**. Auto-follow the system theme by default, with a **manual override in Profile**.

**Rationale:** Dark mode is non-negotiable for evening campus use; semantic tokens are the only way to keep both themes correct without per-screen forks.

### Fork 3 — Accent identity

**Decision:** **Indigo** is the `primary` trust accent (light `#4F46E5`, dark `#6366F1`). **Orange (`#FF6B35`) is retired.** Status colors remain semantic (success/warn/error/info).

> **Logo note:** the app logo and wordmark must be **recolored from orange to indigo**. Track this in Open Risks.

**Rationale:** Indigo reads as calm, financial, trustworthy. Orange read as cheap and energetic — the wrong signal for money and live status.

### Fork 4 — Typography

**Decision:** **Inter** for Latin UI and body (with **tabular figures** for money), **Hind Siliguri** for Bengali. Embed both via the **`expo-font` config plugin (build-time)** — **not** async `useFonts`.

**Rationale:** Build-time embedding removes first-paint font flash; tabular figures stop money values from jittering as digits change.

### Fork 5 — Iconography

**Decision:** **`lucide-react-native`** exclusively. **Emoji icons are banned.** Each OrderStatus, notification type, tab, and primary action maps to a **fixed** lucide icon (see Section 4).

**Rationale:** Emoji render inconsistently across Android OEMs and break the calm aesthetic. A fixed icon map makes status instantly recognizable.

### Fork 6 — Surfaces

**Decision:** An **ambient animated gradient backdrop** + **frosted translucent hero cards** (`expo-blur`) + **solid content cards** in lists and dense data. Radius: **16** for cards, **12** for controls, **full** for pills; all with `borderCurve: 'continuous'`.

**Rationale:** Frost is reserved for hero zones (one per screen) where depth adds trust; solid cards keep dense lists legible and cheap to render on low-end devices.

### Fork 7 — Motion

**Decision:** Restrained and meaningful. Full budget in [Section 6](#6--motion-budget).

### Fork 8 — Primitives + native modals

**Decision:** A fixed primitive set (Section 5). Sheets use native **`<Modal presentationStyle="formSheet">`**; context menus use **`zeego`**. **No JS bottom-sheet library** (per AGENTS rule).

**Rationale:** Native modals match platform expectations and avoid the gesture-jank of JS bottom sheets on low-end Android.

### Fork 9 — Navigation

**Decision:** **4 customer tabs** — Home, Orders, Wallet, Notifications. **Profile is reached via the avatar in the Home header** — it is *not* a tab and is *never* called "Settings" (the domain forbids "Settings"; see CONTEXT.md). Profile is the hub for editing name/phone, Language, Theme, and logout. The same **avatar → Profile** pattern applies to staff, owner, and admin shells.

**Rationale:** Four tabs is the legible maximum; Profile is low-frequency and belongs in the header, not the bottom bar. "Settings" is reserved for `AppConfig`, which only Platform Admin touches.

### Fork 10 — State system

**Decision:** **Skeleton** loading, **lightweight lucide-icon empty states**, **inline error + Retry**, and an **app-wide offline Banner**. Full matrix in [Section 7](#7--state-system).

### Fork 11 — i18n numerals

**Decision:** In **BN mode**, render **full Bengali numerals** (১২৩) for money, counts, dates, ETA, and queue position — via `Intl.NumberFormat('bn-BD')` and `Intl.RelativeTimeFormat('bn')` (native Bengali digits), **hoisted to module scope**. **`OrderNumber` (`PS-XXXXX`) stays ASCII always**, in both languages.

**Rationale:** A half-localized app feels broken to Bengali readers; but the OrderNumber is a counter reference read aloud at a physical counter, so it must stay machine-stable ASCII.

### Fork 12 — Analytics visualization

**Decision:** **`react-native-gifted-charts`**, **day-level only** — a status-breakdown donut and a revenue-per-shop bar chart. **No time-series or trend lines** (a PRD non-goal).

**Rationale:** Trend analytics is explicitly out of scope for v1; day-level snapshots answer the only questions owners and admins need.

### Fork 13 — Accessibility floor

**Decision:** WCAG **AA contrast** validated against the **blended frost surface** (not the raw gradient); **44×44 minimum touch targets**; screen-reader labels on **every** icon, IconButton, StatusBadge, and unread dot; OS dynamic-type scaling **capped at ~1.3×**; honor **reduce-motion** and **reduce-transparency**.

**Rationale:** This is the floor, not the ceiling. Validating contrast against the blended frost (not the gradient beneath) is what guarantees body text actually clears AA in production.

---

## 3 — Color Tokens

These **semantic** tokens replace the raw palette in `apps/mobile/src/config/theme.ts`. Screens consume tokens via the `useThemeTokens` hook (F1) — **never** raw hex.

| Token | Role | Light | Dark |
|---|---|---|---|
| `bgGradient` | Ambient backdrop | pale indigo → white → warm wash | deep indigo → `#0B0B14` |
| `surface` | Solid card / sheet base | `#FFFFFF` | `#14151F` |
| `surfaceFrost` | Frosted hero card fill | `rgba(255,255,255,.78)` | `rgba(15,16,26,.66)` |
| `textPrimary` | Headings, primary copy | `#0F1222` | `#F4F5FA` |
| `textSecondary` | Supporting copy | `#51566B` | `#AEB2C4` |
| `textMuted` | De-emphasized / meta | `#8A8FA3` | `#6E7388` |
| `border` | Hairlines, dividers, input borders | `#E6E8F0` | `#262838` |
| `primary` | Indigo accent, primary actions | `#4F46E5` | `#6366F1` |
| `primaryPressed` | Pressed state of primary | `#4338CA` | `#4F46E5` |
| `success` | READY, credits, positive | `#16A34A` | `#22C55E` |
| `warn` | PROCESSING, low-balance, caution | `#D97706` | `#F59E0B` |
| `error` | CANCELLED, debits, destructive | `#DC2626` | `#F87171` |
| `info` | QUEUED, informational banners | `#2563EB` | `#3B82F6` |

**Frost opacity floor.** `surfaceFrost` has a hard opacity floor so body text placed on a hero card always clears AA against the **blended** result (the frost fill composited over whatever gradient sits behind it). Never lower the opacity below the token value to "look glassier."

**Low-end / Android fallback ("fake frost").** Real `expo-blur` runs **only in iOS hero zones**. On Android and low-end devices, substitute a **solid "fake frost" token** — white at ~78% on light, `#0F0F1A` at ~66% on dark — so the hero still reads as a distinct elevated surface without the GPU cost of a live blur.

---

## 4 — StatusBadge & Icon Maps

These maps are **fixed**. The same OrderStatus renders with the **same color and icon** on the customer screen and the staff screen — consistency is what makes status instantly readable.

### 4.1 StatusBadge — OrderStatus

| OrderStatus | Semantic color | Lucide icon |
|---|---|---|
| `QUEUED` | `info` | `ListOrdered` |
| `SCHEDULED` | `violet` | `CalendarClock` |
| `PROCESSING` | `warn` | `Printer` |
| `READY` | `success` | `PackageCheck` |
| `COLLECTED` | `textMuted` | `CheckCheck` |
| `CANCELLED` | `error` | `XCircle` |

> `violet` for `SCHEDULED` is a dedicated badge hue derived from the indigo family; it must clear AA on both frost and solid surfaces.

### 4.2 Notification type icons (lucide)

| Notification type (prefix) | Lucide icon |
|---|---|
| `ORDER_*` (PLACED / ACCEPTED / READY / CANCELLED) | `Printer` |
| `WALLET_*` (TOPUP / DEDUCTED) | `Wallet` |
| `NEW_ORDER` | `ClipboardList` |
| `SHOP_*` (APPROVED / REJECTED / SUSPENDED) | `Store` |
| `STAFF_ASSIGNED` | `UserPlus` |
| `LOW_BALANCE` | `AlertTriangle` |

### 4.3 Tab icons (lucide)

| Shell | Tabs (in order) |
|---|---|
| **Customer** | `Home`, `Receipt`, `Wallet`, `Bell` |
| **Owner** | `Store`, `Briefcase`, `CalendarClock`, `Users`, `BarChart3` |
| **Admin** | Shops (`Store`), Analytics (`BarChart3`), Config (`Settings`), Slot Templates (`CalendarClock`) |

> Admin is the only role where the lucide `Settings` glyph is permissible, because it labels `AppConfig` — the one place "Settings" is the correct domain term.

---

## 5 — Component System

### 5.1 Foundation tickets (F1–F6) — must land before any screen

These six foundation tickets unblock the aesthetic for **every** screen and retro-fix the five already-built screens. **Build them first** (Phase 0).

| Ticket | Scope |
|---|---|
| **F1 — Tokens** | Semantic light + dark token sets (Section 3) + the `useThemeTokens` hook. Replaces the raw palette in `apps/mobile/src/config/theme.ts`. |
| **F2 — Type** | Embed Inter + Hind Siliguri via the `expo-font` config plugin (build-time). Ship the `Text` primitive (font selection + BN awareness + tabular figures for money). |
| **F3 — Icons** | Install `lucide-react-native`; codify the icon maps from Section 4 as a single shared module. |
| **F4 — AmbientBackground** | The transform-animated gradient for both themes. Freeze on reduce-motion. Low-end fallback. **Animate `transform`/`opacity` only — NEVER recompute color stops per frame.** |
| **F5 — Primitives** | The full UI primitive set (§5.2). |
| **F6 — i18n core** | `i18next` (EN + BN) + `bn-BD` Intl formatters + `localize` utilities (module-scoped, per Fork 11). |

### 5.2 UI primitives — `apps/mobile/src/components/ui/`

All primitives are **token-driven** with **zero raw hex and zero emoji**.

| Primitive | Responsibility |
|---|---|
| `Screen` | Root wrapper: safe-area handling, ambient background mount, `contentInsetAdjustmentBehavior="automatic"`. Every screen is wrapped in `Screen`. |
| `Card` | Solid elevated surface for lists and dense data (radius 16, continuous). |
| `FrostCard` | Frosted hero surface (`expo-blur` on iOS, fake-frost token elsewhere). One per screen, hero zones only. |
| `Text` | Font selection (Inter/Hind Siliguri), BN awareness, tabular figures. |
| `Button` | Primary/secondary/danger actions, retuned to indigo. Compound: `Button` + `ButtonText` + `ButtonIcon`. |
| `IconButton` | Single-tap lucide action (≥44×44, screen-reader label required). |
| `Input` | Text field, retuned to indigo focus ring. |
| `StatusBadge` | OrderStatus color + lucide icon (§4.1); color crossfades on status change. |
| `Chip` | Selectable/filter pill (radius full, continuous). |
| `SegmentedControl` | 2–3 option exclusive selector (role picker, Language, Theme, list filters). |
| `Sheet` | Wrapper over native `<Modal presentationStyle="formSheet">`. |
| `Banner` | Inline status strip (info/warn/error) — auth errors, shop-status, offline. |
| `Skeleton` | Content-shaped shimmer placeholder. |
| `EmptyState` | Tinted-circle lucide icon + title + one-line body + CTA. |
| `ListRow` | Generic labeled row for config/table layouts. |
| `Stepper` | Numeric +/- control (copies, maxOrders) with a min bound. |
| `MoneyText` | ৳ + tabular figures, locale-aware digits (Bengali in BN mode). |
| `Avatar` | User/shop avatar or initial fallback. |
| `Toast` | Transient non-blocking confirmation/error. |

### 5.3 Shared composites — `apps/mobile/src/components/shared/`

Higher-order, domain-aware components assembled from primitives. Reuse these across roles — **never copy-paste**.

| Composite | Used by |
|---|---|
| `OrderCard` | Home (recent), Order History |
| `JobRow` | Staff Job Dashboard, Owner Jobs (reused 1:1) |
| `PrintConfigForm` | Order Wizard, Job Detail (read-only) |
| `PriceBreakdown` | Order Wizard (step 3), Order Detail |
| `SlotPicker` | Order Wizard (step 1) |
| `FilePickerCard` | Order Wizard (step 2) |
| `TransactionRow` | Wallet |
| `NotificationRow` | Notifications |
| `ShopApprovalRow` | Admin Shop Approval |
| `StatusTimeline` | Order Detail (trust surface) |
| `AmbientBackground` | Every screen (via `Screen`) |
| `OfflineBanner` | App-wide |
| `DisconnectBanner` | Order Detail (socket down) |

### 5.4 Modals & menus

- **Sheets:** native `<Modal presentationStyle="formSheet">` via the `Sheet` primitive.
- **Context menus:** `zeego`.
- **Never** a JS bottom-sheet library (AGENTS rule, Fork 8).

---

## 6 — Motion Budget

Motion is spent only where it carries meaning. **Kill per-card stagger.**

| Element | Motion |
|---|---|
| **Screen mount** | One subtle screen fade/slide, **≤220ms**. Lists appear **instantly** — no per-row entrance animation. |
| **Press** | Press-scale **0.97**. |
| **StatusBadge** | Color **crossfade** on status change. |
| **Queue position / ETA** | Animated **count-up** on update. |
| **Wallet balance** | Balance **tick** animation on change. |
| **Order placed** | A single success **beat** on confirmation. |
| **Ambient gradient** | Slow **30–60s** transform loop (transform/opacity only). |

**Reduce-motion** is honored globally: the ambient gradient freezes, count-ups and crossfades become instant cuts, and the mount transition is skipped.

---

## 7 — State System

Every screen ships **all** of these states. This matrix is a reusable contract every slice drops in.

| State | Treatment |
|---|---|
| **Loading** | Content-shaped **Skeleton** shimmer (never spinners) so the layout does not jump when data arrives. |
| **Empty** | `EmptyState`: a lucide icon in a tinted circle + a title + a one-line body + a CTA. |
| **Error** | Inline error **Card** with the message + a **Retry** action. |
| **Offline** | App-wide **Banner**. **All mutations are blocked** with an inline offline message — **no API calls fire** while offline. |

Per-screen, status-specific states (e.g. order status blocks, shop status banners) are layered on top of this base matrix and are specified per screen in Section 8.

---

## 8 — Per-Screen Specification

For each screen: **Purpose**, **Anatomy** (top → bottom), **Components**, **States**, **Interactions & motion**, **Role / i18n notes**, and the **slice / issue**.

> **Customer shell.** `<Tabs>`: Home · Orders · Wallet · Notifications. Frosted tab bar, lucide icons, indigo active tint, Notifications `tabBarBadge` fed by `useUnreadCount`. Every screen is wrapped in `Screen`.

---

### 8.1 Login *(built — reskin)*

- **Purpose:** Authenticate an existing user.
- **Anatomy:** ambient background → centered `FrostCard` hero → wordmark (indigo; replace the 🖨️ emoji with a lucide `Printer` or the real recolored logo) → tagline → `Input` (email) → `Input` (password) with an `IconButton` `Eye` toggle (replace the 🙈/👁️ emoji) → error `Banner` → primary `Button` "Sign In" → footer "Sign Up" link.
- **Components:** `Screen`, `FrostCard`, `Text`, `Input`, `IconButton`, `Banner`, `Button`.
- **States:** button spinner while submitting; **401 → inline error `Banner`**; offline → mutation blocked with inline message.
- **Interactions & motion:** hero one-shot fade **≤220ms** on mount.
- **i18n:** all copy localized; numerals N/A.
- **Slice / issue:** built — reskin under Phase 0.

### 8.2 Register *(built — reskin)*

- **Purpose:** Create a new Customer or Shop Owner account.
- **Anatomy:** same shell as Login → role picker (**Customer / Shop Owner** as a `SegmentedControl`) → fields: name, email, phone, password → inline validation.
- **Components:** `Screen`, `FrostCard`, `SegmentedControl`, `Input`, `Banner`, `Button`.
- **States:** inline field validation; submit spinner; offline blocked.
- **Role / i18n notes:** role picker drives the post-register landing shell.
- **Slice / issue:** built — reskin under Phase 0.

### 8.3 Home *(Slice 32 — #40)*

- **Purpose:** The Customer's landing hub — quick search, live order glance, recent activity, and discovery.
- **Anatomy (top → bottom):**
  1. Top bar: greeting "Hello, {firstName}" + `Avatar` (→ Profile). Time-of-day greeting variant uses a **hoisted `Intl`** formatter.
  2. Debounced search `Input` (lucide `Search`) → `/(customer)/shops?search=`.
  3. **Active Orders:** a horizontal `FlashList` of `ActiveOrderCard` (OrderNumber + `StatusBadge` + live ETA/queue). **Hidden entirely if none.**
  4. **Recent Orders:** the last 3 `COLLECTED`/`CANCELLED` as compact `OrderCard` + a "See all" → Orders.
  5. **Discover:** a "Browse shops" CTA.
- **Components:** `Screen`, `Avatar`, `Input`, `FlashList`, `ActiveOrderCard`, `OrderCard`, `StatusBadge`, `Button`, `EmptyState`.
- **States:** skeleton on load; **new-user empty** → icon-empty "Place your first order" → shops; offline banner.
- **Interactions & motion:** ETA/queue count-up on the active cards; **no shop queries on Home** (Home never fetches shop data directly — search navigates to the shops screen).
- **Slice / issue:** Slice 32 / #40.

### 8.4 Shop List *(Slice 05, built — reskin)*

- **Purpose:** Browse and search shops.
- **Anatomy:** `FlashList` of restyled `ShopCard` (solid `Card`, shop `Avatar`/initial, name, address with lucide `MapPin`, an `ACTIVE` dot) + a debounced search `Input`.
- **Components:** `Screen`, `Input`, `FlashList`, `ShopCard`, `Card`, `Avatar`, `Skeleton`, `EmptyState`.
- **States:** skeleton rows on load; icon-empty when no matches; error + Retry; offline banner.
- **Slice / issue:** Slice 05 — reskin.

### 8.5 Shop Detail *(Slice 06, built — reskin)*

- **Purpose:** Show a shop's details and pricing, and launch an order.
- **Anatomy (top → bottom):**
  1. `FrostCard` hero: name, address (`MapPin`), phone (`Phone` `IconButton` → `tel:`).
  2. Status `Banner` if the shop is **not ACTIVE**.
  3. Pricing `Card`: a `PriceRow` list rendered with `MoneyText`.
  4. Active-slot strip: "Open now · closes HH:MM" — shown only if `GET /shops/:id/slots/active` is non-null.
  5. Sticky bottom actions: primary **Print Now** (only if an active slot exists) + secondary **Schedule Pickup**.
- **Components:** `Screen`, `FrostCard`, `Banner`, `Card`, `MoneyText`, `IconButton`, `Button`.
- **States:** skeleton hero + pricing; non-ACTIVE banner; offline banner. **Drop the old orb; keep the ambient background.**
- **Interactions:** "Print Now" is gated on the active-slot query (per CONTEXT.md "Print Now availability").
- **Slice / issue:** Slice 06 — reskin.

### 8.6 Order Wizard *(Slice 14 — REBUILD REQUIRED)*

> **Integrity flag:** the closed slice left an **empty stub** at `apps/mobile/app/(customer)/orders/new.tsx` (0 lines) and an empty `PrintConfigForm`. **This screen must be rebuilt.** See Open Risks.

- **Purpose:** Configure and place an order in a single 4-step flow.
- **Anatomy:** a single screen with a `Stepper` header (1/4 … 4/4).
  - **Step 1 — Slot** *(SLOT mode only; QUEUE mode auto-skips this step):* a date `Chip` row (Today / +1 / +2 / +3) → `SlotPicker` (open, non-full slots only; **full slots disabled**). "Next" enabled once a slot is picked.
  - **Step 2 — Files + Config:** `FilePickerCard` (1–10 files, lucide `FilePlus`, per-file upload progress, file-type icon, page-count `Input` for non-PDF files) → a per-file `PrintConfigForm` (colorMode / paperSize / orientation as `SegmentedControl`s, copies as a `Stepper` min 1, duplex `Switch`, pageRange `Input` validated). "Next" enabled once **all** files have `uploadStatus === 'done'` and configs are valid.
  - **Step 3 — Price:** `usePreviewPrice` → `PriceBreakdown` (per-file subtotal + total, `MoneyText`). Skeleton while loading. On preview failure → inline error and a path back to step 2.
  - **Step 4 — Payment:** two selectable `Card`s — **Wallet** (shows `useWalletBalance`; disabled with a hint if balance < total) and **Cash**. "Place Order" → `useCreateOrder` → `router.replace('/orders/{id}')` + wizard reset.
- **Components:** `Screen`, `Stepper`, `Chip`, `SlotPicker`, `FilePickerCard`, `PrintConfigForm`, `SegmentedControl`, `Switch`, `Stepper`, `Input`, `PriceBreakdown`, `MoneyText`, `Card`, `Sheet`, `Toast`, `Button`.
- **Error handling:**
  - **402 (insufficient balance)** → `Sheet` "Insufficient balance · Top up" → Wallet.
  - **409** → `Toast` + return to step 1.
  - **400 (no active slot)** → `Toast`.
  - generic → `Toast`.
- **Interactions & motion:** order-placed success beat on confirmation. Pressing **Back** during steps 2–4 → "Discard order?" `Sheet`.
- **Role / i18n notes:** all money via `MoneyText` (Bengali numerals in BN mode). Price is server-calculated — the client never sends totals.
- **Slice / issue:** Slice 14 — **rebuild**.

### 8.7 Order Detail + Tracking *(Slice 16, #24 — TRUST SURFACE)*

- **Purpose:** Live tracking of a single order. **This is a primary trust surface — over-invest.**
- **Anatomy (top → bottom):**
  1. `FrostCard` header: `OrderNumber` **`PS-XXXXX`** rendered large + `StatusBadge`.
  2. `StatusTimeline` composite: QUEUED/SCHEDULED → PROCESSING → READY → COLLECTED, with the **current node pulsing**, plus a status-specific block:
     - **QUEUED / PROCESSING:** "Position 3 · ~12 min" with a **live animated count-up**.
     - **SCHEDULED:** slot date + time (`CalendarClock`).
     - **READY:** pickup instructions + a **big OrderNumber** to show at the counter.
     - **COLLECTED / CANCELLED:** the relevant timestamp.
  3. Shop `Card`.
  4. Files list: name, `PrintConfig` summary chips, subtotal.
  5. Payment + total `Card`.
  6. **Cancel Order** `Button` — shown **only if status is QUEUED or SCHEDULED** → confirm `Sheet`.
  7. `DisconnectBanner` when the socket is down.
- **Realtime:** `useOrderTracking` joins/leaves the order room and writes to the cache via `setQueryData`; a **30s poll** is the fallback (never `setInterval` in `useEffect`).
- **States:** skeleton on load; **404/403 → icon-empty + Back**; offline banner; `DisconnectBanner` on socket loss.
- **Motion:** current-node pulse; StatusBadge crossfade on change; ETA count-up.
- **i18n:** OrderNumber stays ASCII; position/ETA/money use Bengali numerals in BN mode.
- **Slice / issue:** Slice 16 / #24.

### 8.8 Order History *(Slice 18, #26)*

- **Purpose:** A scrollable history of all the customer's orders.
- **Anatomy:** a `FlashList` of `OrderCard` (OrderNumber + `StatusBadge` / shop + "{n} files" / `MoneyText` + relative time). A **FAB** "New Order" → shops.
- **Components:** `Screen`, `FlashList`, `OrderCard`, `StatusBadge`, `MoneyText`, `EmptyState`, `Button` (FAB), `Sheet`.
- **States:** skeleton on load; **icon-empty "No orders yet" → shops**; pull-to-refresh; offline banner.
- **Interactions:** tap → Order Detail; cancel reachable via `Sheet`; sort **createdAt DESC**.
- **Slice / issue:** Slice 18 / #26.

### 8.9 Wallet *(Slice 22, #30 — TRUST SURFACE)*

- **Purpose:** Show wallet balance and the immutable transaction ledger. **Trust surface — over-invest.**
- **Anatomy (top → bottom):**
  1. Balance hero `FrostCard`: a large `MoneyText` (৳), a "Wallet balance" label, an indigo gradient accent, and a **balance-tick** animation on change.
  2. **LOW_BALANCE** `Banner` (warn) when balance < threshold (default **50**), copy "Balance low — top up at counter". **No top-up button** — top-up is admin-only in v1.
  3. **Transactions** `FlashList` of `TransactionRow`: lucide `ArrowUp` (green, CREDIT) / `ArrowDown` (red, DEBIT), a reason label, a timestamp, and a signed `MoneyText`.
- **Transaction reason label map:**

  | Reason | Label |
  |---|---|
  | `TOPUP_ADMIN` | Top-up by Admin |
  | `TOPUP_GATEWAY` | Gateway Top-up |
  | `ORDER_PAYMENT` | Order Payment |
  | `ORDER_REFUND` | Order Refund |

- **Components:** `Screen`, `FrostCard`, `MoneyText`, `Banner`, `FlashList`, `TransactionRow`, `Skeleton`, `EmptyState`.
- **States:** skeleton on load; icon-empty (no transactions); pull-to-refresh; offline banner.
- **Motion:** balance tick on change.
- **i18n:** all amounts via `MoneyText` (Bengali numerals in BN mode).
- **Slice / issue:** Slice 22 / #30.

### 8.10 Notifications *(Slice 24, #32)*

- **Purpose:** The in-app notification inbox.
- **Anatomy:** header + a "Mark all read" action (shown only when `unread > 0`) → a `FlashList` of `NotificationRow` (lucide icon by type per §4.2, title bold if unread, body, relative time, an unread dot).
- **Components:** `Screen`, `FlashList`, `NotificationRow`, `Button`, `Skeleton`, `EmptyState`.
- **States:** skeleton on load; icon-empty; offline banner.
- **Interactions:** tap → **optimistic `markRead`** + navigate to the order if `orderId` is present. `useUnreadCount` feeds the tab badge.
- **Slice / issue:** Slice 24 / #32.

### 8.11 Profile Hub *(built — reskin + extend)*

- **Purpose:** The single hub for self-data, preferences, and logout. Reached via the header avatar on **every** role's home. **Never called "Settings."**
- **Anatomy (top → bottom):** `Avatar` + name/email → edit name/phone (`PATCH /users/me`) → **Language** `SegmentedControl` (EN / BN) → **Theme** `SegmentedControl` (Light / Dark / System) → **logout** danger `Button` → confirm `Sheet`.
- **Components:** `Screen`, `Avatar`, `Input`, `SegmentedControl`, `Button`, `Sheet`.
- **States:** save spinner; inline validation; offline blocked.
- **Role / i18n notes:** **reused verbatim by all four roles** (customer, staff, owner, admin). Language toggle drives Fork 11 numerals app-wide; Theme toggle drives Fork 2.
- **Slice / issue:** built — reskin + extend (add Language + Theme).

---

> **Staff shell.** A stack (or a 2-tab Jobs / Profile shell). Header avatar → Profile.

### 8.12 Staff Job Dashboard *(Slice 20, #28)*

- **Purpose:** The staff member's queue of jobs to work.
- **Anatomy:** a `FlashList` of `JobRow` (OrderNumber + `StatusBadge` / customer first-name + initial / "{n} files" / slot-time or createdAt).
- **Components:** `Screen`, `FlashList`, `JobRow`, `StatusBadge`, `Skeleton`, `EmptyState`.
- **States:** skeleton on load; **icon-empty "No jobs today"**; pull-to-refresh; offline banner.
- **Interactions:** server sort is **SLOT-first, then QUEUE**; `refetchInterval` 30s; tap → Job Detail.
- **Slice / issue:** Slice 20 / #28.

### 8.13 Staff Job Detail + Advance *(Slice 20)*

- **Purpose:** Inspect a job's full config and advance its status.
- **Anatomy (top → bottom):**
  1. `OrderNumber` rendered large.
  2. Customer name + `Phone` `IconButton` (`tel:`).
  3. Payment + total `MoneyText` (৳).
  4. Per-file full `PrintConfig` as labeled rows: colorMode / paperSize / orientation / copies / duplex / pageRange (or "All pages") / resolvedPages / subtotal.
  5. **Advance** `Button` with a status-dependent label: **Start Processing → Mark Ready → Mark Collected**. Hidden when status is COLLECTED or CANCELLED. Sends `expectedCurrentStatus` (optimistic lock).
- **Components:** `Screen`, `Text`, `IconButton`, `MoneyText`, `ListRow`, `PrintConfigForm` (read-only), `StatusBadge`, `Button`, `Toast`.
- **Error handling:** **409 → `Toast` "Updated elsewhere, refreshing" + invalidate**; **400 → `Toast`**. **No cancel action for staff** (cancel is customer-only).
- **Motion:** `StatusBadge` crossfade on change.
- **Slice / issue:** Slice 20.

### 8.14 Staff Profile

- **Purpose / spec:** Reuse the [Profile Hub](#811-profile-hub-built--reskin--extend) verbatim.

---

> **Owner shell.** `<Tabs>`: Shop · Jobs · Slots · Staff · Analytics (Slice 30, #38). Role guard enforced in the route group `_layout.tsx`. Header avatar → Profile.

### 8.15 Owner Shop Screen *(Slice 30)*

- **Purpose:** Create/manage the owner's single shop. **Status-driven layout.**
- **Anatomy by shop status:**

  | Shop status | Layout |
  |---|---|
  | **No shop** | "Create your shop" inline form (`POST /shops`). |
  | **PENDING** | info `Banner` + read-only view + edit. |
  | **ACTIVE** | editable form + **Save**. |
  | **REJECTED** | error `Banner` + `rejectionReason` + form + **Resubmit**. |
  | **SUSPENDED** | error `Banner` + read-only. |

- **Fields:** name, address, phone + rates (colorRate, bwRate, a3Surcharge, duplexDiscount, defaultProcessingMins), all decimals ≤ 2 dp.
- **Components:** `Screen`, `Banner`, `Input`, `Button`, `Toast`.
- **States:** Save disabled while submitting; **4xx → `Toast`**; offline blocked.
- **Slice / issue:** Slice 30 / #38.

### 8.16 Owner Slots *(Slice 31, #39)*

- **Purpose:** Open/close slots per date from the admin's templates.
- **Anatomy:** a date `Chip` row (Today / +1 / +2 / +3) → a list of non-deleted `SlotTemplate`s; per row a `Switch` (open/closed) + a `maxOrders` `Input` + `currentCount/maxOrders` if the slot exists. **Save** → `POST /shops/:id/slots` (upsert) → invalidate.
- **Components:** `Screen`, `Chip`, `Switch`, `Input`, `ListRow`, `Banner`, `Button`, `EmptyState`.
- **States:** **empty "Ask admin to add templates"**; **non-ACTIVE shop → disabled + `Banner`**; **`maxOrders < currentCount` → warn**; offline blocked.
- **Slice / issue:** Slice 31 / #39.

### 8.17 Owner Jobs *(Slice 31)*

- **Purpose:** Same job workflow as staff, scoped to the owner's shop.
- **Spec:** **Reuse the staff `JobRow` and `useAdvanceStatus` 1:1** — the API auto-scopes to the owner's shop. **Import the shared composites; do not copy-paste** the staff screens.
- **Slice / issue:** Slice 31.

### 8.18 Owner Analytics *(Slice 31)*

- **Purpose:** Day-level shop analytics.
- **Anatomy:** a date picker (default **today**) → stat `Card`s (Total Orders / Revenue ৳ / Avg Processing) → a **status-breakdown donut** (`react-native-gifted-charts`) → a "Revenue = collected only" note.
- **Components:** `Screen`, date picker, `Card`, `MoneyText`, gifted-charts donut, `EmptyState`.
- **States:** **zeros-empty** state; pull-to-refresh; offline banner.
- **Notes:** day-level only — no time-series (Fork 12). Revenue counts COLLECTED orders only (CONTEXT.md).
- **Slice / issue:** Slice 31.

### 8.19 Owner Staff Management *(Slice 26, #34)*

- **Purpose:** Promote and remove shop staff.
- **Anatomy:** a `FlashList` of staff (`Avatar`, name, `UserMinus` remove → confirm `Sheet`) + a promote row: a `userId` `Input` + **Add** (`POST /shops/:id/staff`).
- **Components:** `Screen`, `FlashList`, `Avatar`, `IconButton`, `Input`, `Button`, `Sheet`, `Toast`, `EmptyState`.
- **States:** **non-CUSTOMER error → `Toast`**; icon-empty; offline blocked.
- **Slice / issue:** Slice 26 / #34.

### 8.20 Owner Profile

- **Purpose / spec:** Reuse the [Profile Hub](#811-profile-hub-built--reskin--extend).

---

> **Admin shell.** `<Tabs>`: Shops · Analytics · Config · Slot Templates (Slice 28, #36). `PLATFORM_ADMIN` guard enforced in the route group `_layout.tsx`. Header avatar → Profile.

### 8.21 Admin Shop Approval *(Slice 28, #36)*

- **Purpose:** Govern shop lifecycle (approve / reject / suspend / reinstate).
- **Anatomy:** a `SegmentedControl` (Pending / All) → a `FlashList` of `ShopApprovalRow` (name + `StatusBadge`, address) with status-dependent actions:

  | Row status | Actions |
  |---|---|
  | **PENDING** | Approve / Reject |
  | **ACTIVE** | Suspend |
  | **SUSPENDED** | Reinstate / Reject |
  | **REJECTED** | read-only + reason |

- **RejectShopModal:** a `Sheet` with a `rejectionReason` `Input` (**≥ 5 chars**, submit gated). **Suspend** → confirm `Sheet`.
- **Components:** `Screen`, `SegmentedControl`, `FlashList`, `ShopApprovalRow`, `StatusBadge`, `Sheet`, `Input`, `Button`, `EmptyState`.
- **States:** **icon-empty per tab**; offline blocked. Invalidate `['admin','shops']` on success.
- **Slice / issue:** Slice 28 / #36.

### 8.22 Admin Analytics *(Slice 29, #37)*

- **Purpose:** Platform-wide day-level analytics.
- **Anatomy:** 4 stat `Card`s (Total Shops / Active / Total Orders / Revenue ৳) + a pending-approvals badge → a **revenue-per-shop bar chart** (`react-native-gifted-charts`) → a `ListRow` table (name / orders / revenue).
- **Components:** `Screen`, `Card`, `MoneyText`, gifted-charts bars, `ListRow`, `EmptyState`.
- **States:** **zeros-empty**; pull-to-refresh; offline banner.
- **Notes:** day-level only (Fork 12).
- **Slice / issue:** Slice 29 / #37.

### 8.23 Admin Config *(Slice 29)*

- **Purpose:** Edit `AppConfig` key-value settings. **This is the one screen where "Settings" terminology (via the lucide `Settings` tab glyph) is correct.**
- **Anatomy:** rows for `LOW_BALANCE_THRESHOLD` and `SLOT_DURATION_MINS` (label + value + edit) → an inline `Sheet` with a number `Input`. A "Not set" placeholder when unset.
- **Components:** `Screen`, `ListRow`, `Sheet`, `Input`, `Button`.
- **States:** "Not set" placeholder; save spinner; offline blocked.
- **Slice / issue:** Slice 29.

### 8.24 Admin Slot Templates *(Slice 29)*

- **Purpose:** Create/edit/retire the reusable `SlotTemplate`s owners draw from.
- **Anatomy:** a `FlashList` of "09:00–09:30" rows → **Add** (`Sheet` with two time pickers, HH:MM validated) → **Edit** → **Delete (soft)** → confirm `Sheet`.
- **Components:** `Screen`, `FlashList`, `ListRow`, `Sheet`, time pickers, `Button`, `EmptyState`.
- **States:** icon-empty; offline blocked.
- **Notes:** delete is **soft** (`deletedAt`) — never hard-delete (CONTEXT.md).
- **Slice / issue:** Slice 29.

### 8.25 Admin Profile

- **Purpose / spec:** Reuse the [Profile Hub](#811-profile-hub-built--reskin--extend).

---

## 9 — Build Plan

| Phase | Scope | Order |
|---|---|---|
| **Phase 0 — Foundation** | F1–F6. **Do first.** Unblocks the aesthetic for all screens and retro-fixes the 5 built screens (login, register, shop list, shop detail, profile). | F1 → F2 → F3 → F4 → F5 → F6 |
| **Phase 1 — Customer core** | Verify/**rebuild** the Order Wizard + `PrintConfigForm` (the empty "closed" stubs) → then the customer screens. | Wizard + PrintConfigForm → Slice 16 → 22 → 24 → 18 → 32 |
| **Phase 2 — Staff / Owner / Admin** | Staff first, then owner, then the remaining role screens. | Slice 20 → 30 → {26, 31, 28, 29} |
| **Phase 3 — i18n** | Slice 33: BN translations + Bengali numerals across **all** screens. | Slice 33 |

---

## 10 — Open Risks

> Flagged for awareness — **not resolved here.** Verify before trusting any "done" status.

1. **Integrity — empty stubs on closed slices.** Several **CLOSED** slices left **empty stubs** on `development`:
   - `apps/mobile/app/(customer)/orders/new.tsx` (Slice 14 wizard) — **0 lines** (verified).
   - `PrintConfigForm.tsx` (Slice 10) — empty.
   - `OrderCard` / `StatusBadge` — empty.

   On this branch, **a "closed issue" does not mean merged, rendering code.** The customer core flow does not render. **Verify each closed slice before trusting it as done.**

2. **Foundation slices not yet tracked.** F1–F6 are **not yet GitHub issues**. They must be created and scheduled ahead of Phase 1.

3. **Logo recolor.** The app logo and wordmark must be **recolored from orange to indigo** (Fork 3) before they appear on the reskinned Login/Register heroes.
