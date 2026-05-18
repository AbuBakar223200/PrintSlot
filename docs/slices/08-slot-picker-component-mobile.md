# Slice 08 — Mobile: Customer Slot Picker Component

> **Type:** Mobile (reusable component)
> **Priority:** P0
> **Blocked by:** [Slice 07](./07-slots-module-api.md)
> **Branch:** `ihm/feat/slot-picker-component-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

When a customer chooses "Schedule Pickup," they must select a date (today to today + 3) and an open slot on that date. This is step 1 of the order creation wizard ([Slice 14](./14-order-creation-wizard-mobile.md)).

The component lives in the slots feature folder and is consumed by the order wizard. There is currently no slots feature directory on mobile.

## 2. Goal

A reusable `<SlotPicker shopId onChange={(slotId) => ...} />` component: shows date picker (4 days), fetches open slots for the selected date, renders selectable slot chips, and reports the chosen slot to the parent.

## 3. Files to Create / Modify

### Create
- `apps/mobile/src/features/slots/services/slotsApi.ts` — `getOpenSlots(shopId, date)` → `GET /shops/:id/slots?date=`
- `apps/mobile/src/features/slots/hooks/useShopSlots.ts` — `useShopSlots(shopId, date)` query
- `apps/mobile/src/features/slots/components/SlotPicker.tsx` — the main component
- `apps/mobile/src/features/slots/components/DateChip.tsx` — date selector chip
- `apps/mobile/src/features/slots/components/SlotChip.tsx` — slot selector chip
- `apps/mobile/src/features/slots/__tests__/SlotPicker.test.tsx`

### Read first
- [Slice 07](./07-slots-module-api.md) §Endpoints
- [`AGENTS.md`](../../AGENTS.md) — Pressable, FlashList, no falsy `&&`
- `apps/mobile/src/utils/formatDate.ts` — date formatting helper

## 4. Implementation Rules

### API service
- `getOpenSlots(shopId: string, date: string): Promise<Slot[]>` — server returns open, non-full slots only.

### Hook
- `useShopSlots(shopId, date)` — `useQuery` keyed `['shops', shopId, 'slots', date]`. Stale time 30 s.

### Component contract
```tsx
type SlotPickerProps = {
  shopId: string;
  value: string | null;            // selected slotId
  onChange: (slotId: string) => void;
};
```

### Layout
- **Date row:** 4 horizontal `DateChip`s for today, tomorrow, +2, +3.
  - Each shows weekday short label ("Mon", "Tue") + day-of-month.
  - Today's chip labelled "Today" instead of weekday.
  - Selected chip has primary background.
- **Slot row:** below date row, a grid (FlashList horizontal or wrap) of `SlotChip`s for the selected date.
  - Each shows time range `09:00 – 09:30` and remaining capacity `X left`.
  - Selected chip styled with primary border.
  - Tapping a chip calls `onChange(slot.id)`.
- **Empty state:** "No slots available for this date" message.
- **Loading state:** skeleton chips.

### Date math
- Use the device's local time for the today/tomorrow/+N labels.
- Send dates as `YYYY-MM-DD` strings (no time component).
- Optional: use Intl.DateTimeFormat hoisted to module scope to format weekday labels — never construct Intl inside render.

### Rules
- **No state stored about slots** — TanStack Query owns it.
- **`value` and `onChange` are controlled by the parent (the wizard store).** Component is dumb.
- **Re-fetch on date change.** Implicit via query key.
- **i18n keys:** weekday labels and "Today", "X left", "No slots available" use translation keys.

## 5. Edge Cases

- **No slots on selected date:** show empty state.
- **All slots full:** server returns empty array (server filters `currentCount < maxOrders`). Empty state shown.
- **User taps the same slot twice:** `onChange` fires both times; parent should handle deselection if needed (out of scope here).
- **Date in the past:** not reachable from this UI (date chips only show today + 3).
- **Slot fills between selection and order submission:** handled by [Slice 13](./13-order-creation-api.md) returning 409 — not this component's problem.
- **Network error fetching slots:** show error state with retry.

## 6. Test Cases

1. Default selected date is "today".
2. Changing date triggers new query with new date param.
3. Tapping a slot chip invokes `onChange` with the slot ID.
4. Empty state rendered when API returns `[]`.
5. Loading state rendered while fetching.

## 7. Definition of Done

- [ ] `slotsApi.ts`, `useShopSlots.ts`, `SlotPicker.tsx`, `DateChip.tsx`, `SlotChip.tsx` created
- [ ] Date row shows exactly 4 chips for today → today + 3
- [ ] Slot grid updates on date change
- [ ] Empty state visible when no slots
- [ ] Component is controlled (`value`, `onChange`)
- [ ] Tests pass
- [ ] No hardcoded weekday strings — used translation keys
- [ ] Branch `ihm/feat/slot-picker-component-mobile`; PR title `[Slice 08]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 07](./07-slots-module-api.md) §Endpoints
   - [`AGENTS.md`](../../AGENTS.md)
2. **Create the slots feature directory** structure.
3. **Implement `slotsApi.ts`** and `useShopSlots.ts`.
4. **Build `DateChip` and `SlotChip`** as small, focused components.
5. **Compose them in `SlotPicker`.**
6. **Test** with mocked query.

### Gotchas

- Hoist `Intl.DateTimeFormat` to module scope to avoid creating it on every render.
- Use `Pressable` not `TouchableOpacity`.
- A horizontal FlashList for date chips is overkill — a `View` row with `flexDirection: 'row'` is fine for 4 items.
- For the slot grid, if you expect ≤ 10 slots per day, a wrap layout (`flexWrap: 'wrap'`) is acceptable. Use FlashList only if list grows large.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`GET /shops/:id/slots`
- [`AGENTS.md`](../../AGENTS.md) §FlashList, §Intl objects hoisted
