# Slice 31 — Mobile: (owner) Slots + Jobs + Analytics Screens

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 07](./07-slots-module-api.md), [Slice 19](./19-order-status-advance-api.md), [Slice 27](./27-admin-module-api.md), [Slice 30](./30-owner-route-group-mobile.md)
> **Branch:** `ihm/feat/owner-slots-jobs-analytics-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

The (owner) route group exists from [Slice 30](./30-owner-route-group-mobile.md). This slice fills in the remaining tabs: Slots, Jobs, Analytics. Owner Jobs reuses the staff job dashboard logic ([Slice 20](./20-staff-job-dashboard-mobile.md)) — share components where possible.

## 2. Goal

Three working screens under `(owner)/`:
- `slots/index.tsx` — open/close ShopSlots per date with maxOrders.
- `jobs/index.tsx` + `jobs/[jobId].tsx` — reuse staff job logic.
- `analytics/index.tsx` — daily shop analytics.

## 3. Files to Create / Modify

### Create
- `apps/mobile/app/(owner)/slots/index.tsx`
- `apps/mobile/app/(owner)/jobs/index.tsx`
- `apps/mobile/app/(owner)/jobs/[jobId].tsx`
- `apps/mobile/app/(owner)/analytics/index.tsx`
- `apps/mobile/src/features/slots/hooks/useShopSlots.ts` — owner-side (extend existing if any)
- `apps/mobile/src/features/slots/services/slotsApi.ts` — extend with `upsertShopSlot`
- `apps/mobile/src/features/shops/hooks/useShopAnalytics.ts`
- `apps/mobile/src/features/shops/services/shopService.ts` — add `getShopAnalytics(shopId, date)`

### Read first
- [Slice 07](./07-slots-module-api.md) §`POST /shops/:id/slots`
- [Slice 19](./19-order-status-advance-api.md) and [Slice 20](./20-staff-job-dashboard-mobile.md) — reuse jobs logic
- [Slice 27](./27-admin-module-api.md) §`GET /shops/:id/analytics`

## 4. Implementation Rules

### Slots screen
- Header: date selector — today, +1, +2, +3 (4 chips).
- For selected date, list all non-deleted `SlotTemplate`s.
- Per template: toggle (open/closed) + maxOrders input.
- Save button calls `POST /shops/:id/slots` per row that changed (or batch — POST is upsert).
- Show `currentCount / maxOrders` if slot already exists.

### Jobs screens
- **Reuse the staff job logic 1:1.** Import `useShopOrders`, `useAdvanceStatus`, `JobRow` from Slice 20. The owner sees the same data because the API auto-scopes by `shopId`.
- Layout identical to staff. Optionally include extra "View Customer" link if desired.

### Analytics screen
- Date picker (default today).
- Calls `GET /shops/:id/analytics?date=YYYY-MM-DD`.
- Display cards: Total Orders, Revenue (৳), Avg Processing Time.
- Status breakdown: count per OrderStatus.
- Pull-to-refresh.

### Rules
- **shopId from authStore.user.shopId.**
- **i18n keys.**
- **No useNavigation — only router.**
- **TanStack invalidation** after `upsertShopSlot` for `['shops', shopId, 'slots', date]`.

## 5. Edge Cases

- **No SlotTemplates yet (admin hasn't created any):** show empty state with "Ask admin to add slot templates".
- **No analytics data for date:** show zeros + "No orders on this date" note.
- **maxOrders below currentCount:** API allows it; UI shows warning "X orders already scheduled".
- **Owner's shop is not ACTIVE (PENDING/REJECTED):** slot management disabled with banner.

## 6. Test Cases

1. Slots screen shows 4 date chips.
2. Toggle calls `upsertShopSlot`.
3. Save invalidates the slots query.
4. Jobs screen reuses staff hooks correctly.
5. Analytics shows revenue value with ৳.
6. Analytics with empty date shows zeros, not crash.

## 7. Definition of Done

- [ ] Slots screen with date selector + template list
- [ ] Toggle and maxOrders input wire to `POST /shops/:id/slots`
- [ ] Jobs screens import and reuse staff dashboard logic
- [ ] Analytics screen with date picker + cards + status breakdown
- [ ] All 4 screens accessible from owner tab nav
- [ ] No `useNavigation()` anywhere
- [ ] Tests pass
- [ ] Branch `ihm/feat/owner-slots-jobs-analytics-mobile`; PR title `[Slice 31]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - All blocker slices' §Implementation Rules
2. **Build Slots screen** — start with date chips, then template list, then save flow.
3. **Build Jobs screens** by importing from `apps/mobile/app/(staff)/jobs/`. Avoid duplicating code; lift shared logic to `apps/mobile/src/features/orders/`.
4. **Build Analytics screen.**
5. **Smoke test** as a shop owner end-to-end.

### Gotchas

- For the Jobs screens, just `import StaffJobList from '...'`-style reuse. Don't copy-paste.
- Date chip styling must match the customer SlotPicker for consistency.
- Revenue note: "Revenue counts collected orders only" in subtle subtitle.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Shops, §Slots
- [`AGENTS.md`](../../AGENTS.md)
