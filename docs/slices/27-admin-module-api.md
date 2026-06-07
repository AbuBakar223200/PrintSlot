# Slice 27 — API: AdminModule (AppConfig CRUD + Analytics)

> **Type:** API (new module — does not exist)
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md), [Slice 13](./13-order-creation-api.md)
> **Branch:** `ihm/feat/admin-module-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`apps/api/src/modules/admin/` **does not exist**. Must create the entire module. Two responsibilities: manage AppConfig key-value pairs (used by WalletService, SlotsService for thresholds) and serve platform-wide analytics. Also adds shop-scoped analytics endpoint to `ShopsController`.

## 2. Goal

`AdminModule` with three admin endpoints (`GET/PATCH /admin/config`, `GET /admin/analytics`) and one shop-owner endpoint (`GET /shops/:id/analytics`). Revenue counted from COLLECTED orders only.

## 3. Files to Create / Modify

### Create
- `apps/api/src/modules/admin/admin.module.ts`
- `apps/api/src/modules/admin/admin.service.ts`
- `apps/api/src/modules/admin/admin.controller.ts`
- `apps/api/src/modules/admin/dto/update-app-config.dto.ts` — Zod: `{ value: string }`
- `apps/api/src/modules/admin/__tests__/admin.service.spec.ts`
- `apps/api/src/modules/admin/__tests__/admin.controller.spec.ts`

### Modify
- `apps/api/src/app.module.ts` — register AdminModule
- `apps/api/src/modules/shops/shops.service.ts` — add `getShopAnalytics(shopId, date)` method
- `apps/api/src/modules/shops/shops.controller.ts` — add `GET /shops/:id/analytics?date=` route

### Read first
- [`CONTEXT.md`](../../CONTEXT.md) §"Analytics revenue", §AppConfig
- [`docs/04-data-model.md`](../04-data-model.md) §AppConfig
- [`docs/05-api-contract.md`](../05-api-contract.md) §Admin, §Shop analytics

## 4. Implementation Rules

### Endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/admin/config` | PLATFORM_ADMIN | Returns all AppConfig as `Record<string, string>` |
| PATCH | `/admin/config/:key` | PLATFORM_ADMIN | Body: `{ value }`. Upsert. |
| GET | `/admin/analytics` | PLATFORM_ADMIN | Platform-wide summary |
| GET | `/shops/:id/analytics?date=YYYY-MM-DD` | SHOP_OWNER (own shop) | Day-level shop analytics |

### `GET /admin/config` response
```ts
{ data: { LOW_BALANCE_THRESHOLD: '50', SLOT_DURATION_MINS: '30', ... }, ... }
```

### `GET /admin/analytics` response
```ts
{
  totalShops: number,
  activeShops: number,
  pendingApprovals: number,
  totalOrders: number,
  totalRevenue: number,            // COLLECTED only
  revenuePerShop: Array<{ shopId, name, revenue, totalOrders }>
}
```

### `GET /shops/:id/analytics?date=YYYY-MM-DD` response
```ts
{
  date: string,
  totalOrders: number,
  revenue: number,                  // COLLECTED only
  byStatus: Record<OrderStatus, number>,
  avgProcessingMins: number | null  // null when no COLLECTED orders
}
```

### Rules
- **Revenue = SUM(totalPrice) where status = COLLECTED.** Both WALLET and CASH included.
- **Date filter** for shop analytics: orders where `createdAt` falls within the selected date in BST (translate `YYYY-MM-DD` to UTC range).
- **avgProcessingMins**: average of `(readyAt - processingStartedAt)` in minutes for COLLECTED orders on the date.
- **AppConfig upsert** on PATCH; rejecting unknown keys is not required (admin can add new ones).
- **Owner shop analytics** ownership check.

## 5. Edge Cases

- **No orders on date:** all counts 0; `avgProcessingMins = null`.
- **Date with all CANCELLED orders:** revenue 0; byStatus.CANCELLED set; avg null.
- **Date in the future:** all 0.
- **`AppConfig` key not yet seeded:** PATCH creates; GET excludes if not set; service has `getOrDefault` helper for known keys.
- **Owner queries another shop's analytics:** 403.
- **Date param missing on /shops/:id/analytics:** default to today (BST).

## 6. Test Cases

### Admin service
1. `getConfig` returns all AppConfig rows as object.
2. `updateConfig('LOW_BALANCE_THRESHOLD', '100')` upserts.
3. `getPlatformAnalytics` sums revenue from COLLECTED only.
4. `getPlatformAnalytics` excludes cancelled orders from revenue but counts in totalOrders.
5. `revenuePerShop` returns sorted by shopId.

### Shop analytics (via ShopsService)
6. Owner's analytics for today returns correct counts/revenue.
7. byStatus has correct counts per OrderStatus.
8. avgProcessingMins computed correctly.

### Controller
9. Non-admin → 403 on /admin/*.
10. Owner querying other shop's analytics → 403.

## 7. Definition of Done

- [ ] AdminModule created and registered
- [ ] AppConfig CRUD endpoints
- [ ] Platform analytics endpoint
- [ ] Shop owner analytics endpoint (in ShopsController)
- [ ] Revenue counts COLLECTED only
- [ ] Tests pass — all 10 cases
- [ ] Branch `ihm/feat/admin-module-api`; PR title `[Slice 27]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §Analytics
   - [`docs/04-data-model.md`](../04-data-model.md) §AppConfig
2. **Create the module directory.**
3. **Implement service** — focus on Prisma aggregates with the right filters.
4. **Wire controller** with `PLATFORM_ADMIN` guard.
5. **Add shop analytics method** to existing `ShopsService` + route in `ShopsController`.
6. **Register AdminModule** in app.module.ts.
7. **Run tests.**

### Gotchas

- BST date range: a "date YYYY-MM-DD in BST" maps to `[date 00:00 BST, date 24:00 BST)` = `[date 18:00 UTC prev day, date 18:00 UTC current day)`. Compute carefully.
- Revenue sums Prisma `Decimal`; convert to number for response.
- `avgProcessingMins` may need `Math.round(avg)` for display.
- Use `prisma.order.aggregate` and `prisma.order.groupBy` for efficient queries.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Admin
- [`CONTEXT.md`](../../CONTEXT.md) §"Analytics revenue", §AppConfig
- [`docs/04-data-model.md`](../04-data-model.md) §AppConfig
