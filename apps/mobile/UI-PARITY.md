# Mobile UI Parity

How to keep `apps/mobile` consistent with the **prototype** (`prototype/`), the
**design spec** (`docs/09-ui-ux-design-spec.md`), and the data/contract docs
(`docs/04`, `docs/05`). Two halves: an automated contract scanner + a per-screen
visual checklist. Run both before calling any screen "migrated".

---

## 1. Render the prototype as ground truth

The prototype is the locked visual source. RN screens can't be diffed in a
browser, so eyeball them against the live prototype.

```bash
npx serve prototype -l 4321      # then open http://localhost:4321
```

Use the top control bar to switch **Role · Theme (light/dark) · Language (EN/বাংলা)**
and click through the exact flow you are migrating. The corresponding source is
`prototype/app.js` (`SCREENS.<name>`) + `prototype/styles.css` (component classes).

## 2. Run the contract scanner (automated)

```bash
npm run ui:parity        # from apps/mobile
```

Encodes the machine-checkable rules. Fails on: raw hex color in screen/feature/
shared code (use `useThemeTokens()`), DS primitives imported from `react-native`,
`Touchable*` (use `Pressable`), emoji (icons are lucide-only). Advises on unguarded
`{value && <JSX/>}` (RN crash risk). Palette files — `src/theme/**`,
`src/components/ui/**` — are exempt because they define the tokens.

Wire it into `lint`/CI so drift can't merge.

## 3. Walk the per-screen visual checklist (manual)

For each screen, confirm against the prototype:

- **Color** — every color resolves from a token; nothing hardcoded; white text only
  on `gradientBrand` / dark surfaces.
- **Type** — variant + weight match (`displayLg` balance, `h1` screen title, `label`
  badges); `tabular` on money/counts; Hind Siliguri in BN.
- **Radius** — card 20, hero/frost 24, control 14, chip/tile 10, pill full;
  `borderCurve: 'continuous'` on every rounded surface.
- **Spacing** — from the `spacing` scale; `gap` between siblings (not margins).
- **Surface** — frosted (`FrostCard`) for hero zones only; solid `Card` for rows;
  floating frosted tab bar.
- **Icons** — lucide glyph + size matches; StatusBadge tone↔status fixed (§4.1).
- **Actions** — every interactive element from the prototype exists (eye toggle,
  see-all link, FAB, sticky CTA, sheets, pull-to-refresh, mark-all-read…).
- **States** — loading (skeleton), empty, error, offline, low-balance, 402.
- **Motion** — press-scale 0.97, screen fade, badge crossfade, balance count-up;
  honor reduced-motion.
- **Data** — fields/labels match `docs/04` + `docs/05`; show `orderNumber` to users,
  never the UUID; price is server-calculated.

---

## Per-screen status

Prototype source of truth in parens. Status: ✅ parity · 🟡 partial · ❌ missing.

### Customer
| Screen | Prototype | Status |
|---|---|---|
| Login | `SCREENS.login` | ✅ |
| Register | `SCREENS.register` | ✅ |
| Home | `SCREENS.home` | ✅ hub: search + active-order rail + recent + see-all (Slice 32 / #40) |
| Shop list | `SCREENS.shops` | ✅ |
| Shop detail | `SCREENS.shopDetail` | ✅ |
| Order wizard | `SCREENS.wizard` | ✅ |
| Order detail | `SCREENS.orderDetail` | ✅ timeline + live tracking (socket) + cancel (Slice 16 / #24) |
| Order history | `SCREENS.history` | ✅ |
| Wallet | `SCREENS.wallet` | ✅ |
| Notifications | `SCREENS.notifications` | ✅ |
| Profile | `SCREENS.profile` | ✅ |

### Staff
| Screen | Prototype | Status |
|---|---|---|
| Job dashboard | `SCREENS.staffJobs` | ✅ slot + walk-in sections (Slice 20 / #28) |
| Job detail | `SCREENS.jobDetail` | ✅ per-file config + status advance (Slice 20 / #28) |

### Owner
| Screen | Prototype | Status |
|---|---|---|
| Shop | `SCREENS.ownerShop` | ✅ `app/(owner)/shop.tsx` (Slice 30 / #38) |
| Jobs | `SCREENS.ownerJobs` | ✅ `app/(owner)/jobs.tsx` — reuses features/staff (Slice 31 / #39) |
| Slots | `SCREENS.ownerSlots` | ✅ `app/(owner)/slots.tsx` (Slice 31 / #39) |
| Staff | `SCREENS.ownerStaff` | ✅ `app/(owner)/staff.tsx` (Slice 26 / #34) |
| Analytics | `SCREENS.ownerAnalytics` | ✅ `app/(owner)/analytics.tsx` — SVG donut (Slice 31 / #39) |

### Platform Admin
| Screen | Prototype | Status |
|---|---|---|
| Shop approval | `SCREENS.adminShops` | ✅ `app/(admin)/shops.tsx` — approve/reject/suspend/reinstate (Slice 28 / #36) |
| Analytics | `SCREENS.adminAnalytics` | ✅ `app/(admin)/analytics.tsx` — SVG revenue bars (Slice 29 / #37) |
| Config | `SCREENS.adminConfig` | ✅ `app/(admin)/config.tsx` — edit sheets (Slice 29 / #37) |
| Slot templates | `SCREENS.adminTemplates` | ✅ `app/(admin)/templates.tsx` — add/edit/soft-delete (Slice 29 / #37) |

---

## Drift log (resolved)

- Wallet hero rendered white text on a frosted near-white surface (illegible) —
  now a `gradientBrand` hero matching `.wallet-hero`; balance shows 2 decimals.
- Notifications unread rows missing `tint-soft` background; "Mark all read" was a
  filled button — now `ghost`, matching `.notif-row.unread` + `.btn-ghost`.
- Raw hex (`#4F46E5`, `#FFFFFF`) in wallet hero shadow, tab badge text, duplex
  switch thumb — replaced with `tokens.primary` / `tokens.onPrimary`.
- Spacing + type aligned to the prototype across all screens: screen gutter
  `spacing.xl` (24) → `spacing.lg` (16) to match `.screen` padding; type ramp
  (`fonts.ts`) retuned to prototype px — balance `44`, screen title `22`, detail
  hero `26`, section/card `16`, body `15`. Scanner now flags raw `fontSize` in
  screens (advisory) so ad-hoc sizes can't reintroduce drift.
