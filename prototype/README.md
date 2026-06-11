# PrintSlot — Interactive Design Prototype

A high-fidelity, **static HTML/CSS/JS** prototype of the PrintSlot mobile app. It exists to
communicate the locked UI/UX design system (light-first fintech, indigo brand accent,
frosted glass, lucide icons, EN/বাংলা, light/dark) and to let reviewers *click through*
real flows with mock data.

> **This is a design prototype, not the production app.** No React Native, no build step,
> no network, no backend. All data is mocked in `data.js`. The real app lives in
> `apps/mobile` (Expo / React Native) and `apps/api` (NestJS).

---

## How to open it

**Option A — double-click (simplest):**
Open `prototype/index.html` in any modern browser (Chrome, Edge, Safari, Firefox).
You must be **online** the first time so the CDN assets load (Google Fonts, lucide icons).

**Option B — local static server (avoids any file:// quirks):**
```bash
npx serve prototype -l 4321
# then open http://localhost:4321
```

No install, no compile. That's the whole point.

---

## The control bar (top toolbar, outside the phone frame)

| Control | What it does |
|---|---|
| **Role** — Customer · Staff · Owner · Admin | Swaps the *entire* app: tab bar + every screen for that role. |
| **Theme** — Light · Dark | Re-themes everything live via semantic CSS variables. Default **Light**. |
| **Language** — EN · বাংলা | Re-renders all strings to Bengali **and** converts digits to Bengali numerals (১২৩) for money / counts / dates / ETA / queue. Order numbers (`PS-XXXXX`) stay ASCII. |
| **Offline** | Toggles the app-wide offline banner. |
| **Reset** | Re-seeds mock data and returns to Customer · Light · EN · Login. |

Inside the frame: an iPhone-style device (390×844) with notch + status bar, an animated
ambient gradient behind frosted/solid cards, a vanilla-JS screen router (≤220 ms fade),
a per-role bottom tab bar, and a header avatar that opens the Profile hub.

---

## Roles & screens implemented

### Customer (tabs: Home · Orders · Wallet · Alerts; Profile via avatar)
- **Login** — frosted hero, indigo `PrintSlot` wordmark + Printer icon, password eye toggle.
- **Register** — Customer / Shop Owner segmented role picker + fields.
- **Home** — greeting, search, Active Orders horizontal cards (live position · ETA), Recent Orders, Browse shops CTA.
- **Shop list** — search, shop cards with initial avatar + active dot; **skeleton shimmer** on first load.
- **Shop detail** — frosted hero, pricing card, open/closes strip, sticky Print Now / Schedule Pickup.
- **Order Wizard (4 steps)** — Slot grid (full/closed disabled) → Files + per-file PrintConfig (Color/B&W, A4/A3, Portrait/Landscape, copies stepper, duplex switch, page range) → Price breakdown → Payment (Wallet vs Cash) → success beat. Includes the **402 Insufficient balance** sheet.
- **Order Detail** — frosted header + StatusBadge, status **timeline** with current node highlighted, live position/ETA, shop + files + payment cards, Cancel sheet, a **`▶ advance status`** dev control (watch the badge crossfade + ETA tick), DisconnectBanner.
- **Order History** — order cards, **New Order** FAB, empty-state pattern available.
- **Wallet** — frosted balance hero (tick animation), **Simulate low balance** toggle → LOW_BALANCE warn banner, credit/debit transaction list.
- **Notifications** — type icons, bold-if-unread, unread dot; tap marks read + decrements the tab badge; Mark all read.
- **Profile** — avatar, editable name/phone, Language + Theme segmented controls (wired to the global toggles), logout confirm sheet.

### Staff (tabs: Jobs · Profile)
- **Job Dashboard** — Slot pickups first, then walk-in queue; job rows with customer + file count + time.
- **Job Detail** — customer + phone, payment + total, full per-file print config, status-aware Advance button (Start Processing → Mark Ready → Mark Collected).

### Shop Owner (tabs: Shop · Jobs · Slots · Staff · Analytics)
- **Shop** — ACTIVE editable form; toggle to preview PENDING / REJECTED banner variants (+ Resubmit on REJECTED).
- **Jobs** — reuses the staff job list/detail.
- **Slots** — date chips, template rows with open/closed switch, max-orders stepper, usage pill.
- **Staff** — staff rows with remove (confirm sheet) + promote-by-user-ID.
- **Analytics** — stat cards + pure-SVG status **donut** + "Revenue = collected only" note.

### Platform Admin (tabs: Shops · Analytics · Config · Templates)
- **Shop approval** — Pending / All segmented; per-status actions (Approve/Reject/Suspend/Reinstate); Reject sheet with a reason textarea that requires ≥5 chars.
- **Analytics** — 4 stat cards, pending-approvals badge, revenue-per-shop **bar chart** (pure SVG/CSS) + table.
- **Config** — LOW_BALANCE_THRESHOLD (50) + SLOT_DURATION_MINS (30) with edit sheets.
- **Slot Templates** — time-window rows with Add / Edit / soft-Delete (confirm sheet).

---

## What's interactive

- Role / theme / language / offline / reset switches re-render the whole app live.
- Login & register navigate into the app; logout returns to login.
- The 4-step order wizard advances, edits per-file config, computes price, and places an order (deducting the wallet) — including the 402 path when the total exceeds the balance.
- Order/Job detail timelines advance with an animated StatusBadge crossfade + ETA tick.
- Notifications mark-as-read (unread dot clears, tab badge decrements); Mark all read.
- Cancel / reject / remove / delete open bottom sheets; confirmed actions show toasts.
- Wallet top-up and low-balance simulation; shop-list skeleton loading; empty / offline states.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Entry point — page heading, control bar, device frame, CDN links. |
| `styles.css` | Full design system: light/dark tokens, ambient gradient, every component. |
| `data.js` | Mock entities (shops, orders, jobs, wallet, notifications, admin) + EN/BN i18n strings + status/icon maps. |
| `app.js` | Tiny router + state + render functions for every screen + all interactions. |

---

## Design system reference (locked)

- **Brand:** indigo `#4F46E5` (light) / `#6366F1` (dark). Orange is retired.
- **Surfaces:** frosted translucent (`backdrop-filter: blur(20px)`) for hero zones only; solid cards for list rows / dense data. 16 px card radius, 12 px controls, full pills.
- **Type:** Inter (Latin) + Hind Siliguri (Bengali); money uses tabular figures.
- **Icons:** lucide only — no emoji. StatusBadge: QUEUED→info+ListOrdered, SCHEDULED→violet+CalendarClock, PROCESSING→warn+Printer, READY→success+PackageCheck, COLLECTED→muted+CheckCheck, CANCELLED→error+XCircle.
- **Motion:** screen fade ≤220 ms, press-scale 0.97, badge crossfade, ETA/balance count-up, success beat. Honors `prefers-reduced-motion`.
- **Currency:** ৳ (BDT).
