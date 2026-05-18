# Slice 06 — Mobile: Customer Shop Detail Screen

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md), [Slice 07](./07-slots-module-api.md)
> **Branch:** `ihm/feat/shop-detail-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Customers tap a shop on the list ([Slice 05](./05-shop-list-screen-mobile.md)) and arrive on the detail screen. This screen is the gateway into the order creation wizard ([Slice 14](./14-order-creation-wizard-mobile.md)). It must show pricing transparently and only offer "Print Now" when an active slot exists at this moment.

`apps/mobile/app/(customer)/shops/[shopId].tsx` exists as a stub. `apps/mobile/src/features/shops/hooks/useShop.ts` exists as a stub. The endpoint `GET /shops/:id/slots/active` is delivered by [Slice 07](./07-slots-module-api.md).

## 2. Goal

Shop detail page showing name, address, contact, pricing breakdown, and two action buttons. "Print Now" is conditional on an active slot existing right now; "Schedule Pickup" is always available for active shops.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/src/features/shops/services/shopService.ts` — add `getShop(id)` and `getActiveSlot(shopId)`
- `apps/mobile/src/features/shops/hooks/useShop.ts` — implement `useShop` and `useActiveSlot`
- `apps/mobile/app/(customer)/shops/[shopId].tsx`

### Create
- `apps/mobile/src/features/shops/__tests__/useShop.test.ts`

### Read first
- [Slice 04](./04-shops-service-api.md) §Endpoints — `GET /shops/:id`
- [Slice 07](./07-slots-module-api.md) §Endpoints — `GET /shops/:id/slots/active`
- [`AGENTS.md`](../../AGENTS.md) — Mobile rules

## 4. Implementation Rules

### Service
- `getShop(id: string): Promise<Shop>` — calls `GET /shops/:id`.
- `getActiveSlot(shopId: string): Promise<ShopSlot | null>` — calls `GET /shops/:id/slots/active`.

### Hooks
- `useShop(shopId)` — `useQuery` keyed `['shops', shopId]`. Stale time 60 s.
- `useActiveSlot(shopId)` — `useQuery` keyed `['shops', shopId, 'active-slot']`. Stale time 30 s. `refetchInterval: 30_000` so visibility of Print Now stays fresh.

### Screen layout
- **Header card:** shop name (h1), address, phone (Pressable → opens phone dialer via `Linking.openURL('tel:...')` if phone present).
- **Pricing section:** table of: Color rate (per page), B&W rate (per page), A3 surcharge (per page), Duplex discount (% off). All formatted in BDT — use a single shared formatter from `apps/mobile/src/utils/formatCurrency.ts` (exists already).
- **Action row:**
  - "Print Now" button — visible only if `activeSlot !== null`. Disabled while loading.
  - "Schedule Pickup" button — always visible for active shops.
- **Status banner** (only if shop status !== ACTIVE and we have status info): show "This shop is currently {status}" — but `GET /shops/:id` returns any status, so check before showing actions.
- **Buttons navigation:**
  - `Print Now` → `router.push({ pathname: '/(customer)/orders/new', params: { shopId, mode: 'QUEUE' } })`
  - `Schedule Pickup` → `router.push({ pathname: '/(customer)/orders/new', params: { shopId, mode: 'SLOT' } })`

### Visual
- Match the design language of the login screen: gradient bg, glass card, generous spacing.
- Pricing rows: label left, value right with separator.
- Use `Animated.View` with `FadeInDown` for entry animation.

## 5. Edge Cases

- **Shop is `PENDING`/`REJECTED`/`SUSPENDED`:** hide both action buttons; show a status banner.
- **Shop is `ACTIVE` but no active slot:** hide Print Now; keep Schedule Pickup.
- **Active slot endpoint returns 404 or 500:** treat as `activeSlot = null`; do not block screen.
- **User navigates to invalid `shopId`:** `GET /shops/:id` returns 404 → screen shows "Shop not found" + Back button.
- **Active slot expires while user is viewing screen:** `refetchInterval` picks it up within 30 s; Print Now disappears.
- **Phone field is null:** hide the phone row; do not show empty `tel:` link.
- **Decimal pricing values:** format to 2 decimal places, prepend `৳`.
- **Bengali language:** numbers stay Arabic — only labels translate.

## 6. Test Cases

### Hook
1. `useShop(id)` calls `GET /shops/:id`.
2. `useActiveSlot(id)` calls `GET /shops/:id/slots/active`.
3. Active slot query is keyed separately from shop query.

### Screen behavior
4. Shop with active slot shows both buttons.
5. Shop without active slot shows only "Schedule Pickup".
6. Non-ACTIVE shop shows status banner and hides both buttons.
7. "Print Now" tap navigates to `/(customer)/orders/new?shopId=X&mode=QUEUE`.
8. "Schedule Pickup" tap navigates with `mode=SLOT`.
9. Phone row hidden when `phone` is null.

## 7. Definition of Done

- [ ] `shopService` extended with `getShop` and `getActiveSlot`
- [ ] `useShop` and `useActiveSlot` hooks exported
- [ ] Screen renders shop details with pricing table
- [ ] Print Now visibility conditional on active slot
- [ ] Schedule Pickup always visible for ACTIVE shops
- [ ] Non-ACTIVE shop shows banner, hides action buttons
- [ ] Phone row Pressable opens dialer via `Linking`
- [ ] Hooks test passes; manual smoke confirms layout
- [ ] No `useNavigation()`; only `router.push` with typed params
- [ ] Branch `ihm/feat/shop-detail-screen-mobile`; PR title `[Slice 06]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This file
   - [Slice 04](./04-shops-service-api.md) §Endpoints
   - [Slice 07](./07-slots-module-api.md) §Endpoints
   - [`AGENTS.md`](../../AGENTS.md)
   - The login screen for visual reference
2. **Implement service methods.**
3. **Implement hooks.**
4. **Implement screen** — start with static layout, then wire data, then conditional buttons.
5. **Test phone dialer** with `Linking.openURL('tel:01700000000')`.
6. **Manual smoke** — log in as customer, tap a shop, verify Print Now visibility responds to current time vs shop slots.

### Gotchas

- Active slot query stale time must be short (30 s) and `refetchInterval` matching, or button visibility lags.
- Always coerce `Decimal`-like number values to `Number` before passing to formatter.
- `Linking` import: `import { Linking } from 'react-native'`.
- For route params: use `useLocalSearchParams()` from expo-router in the screen file.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`GET /shops/:id`, §`GET /shops/:id/slots/active`
- [`AGENTS.md`](../../AGENTS.md) §Pressable, §i18n, §typed navigation
- [`apps/mobile/src/utils/formatCurrency.ts`](../../apps/mobile/src/utils/formatCurrency.ts)
