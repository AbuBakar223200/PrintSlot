# Slice 24 — Mobile: Notifications Screen + Unread Badge

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 23](./23-notifications-service-api.md)
> **Branch:** `ihm/feat/notifications-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

The in-app notification list complements push notifications. Even with push permission denied, every event arrives in this list. The unread count is exposed via the customer tab badge ([Slice 32](./32-customer-home-tabs-mobile.md)).

`apps/mobile/app/(customer)/notifications.tsx` exists as a stub. Feature directories empty.

## 2. Goal

Paginated notification list, mark-as-read on tap, "Mark all read" button, unread badge counter exposed for the tab navigator, navigation to associated order on tap.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/src/features/notifications/services/notificationService.ts`
- `apps/mobile/src/features/notifications/hooks/useNotifications.ts`
- `apps/mobile/app/(customer)/notifications.tsx`

### Create
- `apps/mobile/src/features/notifications/components/NotificationRow.tsx`
- `apps/mobile/src/features/notifications/__tests__/useNotifications.test.ts`

### Read first
- [Slice 23](./23-notifications-service-api.md) §Endpoints + helpers

## 4. Implementation Rules

### Service
- `listNotifications(page, limit, unreadOnly?)` → `GET /notifications?...`
- `markRead(id)` → `PATCH /notifications/:id/read`
- `markAllRead()` → `PATCH /notifications/read-all`

### Hooks
- `useNotifications(unreadOnly = false)` — `useInfiniteQuery` or simple paginated query.
- `useMarkRead()` mutation — invalidate `['notifications']`.
- `useMarkAllRead()` mutation — invalidate `['notifications']`.
- `useUnreadCount()` — `useQuery` that returns the count of unread. Implement by reading the cached query data or fetching `?unreadOnly=true&limit=1` and using `pagination.total`. Prefer **derived from cache** when possible.

### Screen layout
- Header: title + "Mark all read" button (visible when unread count > 0).
- FlashList of `NotificationRow`.
- Pull-to-refresh.
- Empty state.

### NotificationRow
- Props: `{ notification, onPress }`.
- Layout:
  - Left: icon by type (emoji or icon — 🖨️ for ORDER_*, 💰 for WALLET_*, 📋 for NEW_ORDER, 🏪 for SHOP_*, 👤 for STAFF_ASSIGNED, ⚠️ for LOW_BALANCE).
  - Middle: title (bold if unread), body (truncated), relative time.
  - Right: unread dot indicator (colored circle) when `!read`.
- Pressable. On press:
  - If `!read`: call `markRead(id)`.
  - If `orderId` is present: navigate to `/(customer)/orders/${orderId}`.

### Rules
- **Unread state cached locally** until refetch. Optimistic update on `markRead`: set the row to `read: true` immediately.
- **Tab badge** reads from `useUnreadCount`.
- **i18n** — type icons can stay emoji; titles and bodies come from the server (English in v1).

## 5. Edge Cases

- **No notifications:** empty state.
- **Tapping a notification linked to an order that was deleted:** navigates to detail screen → server returns 404 → "Order not found".
- **All read:** "Mark all read" button hidden.
- **Pagination loading:** skeleton rows.
- **Unread dot on row that user just tapped:** disappears immediately via optimistic update.

## 6. Test Cases

### Service
1. `listNotifications` calls correct URL.
2. `markRead(id)` calls `PATCH /notifications/:id/read`.

### Hook
3. `useMarkRead` invalidates `['notifications']` on success.
4. `useUnreadCount` returns correct count.

### NotificationRow
5. Renders unread dot when `!read`.
6. Tap calls `markRead`.
7. Tap with `orderId` navigates to order detail.

## 7. Definition of Done

- [ ] All service methods + hooks implemented
- [ ] NotificationRow with type icons + unread indicator
- [ ] Screen with FlashList + Mark all read + pull-to-refresh
- [ ] Unread count exposed via `useUnreadCount` hook
- [ ] Optimistic mark-read update
- [ ] Tap navigates to linked order
- [ ] Tests pass
- [ ] Branch `ihm/feat/notifications-screen-mobile`; PR title `[Slice 24]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 23](./23-notifications-service-api.md)
2. **Implement service + hooks** with TanStack patterns.
3. **Build NotificationRow** with proper accessibility (announce "unread" in accessibility label when unread).
4. **Build screen.**
5. **Manual smoke:** trigger a notification (e.g. cancel an order from another device) and watch it arrive in the list.

### Gotchas

- For optimistic updates, use `queryClient.setQueryData(['notifications'], updater)` and revert on error.
- The tab navigator (Slice 32) consumes `useUnreadCount` — make sure the hook is exported from the feature.
- Don't fetch unread count separately if it can be derived from the cached list — cheaper.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Notifications
- [`AGENTS.md`](../../AGENTS.md) §FlashList, §a11y
