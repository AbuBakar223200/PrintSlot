# Slice 04 — API: ShopsService — CRUD + Status Transitions

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 01](./01-prisma-migration-seed.md)
> **Branch:** `ihm/feat/shops-service-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`apps/api/src/modules/shops/shops.service.ts` and `shops.controller.ts` are empty stubs. DTOs `create-shop.dto.ts` and `update-shop.dto.ts` exist (verify they have Zod schemas; complete if not). The `Shop` Prisma model has the `ShopStatus` enum (`PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`) and unique `ownerId`.

Other slices depend on this:
- [Slice 07](./07-slots-module-api.md) — uses `ShopsService.findById` for active slot guards.
- [Slice 13](./13-order-creation-api.md) — requires `shop.status === 'ACTIVE'` before order creation.
- [Slice 27](./27-admin-module-api.md) — uses analytics + status transitions.
- Customer/owner/admin mobile screens depend on these endpoints.

## 2. Goal

A fully working `ShopsController` with seven endpoints and a `ShopsService` enforcing every status-transition rule. All endpoints return the shared `Shop` type.

## 3. Files to Create / Modify

### Modify (stubs exist)
- `apps/api/src/modules/shops/shops.service.ts`
- `apps/api/src/modules/shops/shops.controller.ts`
- `apps/api/src/modules/shops/shops.module.ts` — ensure `ShopsService` exported
- `apps/api/src/modules/shops/dto/create-shop.dto.ts` — Zod schema: `{ name, address, phone?, colorRate, bwRate, a3Surcharge, duplexDiscount }`
- `apps/api/src/modules/shops/dto/update-shop.dto.ts` — partial of create + optional `defaultProcessingMins`

### Create
- `apps/api/src/modules/shops/dto/update-shop-status.dto.ts` — Zod: `{ status: ShopStatus, rejectionReason?: string }`
- `apps/api/src/modules/shops/__tests__/shops.controller.spec.ts`

### Already exists (extend with new test cases)
- `apps/api/src/modules/shops/__tests__/shops.service.spec.ts`

### Read first
- `packages/shared/src/types/shop.types.ts` — shared `Shop` shape
- `apps/api/src/modules/auth/auth.service.ts` — mapping pattern for Prisma → shared
- [`docs/05-api-contract.md`](../05-api-contract.md) §Shops

## 4. Implementation Rules

### Endpoints

| Method | Path | Roles | Body | Notes |
|---|---|---|---|---|
| POST | `/shops` | `SHOP_OWNER` | `CreateShopDto` | Sets `ownerId = currentUser.id`; status defaults to `PENDING`. Unique constraint on `ownerId` enforced. |
| GET | `/shops` | Public (no JWT required) | — | Returns only `status: ACTIVE`. Supports `?search=` filter on name (case-insensitive contains). |
| GET | `/shops/:id` | Authenticated | — | Returns shop regardless of status — owner needs to view own PENDING/REJECTED shop. |
| PATCH | `/shops/:id` | `SHOP_OWNER` (own shop) | `UpdateShopDto` | Cannot change `ownerId` or `status`. |
| PATCH | `/shops/:id/status` | `PLATFORM_ADMIN` | `UpdateShopStatusDto` | Strict transition matrix below. |
| PATCH | `/shops/:id/resubmit` | `SHOP_OWNER` (own shop) | — | Only from `REJECTED` → `PENDING`. Clears `rejectionReason`. |
| GET | `/shops/:id/analytics?date=YYYY-MM-DD` | `SHOP_OWNER` (own shop) | — | Owner-scoped analytics — defer implementation to [Slice 27](./27-admin-module-api.md) but reserve the route. |

### Status transition matrix

| From | To | Who | Notes |
|---|---|---|---|
| `PENDING` | `ACTIVE` | Admin | Fires `SHOP_APPROVED` notification |
| `PENDING` | `REJECTED` | Admin | Requires `rejectionReason`. Fires `SHOP_REJECTED` |
| `ACTIVE` | `SUSPENDED` | Admin | Fires `SHOP_SUSPENDED` |
| `SUSPENDED` | `ACTIVE` | Admin | Reinstatement |
| `SUSPENDED` | `REJECTED` | Admin | Requires `rejectionReason` |
| `REJECTED` | `PENDING` | Owner (via `/resubmit`) | Allowed once. Clears `rejectionReason` |

Any other transition → 400 `"Invalid status transition"`.

### Rules

- **One shop per owner:** unique `ownerId`. Creating a second shop returns 409.
- **Ownership check:** for owner endpoints, verify `shop.ownerId === currentUser.id` or return 403.
- **Status check is the owner's responsibility, not the customer's:** `GET /shops` filters to `ACTIVE`; `GET /shops/:id` returns regardless of status; orders only block at creation time ([Slice 13](./13-order-creation-api.md)).
- **Pricing rates** stored as `Decimal`. Map to JS `number` in the shared type before returning.
- **Notification dispatch** for status transitions: at this slice, leave a TODO comment marker — actual notification firing requires [Slice 23](./23-notifications-service-api.md). Inject `NotificationsService` if it exists; otherwise add the call when Slice 23 lands.

## 5. Edge Cases

- **Owner creating a second shop:** unique constraint → 409 "You already have a shop."
- **Customer attempting to create:** RolesGuard → 403.
- **PATCH /shops/:id by a different owner:** ownership check → 403.
- **Status transition with missing `rejectionReason` when required:** 400 "rejectionReason required."
- **Resubmit from `SUSPENDED`:** 400 "Cannot resubmit from suspended state — admin reinstatement required."
- **Resubmit from `ACTIVE` or `PENDING`:** 400 "Shop is not rejected."
- **Search query with special regex chars:** treat as literal text in Prisma `contains` filter (no SQL injection — Prisma parameterises).
- **Empty `?search=`:** return all active shops.
- **PATCH /shops/:id with `ownerId` or `status` in body:** Zod `.strict()` rejects them → 400.
- **Decimal precision:** ensure rates serialise to two decimal places when mapped.

## 6. Test Cases

### Service spec
1. `createShop(dto, ownerId)` returns new Shop with `status: PENDING` and correct `ownerId`.
2. `createShop` with an owner who already has a shop → throws 409.
3. `updateShop(id, dto, ownerId)` succeeds for own shop, throws 403 for other owner's shop.
4. `updateStatus('PENDING', 'ACTIVE')` succeeds; `updateStatus('PENDING', 'COLLECTED')` throws 400; `updateStatus('PENDING', 'REJECTED')` without reason throws 400.
5. `resubmit` from `REJECTED` returns `PENDING` and clears `rejectionReason`.
6. `resubmit` from `SUSPENDED` throws 400.
7. `listActive()` returns only `ACTIVE` shops.
8. `listActive({ search: 'lib' })` filters by name (case-insensitive).
9. Service maps Prisma `Decimal` rates to JS `number` in returned shape.

### Controller spec
10. `POST /shops` without `SHOP_OWNER` role → 403.
11. `PATCH /shops/:id/status` without `PLATFORM_ADMIN` role → 403.
12. `GET /shops` does not require JWT (public). If protected, returns 401 — adjust to make this case pass.
13. `POST /shops` with extra body field rejects with 400 (`.strict()`).

## 7. Definition of Done

- [ ] `shops.service.ts` implements all eight methods listed in §4
- [ ] `shops.controller.ts` wires all six (or seven) routes with correct guards
- [ ] Status transition matrix enforced strictly (test §6 #4 passes)
- [ ] Ownership checks enforced (§6 #3, #11 pass)
- [ ] `Decimal` rates mapped to JS `number` in all responses
- [ ] Service spec covers all 9 cases; controller spec covers all 4 cases
- [ ] `npm test -- --testPathPattern=shops` passes
- [ ] Branch `ihm/feat/shops-service-api`; PR title `[Slice 04]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`docs/05-api-contract.md`](../05-api-contract.md) §Shops
   - [`docs/04-data-model.md`](../04-data-model.md) §Shop, §ShopStatus
   - [`CONTEXT.md`](../../CONTEXT.md) §"Shop status transitions"
   - The existing empty stub files
2. **Write the DTOs first** (Zod schemas with `.strict()`).
3. **Write `shops.service.spec.ts`** (TDD red).
4. **Implement `shops.service.ts`** (TDD green). Keep methods small and focused — one per endpoint, plus a private `mapToSharedShop` helper.
5. **Write `shops.controller.spec.ts`.**
6. **Implement `shops.controller.ts`.**
7. **Leave a TODO** in places where notification dispatch is needed: `// TODO(Slice 23): NotificationsService.notifyShopApproved(shop, ownerId)`.
8. **Run** `npm test -- --testPathPattern=shops` and verify green.

### Gotchas

- The shared `Shop` type stores rates as `number`. Convert with `Number(prismaShop.colorRate)` or `.toNumber()` when mapping.
- Prisma `Decimal` does not survive JSON serialisation — always map before returning.
- `@Roles(Role.SHOP_OWNER)` decorator and `RolesGuard` must both be applied — guard order: `JwtAuthGuard` first, then `RolesGuard`.
- For the `GET /shops` public endpoint, omit `JwtAuthGuard` from that route only. All others require it.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Shops endpoints
- [`docs/04-data-model.md`](../04-data-model.md) §Shop
- [`CONTEXT.md`](../../CONTEXT.md) §"Shop status transitions", §"Active shop required"
- [`docs/CODING_STANDARDS.md`](../CODING_STANDARDS.md) §Service mapping pattern
