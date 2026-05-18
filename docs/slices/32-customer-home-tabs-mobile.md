# Slice 32 — Mobile: (customer) Tab Layout + Home Screen

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 18](./18-order-history-cancel-mobile.md), [Slice 22](./22-wallet-screen-mobile.md), [Slice 24](./24-notifications-screen-mobile.md)
> **Branch:** `ihm/feat/customer-home-tabs-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Customers need a tab navigator (Home, Orders, Wallet, Notifications) and a Home screen as the discovery starting point. The Notifications tab shows an unread badge driven by [Slice 24](./24-notifications-screen-mobile.md)'s `useUnreadCount`.

`apps/mobile/app/(customer)/_layout.tsx` exists (verify it has tab structure). `apps/mobile/app/(customer)/index.tsx` exists as a stub.

## 2. Goal

A 4-tab navigator with a Home screen containing greeting, shop search/discovery, active-orders cards, and a recent-orders shortcut.

## 3. Files to Create / Modify

### Modify
- `apps/mobile/app/(customer)/_layout.tsx` — Tabs with badge wiring
- `apps/mobile/app/(customer)/index.tsx`

### Create
- `apps/mobile/src/features/home/components/ActiveOrderCard.tsx`
- `apps/mobile/src/features/home/components/SectionHeader.tsx`

### Read first
- [Slice 24](./24-notifications-screen-mobile.md) §useUnreadCount
- [Slice 18](./18-order-history-cancel-mobile.md), [Slice 22](./22-wallet-screen-mobile.md), [Slice 05](./05-shop-list-screen-mobile.md)

## 4. Implementation Rules

### Tab navigator
- 4 tabs:
  - Home (`index.tsx`)
  - Orders (`orders/index.tsx`)
  - Wallet (`wallet.tsx`)
  - Notifications (`notifications.tsx`) with unread badge
- Use Expo Router `<Tabs>` with `tabBarIcon` per tab and `tabBarBadge` for Notifications driven by `useUnreadCount()`.

### Home screen layout
- **Header:** Greeting "Hello, {user.name.split(' ')[0]}!" + settings cog navigating to `/(customer)/settings`.
- **Search bar:** debounced input; on submit, navigates to `/(customer)/shops?search=...`.
- **Active Orders section:** title + horizontal scroll of `ActiveOrderCard` for orders with status QUEUED/SCHEDULED/PROCESSING/READY. Tap → order detail.
- **Recent Orders section:** show last 3 COLLECTED/CANCELLED orders (compact OrderCard). "See all" link → `/(customer)/orders`.
- **Discover Shops section:** "Browse shops" CTA → `/(customer)/shops`.

### ActiveOrderCard
- OrderNumber + StatusBadge.
- Live ETA / queue position if applicable.
- Tap navigates to order detail.

### Rules
- **Tab badge** uses `useUnreadCount` from Slice 24.
- **No queries on home screen for shops** — defer to `/shops` screen.
- **i18n keys.**
- **Hoist Intl** if used for greeting time-of-day variation.

## 5. Edge Cases

- **New user with no orders:** "Place your first order" CTA.
- **No active orders:** section hidden.
- **No recent orders:** section hidden.
- **Long user.name:** truncate first name.

## 6. Test Cases

1. Tab navigator renders 4 tabs.
2. Notifications tab badge shows unread count.
3. Home greeting uses `user.name`.
4. Active Orders section hidden when no active orders.
5. Search navigates with query param.

## 7. Definition of Done

- [ ] `(customer)/_layout.tsx` has 4 tabs with correct icons
- [ ] Notifications tab badge driven by `useUnreadCount`
- [ ] Home screen with greeting, search, active orders, recent orders
- [ ] All navigation via `router.push`
- [ ] Tests pass
- [ ] Branch `ihm/feat/customer-home-tabs-mobile`; PR title `[Slice 32]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 24](./24-notifications-screen-mobile.md) §useUnreadCount
2. **Build the tab layout** with proper icons (`@expo/vector-icons` or emoji for v1).
3. **Wire the unread badge** via `useUnreadCount`.
4. **Build Home screen** section by section.
5. **Smoke test** by placing an order, going home, and seeing the active order card.

### Gotchas

- Expo Router `<Tabs>` uses `<Tabs.Screen name="..." options={{ tabBarIcon, tabBarBadge }} />` — set badge dynamically.
- The `(customer)/shops` directory is a folder route; link with `/(customer)/shops`.
- Greeting variation by time-of-day is nice but optional for v1.

## 9. References

- [`AGENTS.md`](../../AGENTS.md) §Compound components, §typed navigation
- [Expo Router Tabs](https://docs.expo.dev/router/advanced/tabs/)
