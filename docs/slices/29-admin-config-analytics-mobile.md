# Slice 29 — Mobile: Admin AppConfig + Platform Analytics Screens

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 27](./27-admin-module-api.md)
> **Branch:** `ihm/feat/admin-config-analytics-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Platform Admin needs two additional tabs: a Config screen for editing AppConfig values, and an Analytics screen for platform-wide stats and revenue per shop. Also needs an interface for SlotTemplate management.

## 2. Goal

`apps/mobile/app/(admin)/analytics.tsx` and `config.tsx` (new screens). Plus `apps/mobile/app/(admin)/slot-templates.tsx` for SlotTemplate CRUD.

## 3. Files to Create / Modify

### Create
- `apps/mobile/app/(admin)/analytics.tsx`
- `apps/mobile/app/(admin)/config.tsx`
- `apps/mobile/app/(admin)/slot-templates.tsx`
- `apps/mobile/src/features/admin/services/adminApi.ts` — extend (Slice 28 may have started this file)
- `apps/mobile/src/features/admin/hooks/useAdmin.ts` — extend

### Modify
- `apps/mobile/app/(admin)/_layout.tsx` — verify Slot Templates tab exists; add if not

### Read first
- [Slice 27](./27-admin-module-api.md) §Endpoints
- [Slice 07](./07-slots-module-api.md) §SlotTemplate endpoints

## 4. Implementation Rules

### adminApi additions
- `getConfig(): Promise<Record<string, string>>` — `GET /admin/config`.
- `updateConfig(key, value)` — `PATCH /admin/config/:key { value }`.
- `getPlatformAnalytics(): Promise<PlatformAnalytics>` — `GET /admin/analytics`.
- `listSlotTemplates()` / `createSlotTemplate(input)` / `updateSlotTemplate(id, input)` / `deleteSlotTemplate(id)`.

### Hooks
- `useAppConfig()`, `useUpdateAppConfig()`
- `usePlatformAnalytics()`
- `useSlotTemplates()`, `useCreateSlotTemplate()`, etc.

### analytics.tsx layout
- 4 summary cards: Total Shops, Active Shops, Total Orders, Total Revenue (৳).
- Pending approvals badge.
- FlashList of "Revenue per shop" — table with name, totalOrders, revenue.
- Pull-to-refresh.

### config.tsx layout
- List of known keys (`LOW_BALANCE_THRESHOLD`, `SLOT_DURATION_MINS`).
- Each row: label + current value + edit button.
- Inline edit modal — number input for these two known keys.
- "Add config" button — allows adding arbitrary keys (advanced; can be P1).

### slot-templates.tsx layout
- FlashList of templates: `09:00–09:30`, etc.
- "Add template" button → modal with two time pickers.
- Per row: Edit, Delete (soft).

### Rules
- **Validate time inputs** as HH:MM regex on client.
- **Confirmation modal** before delete.
- **Native Modal** only.
- **i18n keys.**

## 5. Edge Cases

- **Config key not yet set:** show "Not set" placeholder.
- **Delete template referenced by ShopSlots:** server soft-deletes; existing slots remain valid.
- **Time input invalid:** show inline error.
- **Empty analytics (new platform):** all zeros displayed.

## 6. Test Cases

1. `useAppConfig` calls `GET /admin/config`.
2. `useUpdateAppConfig` calls `PATCH /admin/config/:key`.
3. `usePlatformAnalytics` returns correct shape.
4. Time picker validates `HH:MM` format.
5. Delete template confirmation modal opens.

## 7. Definition of Done

- [ ] Analytics screen with 4 cards + revenue table
- [ ] Config screen with editable known keys
- [ ] Slot templates CRUD screen
- [ ] All actions wired to API
- [ ] Native Modal for confirmations
- [ ] Tests pass
- [ ] Branch `ihm/feat/admin-config-analytics-mobile`; PR title `[Slice 29]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 27](./27-admin-module-api.md)
   - [Slice 07](./07-slots-module-api.md)
2. **Extend adminApi.ts** with all needed methods.
3. **Build each screen** in turn.
4. **Use native Modal** for edit/delete confirmations.

### Gotchas

- For time picker on RN: use native `@react-native-community/datetimepicker` in time mode, or build a custom HH:MM input with two number inputs.
- Convert ৳ amounts with the existing currency formatter.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Admin, §SlotTemplate
- [`AGENTS.md`](../../AGENTS.md) §FlashList, §Modals
