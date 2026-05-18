# Slice 05 — Mobile: Customer Shop List Screen

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md)
> **Branch:** `ihm/feat/shop-list-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Customers need to discover shops. The shops API endpoint exists ([Slice 04](./04-shops-service-api.md)). The screen file `apps/mobile/app/(customer)/shops/index.tsx` exists as a stub. The mobile feature `apps/mobile/src/features/shops/` has empty stub files for `services/shopService.ts`, `hooks/useShops.ts`, `hooks/useShop.ts`. The component `apps/mobile/src/components/shared/ShopCard.tsx` exists (may be stub — implement if needed).

This screen is reached from:
- Customer tab navigator ([Slice 32](./32-customer-home-tabs-mobile.md))
- Customer home screen "Browse shops" CTA ([Slice 32](./32-customer-home-tabs-mobile.md))

## 2. Goal

A FlashList-powered customer shop discovery screen with debounced search, pull-to-refresh, empty state, and navigation to shop detail on row tap.

## 3. Files to Create / Modify

### Modify (stub files)
- `apps/mobile/src/features/shops/services/shopService.ts`
- `apps/mobile/src/features/shops/hooks/useShops.ts`
- `apps/mobile/src/components/shared/ShopCard.tsx` — if stub, implement it
- `apps/mobile/app/(customer)/shops/index.tsx`

### Create
- `apps/mobile/src/features/shops/__tests__/useShops.test.ts`
- `apps/mobile/src/features/shops/__tests__/ShopCard.test.tsx`

### Read first
- [`AGENTS.md`](../../AGENTS.md) — React Native rules (FlashList, Pressable, falsy `&&`)
- `apps/mobile/src/services/api.ts` — `apiFetch` pattern
- `apps/mobile/src/features/auth/hooks/useAuth.ts` — hook pattern
- `apps/mobile/src/components/ui/Button/` — component pattern (compound components)

## 4. Implementation Rules

- **`shopService.ts`:**
  - `listShops(search?: string): Promise<Shop[]>` — calls `GET /shops?search=`. Returns shared `Shop[]`.
  - Place reusable types in `packages/shared` — never duplicate.
- **`useShops.ts`:**
  - `useShops(search?: string)` — `useQuery` keyed by `['shops', search ?? '']`. Stale time 30 s.
- **`ShopCard.tsx`:**
  - Props: `{ id, name, address, onPress }`.
  - Pressable card with `expo-image` if/when a logo URL is added later. For now, just text.
  - Use `borderCurve: 'continuous'` with `borderRadius`.
  - Animate press scale via `Pressable` `style` callback or Reanimated `useSharedValue`.
- **Screen:**
  - Renders `FlashList` (not `ScrollView` + map).
  - `estimatedItemSize` set to a realistic value (e.g. `96`).
  - Search input controlled with local state; debounced 300 ms via `useDebounce` hook (already exists at `apps/mobile/src/hooks/useDebounce.ts`).
  - Pull-to-refresh via FlashList `refreshing` + `onRefresh` props calling `refetch`.
  - Empty state when `data.length === 0` and not loading: friendly message + illustration optional.
  - Loading state: skeleton or spinner.
  - Error state: error message + retry button.
  - On row tap → `router.push('/(customer)/shops/${shop.id}')`.
- **Navigation:** always `router.push` from `expo-router`. Never `useNavigation()`.
- **i18n keys:** wrap labels in identifiers e.g. `t('shops.list.searchPlaceholder')`. Slice 33 replaces with translations.

## 5. Edge Cases

- **No active shops** — show empty state with "No shops available yet".
- **Search returns no results** — show "No shops match \"{query}\"".
- **Offline** — TanStack stale cache shown if available; banner from connectivity store (deferred — for now show a stale-data toast).
- **Server returns 500** — show generic error with retry.
- **User types fast** — debounce 300 ms; cancel previous request via TanStack's query cancellation (automatic).
- **Item count 1000+** — `FlashList` handles virtualisation; `estimatedItemSize` keeps scroll smooth.
- **Search containing emoji / Bengali characters** — passed as-is to API (server uses Prisma `contains`).
- **Row tapped while still loading detail** — `router.push` queues; user sees brief loading.

## 6. Test Cases

### Hook test
1. `useShops()` calls `GET /shops` with no query string.
2. `useShops('lib')` calls `GET /shops?search=lib`.
3. Query key uniquely identifies search term.

### Component test
4. `ShopCard` renders name and address.
5. `ShopCard onPress` callback invoked when pressed.

### Screen behavior (smoke / RTL)
6. Empty state shown when API returns `[]`.
7. Search input triggers query refetch after debounce.
8. Pull-to-refresh triggers `refetch`.
9. Tapping a card navigates to `/(customer)/shops/${id}`.

## 7. Definition of Done

- [ ] `shopService.ts` exports `listShops`
- [ ] `useShops.ts` exports `useShops`
- [ ] `ShopCard` implemented and accessible (proper `accessibilityLabel`)
- [ ] Screen uses FlashList; pull-to-refresh works; empty state visible
- [ ] No `useNavigation()` anywhere
- [ ] No falsy `&&` — use `!!data?.length && <X />` or ternary
- [ ] Every string literal is inside `<Text>`
- [ ] Debounce 300 ms via existing `useDebounce` hook
- [ ] Hook and component tests pass
- [ ] Branch `ihm/feat/shop-list-screen-mobile`; PR title `[Slice 05]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This file
   - [`AGENTS.md`](../../AGENTS.md) full document
   - [Slice 04](./04-shops-service-api.md) §3 for the API response shape
   - [`apps/mobile/src/services/api.ts`](../../apps/mobile/src/services/api.ts)
   - [`apps/mobile/src/hooks/useDebounce.ts`](../../apps/mobile/src/hooks/useDebounce.ts)
   - The existing stub files
2. **Implement `shopService.ts`** following `authApi.ts` pattern.
3. **Implement `useShops.ts`** following `useAuth.ts` pattern.
4. **Implement `ShopCard.tsx`** if stub — Pressable with name/address, proper styling.
5. **Implement screen** — FlashList + search + states.
6. **Write tests** (RTL for component, jest for hook).
7. **Manual smoke** — log in as customer, navigate to shops tab, verify list loads.

### Gotchas

- Set `estimatedItemSize` on FlashList — required for performance.
- `useDebounce(value, 300)` returns the debounced value — use it in the query key directly.
- Press feedback on Android: set `android_ripple` on Pressable.
- Empty array vs loading: check `isLoading` first, then `data.length === 0`.

## 9. References

- [`AGENTS.md`](../../AGENTS.md) §FlashList, §Pressable, §i18n
- [`docs/05-api-contract.md`](../05-api-contract.md) §`GET /shops`
- [`CLAUDE.md`](../../CLAUDE.md) §"Mobile Architecture"
