# Slice 07 — API: SlotsModule (Templates + ShopSlots + Active Slot)

> **Type:** API (new module — directory does not exist)
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md)
> **Branch:** `ihm/feat/slots-module-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`apps/api/src/modules/slots/` **does not exist**. The module must be created from scratch. Three Prisma models are involved:

- `SlotTemplate` — global time-window definitions (`startTime` HH:MM, `endTime` HH:MM, `deletedAt` for soft delete). Managed by Platform Admin.
- `ShopSlot` — per-shop, per-template, per-date instance with `isOpen`, `maxOrders`, `currentCount`. Unique on `(shopId, templateId, date)`. Managed by Shop Owner.
- `Order.slotId` — every Order references a ShopSlot (queue mode auto-assigns to active slot; slot mode is customer-picked).

Downstream slices depend on this:
- [Slice 13](./13-order-creation-api.md) calls `SlotsService.getActiveSlot()` and `SlotsService.getSlotById()` to validate orders.
- [Slice 06](./06-shop-detail-screen-mobile.md) — `GET /shops/:id/slots/active` is called by mobile.
- [Slice 08](./08-slot-picker-component-mobile.md) — customer slot picker calls `GET /shops/:id/slots?date=`.
- [Slice 31](./31-owner-slots-jobs-analytics-mobile.md) — owner manages `ShopSlot` rows.

## 2. Goal

A complete `SlotsModule` exposing 7 endpoints, exporting `SlotsService` (injectable into `OrdersModule`), enforcing BST time-window logic for `getActiveSlot`, and treating `SlotTemplate` deletes as soft deletes.

## 3. Files to Create / Modify

### Create
- `apps/api/src/modules/slots/slots.module.ts`
- `apps/api/src/modules/slots/slots.service.ts`
- `apps/api/src/modules/slots/slots.controller.ts`
- `apps/api/src/modules/slots/dto/create-slot-template.dto.ts`
- `apps/api/src/modules/slots/dto/update-slot-template.dto.ts`
- `apps/api/src/modules/slots/dto/upsert-shop-slot.dto.ts`
- `apps/api/src/modules/slots/__tests__/slots.service.spec.ts`
- `apps/api/src/modules/slots/__tests__/slots.controller.spec.ts`

### Modify
- `apps/api/src/app.module.ts` — register `SlotsModule`
- `apps/api/src/modules/shops/shops.controller.ts` — proxy `GET /shops/:id/slots/active` to `SlotsService.getActiveSlot(shopId)` (or expose this route on `SlotsController`, the choice is yours — preferred: `SlotsController` owns it for cohesion, but client URL stays the same shape)

### Read first
- [`docs/04-data-model.md`](../04-data-model.md) §SlotTemplate, §ShopSlot
- [`docs/05-api-contract.md`](../05-api-contract.md) §Slots
- [`packages/shared/src/types/shop.types.ts`](../../packages/shared/src/types/shop.types.ts) — add `Slot` / `SlotTemplate` types if missing

## 4. Implementation Rules

### Endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| `POST` | `/slots/templates` | `PLATFORM_ADMIN` | Body: `{ startTime, endTime }` (HH:MM each). |
| `GET` | `/slots/templates` | Authenticated | Excludes `deletedAt IS NOT NULL`. |
| `PATCH` | `/slots/templates/:id` | `PLATFORM_ADMIN` | |
| `DELETE` | `/slots/templates/:id` | `PLATFORM_ADMIN` | Soft delete — set `deletedAt = now()`. |
| `POST` | `/shops/:id/slots` | `SHOP_OWNER` (own shop) | Body: `{ templateId, date (ISO), isOpen, maxOrders ≥ 1 }`. Upsert on `(shopId, templateId, date)`. |
| `GET` | `/shops/:id/slots?date=YYYY-MM-DD` | Authenticated | Returns open, non-full slots for the date. |
| `GET` | `/shops/:id/slots/active` | Public (no JWT) | Returns the slot matching current BST time, or `null`. |

### `getActiveSlot(shopId)` algorithm

```
nowUTC = new Date()
bstOffsetMs = 6 * 60 * 60 * 1000
bst = new Date(nowUTC.getTime() + bstOffsetMs)
bstDate = bst.toISOString().slice(0, 10) // YYYY-MM-DD
hh = String(bst.getUTCHours()).padStart(2, '0')
mm = String(bst.getUTCMinutes()).padStart(2, '0')
bstTime = `${hh}:${mm}`

// Find ShopSlot for shopId+bstDate that is open, has capacity, AND whose template window contains bstTime
candidate = first ShopSlot where:
  shopId = shopId
  date = bstDate
  isOpen = true
  currentCount < maxOrders
  template.startTime <= bstTime
  template.endTime > bstTime
  template.deletedAt = null
return candidate ?? null
```

### Rules

- **`startTime`/`endTime` Zod validation:** regex `^([01]\d|2[0-3]):[0-5]\d$`.
- **`date` Zod validation:** ISO date `YYYY-MM-DD` regex; parse to `Date` at midnight UTC for Prisma.
- **Soft delete only.** Hard delete is forbidden — existing ShopSlots referencing a template must keep working.
- **Upsert ShopSlot** by unique `(shopId, templateId, date)`. Update `isOpen`/`maxOrders`; do not touch `currentCount` here (only Order creation/cancellation touches it).
- **Capacity check** in `getOpenSlots(shopId, date)`: filter `currentCount < maxOrders`.
- **Reducing `maxOrders` below `currentCount` is allowed** (slot closes to new bookings; existing orders unaffected).
- **Ownership check** for `POST /shops/:id/slots`: `currentUser.shopId === id` or `currentUser.ownerShopId === id` (owner check) → otherwise 403.
- **Return shared types.** Add `Slot` and `SlotTemplate` to `packages/shared/src/types/` if missing. Map dates to ISO strings.

## 5. Edge Cases

- **No active slot at this moment** — `getActiveSlot` returns `null` (not throws).
- **Slot fully booked at this moment** — does not count as active. `getActiveSlot` returns `null` even if template window matches.
- **Slot closed (`isOpen = false`)** — same as above.
- **Slot template deleted** — should not match in `getActiveSlot` (filter `deletedAt IS NULL`). Existing ShopSlots referencing it remain in DB but become unreachable as "active".
- **Time exactly equal to `endTime`** — boundary: use `<` (exclusive end). A slot 09:00–09:30 covers 09:00–09:29:59.
- **Daylight save / timezone drift** — BST is UTC+6 fixed; no DST. Algorithm is safe.
- **Date crossing midnight in slot definition** (e.g. 23:30–00:30) — not supported in v1. Reject with 400 at template create if `endTime <= startTime`.
- **Reducing maxOrders to 0** — allowed; effectively closes the slot.
- **Duplicate ShopSlot upsert** — uses unique constraint; no error.

## 6. Test Cases

### Service spec (mocked Prisma)
1. `createTemplate({ startTime: '09:00', endTime: '09:30' })` → row inserted.
2. `createTemplate({ startTime: '12:00', endTime: '11:00' })` → throws 400 (endTime before startTime).
3. `deleteTemplate(id)` → sets `deletedAt`; row not removed.
4. `listTemplates()` excludes soft-deleted.
5. `upsertShopSlot` creates new row on first call; updates `isOpen`/`maxOrders` on second.
6. `getOpenSlots(shopId, date)` filters `isOpen = true` and `currentCount < maxOrders`.
7. `getActiveSlot(shopId)`:
   - Returns matching slot when current BST time is within template window
   - Returns `null` when no slot is open
   - Returns `null` when slot is full
   - Returns `null` when slot closed
8. `getActiveSlot` boundary: `endTime` exclusive.

### Controller spec
9. `POST /slots/templates` without `PLATFORM_ADMIN` → 403.
10. `POST /shops/:id/slots` for shop not owned by current user → 403.
11. `GET /shops/:id/slots/active` works without JWT.
12. `DELETE /slots/templates/:id` returns 200 and the template still queryable via direct lookup (not via list).

## 7. Definition of Done

- [ ] `slots.module.ts`, `slots.service.ts`, `slots.controller.ts` exist
- [ ] All 7 endpoints implemented and tested
- [ ] `SlotsService.getActiveSlot()` and `SlotsService.getSlotById()` exported for use by `OrdersService`
- [ ] BST time logic correctly identifies active slot with `< endTime` boundary
- [ ] Soft delete only — `DELETE` sets `deletedAt`, never removes the row
- [ ] `SlotsModule` registered in `app.module.ts`
- [ ] `Slot` and `SlotTemplate` shared types added to `packages/shared/src/types/`
- [ ] Service spec covers 8 cases; controller spec covers 4 cases
- [ ] `npm test -- --testPathPattern=slots` passes
- [ ] Branch `ihm/feat/slots-module-api`; PR title `[Slice 07]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`docs/04-data-model.md`](../04-data-model.md) §Slots
   - [`docs/05-api-contract.md`](../05-api-contract.md) §Slots
   - [`CONTEXT.md`](../../CONTEXT.md) §"slotId NOT NULL on all orders"
   - [`apps/api/src/modules/shops/shops.module.ts`](../../apps/api/src/modules/shops/shops.module.ts) — module pattern
2. **Add shared types first** to `packages/shared/src/types/` and re-export from `index.ts`.
3. **Write DTOs** with Zod schemas.
4. **Write `slots.service.spec.ts`** first (TDD red), covering all 8 cases.
5. **Implement `slots.service.ts`.** Pay special attention to the BST math — write the helper as a pure function for easy testing.
6. **Write `slots.controller.spec.ts`.**
7. **Implement `slots.controller.ts`.**
8. **Register `SlotsModule`** in `app.module.ts` and add `SlotsModule` to `imports` of `OrdersModule` (so OrdersService can inject SlotsService later in [Slice 13](./13-order-creation-api.md)).
9. **Manually verify** `GET /shops/:id/slots/active` returns correct slot during business hours.

### Gotchas

- BST is UTC+6 fixed — no DST. Use plain ms arithmetic, not a TZ library, to keep the implementation small and testable.
- Prisma stores `date` columns at midnight UTC. When querying by date, compare on `gte` midnight and `lt` next midnight.
- `Decimal` is not used in this module — all fields are integers or strings.
- Soft delete is enforced by every read query. Make a private helper `private deletedAtFilter() { return { deletedAt: null }; }` and reuse.

## 9. References

- [`docs/04-data-model.md`](../04-data-model.md) §SlotTemplate, §ShopSlot, §"Queue ETA Algorithm" (for slotId NOT NULL)
- [`docs/05-api-contract.md`](../05-api-contract.md) §Slots
- [`CONTEXT.md`](../../CONTEXT.md) §"slotId NOT NULL", §"Print Now availability"
