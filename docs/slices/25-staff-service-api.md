# Slice 25 — API: StaffService (Promote / Demote / List)

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md), [Slice 23](./23-notifications-service-api.md)
> **Branch:** `ihm/feat/staff-service-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

Shop Owners manage their staff by promoting existing CUSTOMER-role users. The API enforces: only CUSTOMER users can be promoted; demotion always succeeds; staff belongs to exactly one shop. Notifications fire on promotion.

`apps/api/src/modules/staff/staff.service.ts` and `staff.controller.ts` are empty stubs. DTO `assign-staff.dto.ts` exists (verify Zod schema).

## 2. Goal

Three working endpoints — `POST /shops/:id/staff`, `DELETE /shops/:id/staff/:userId`, `GET /shops/:id/staff` — with role + ownership checks, CUSTOMER-only promotion guard, and `STAFF_ASSIGNED` notification on success.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/api/src/modules/staff/staff.service.ts`
- `apps/api/src/modules/staff/staff.controller.ts`
- `apps/api/src/modules/staff/staff.module.ts` — `imports: [NotificationsModule]`
- `apps/api/src/modules/staff/dto/assign-staff.dto.ts` — verify Zod: `{ userId: string (uuid) }`

### Create
- `apps/api/src/modules/staff/__tests__/staff.service.spec.ts` (extend if exists)
- `apps/api/src/modules/staff/__tests__/staff.controller.spec.ts`

### Read first
- [`docs/05-api-contract.md`](../05-api-contract.md) §Staff
- [`CONTEXT.md`](../../CONTEXT.md) §"Staff promotion flow", §"Staff demotion flow"
- [Slice 23](./23-notifications-service-api.md) §notifyStaffAssigned

## 4. Implementation Rules

### Endpoints

| Method | Path | Roles | Body | Notes |
|---|---|---|---|---|
| POST | `/shops/:id/staff` | SHOP_OWNER (own shop) | `{ userId }` | Promote CUSTOMER to STAFF |
| DELETE | `/shops/:id/staff/:userId` | SHOP_OWNER (own shop) | — | Demote to CUSTOMER |
| GET | `/shops/:id/staff` | SHOP_OWNER (own shop) | — | List current staff |

### Ownership check
- Load shop. If `shop.ownerId !== currentUser.id` → 403.
- For DELETE: also verify target user has `shopId === shopId` else 404.

### Promotion flow
1. Load shop and verify ownership.
2. Load target user. 404 if not exists.
3. If `target.role !== 'CUSTOMER'` → 400 "Only customers can be promoted to staff."
4. Update: `{ role: 'STAFF', shopId: shopId }`.
5. After update: call `notificationsService.notifyStaffAssigned(userId, shopName)`.
6. Return updated User as shared type.

### Demotion flow
1. Load shop and verify ownership.
2. Load target user.
3. Verify `target.role === 'STAFF'` and `target.shopId === shopId` → 404 if mismatch.
4. Update: `{ role: 'CUSTOMER', shopId: null }`.
5. Always succeeds — even if user has PROCESSING orders. Those continue under their original assignment.

### Listing
- Return all `User` rows where `role = STAFF` and `shopId = shopId`.

### Rules
- **No self-promotion** — owner cannot promote themselves (their role is already SHOP_OWNER → 400).
- **Cannot promote an existing STAFF** (already has role STAFF) → 400.
- **Cannot promote a PLATFORM_ADMIN** → 400 (role guard above catches this implicitly).
- **No data integrity concern with active orders** — demotion does not affect existing Order rows.

## 5. Edge Cases

- **Target userId not found:** 404.
- **Owner trying to promote themselves:** their role is SHOP_OWNER, not CUSTOMER → 400.
- **Already STAFF:** 400 (covered by CUSTOMER-only rule).
- **Owner demotes a staff who has PROCESSING orders:** demotion succeeds; orders remain assigned. (Future enhancement: notify orders or reassign.)
- **DELETE for userId not currently staff of this shop:** 404.
- **GET /shops/:id/staff for another owner's shop:** 403.

## 6. Test Cases

### Service
1. `assignStaff` promotes CUSTOMER → STAFF and sets shopId.
2. `assignStaff` rejects when target is STAFF: 400.
3. `assignStaff` rejects when target is SHOP_OWNER: 400.
4. `assignStaff` for non-owner: 403.
5. `removeStaff` reverts STAFF → CUSTOMER and clears shopId.
6. `removeStaff` for user not in this shop: 404.
7. `listStaff` returns only this shop's STAFF.
8. `STAFF_ASSIGNED` notification fired on promotion.

### Controller
9. POST without SHOP_OWNER role: 403.
10. DELETE for shop not owned: 403.
11. GET response wrapped in `{ data, ... }`.

## 7. Definition of Done

- [ ] Service methods cover promote/demote/list
- [ ] Ownership checks enforced on all three endpoints
- [ ] Only CUSTOMER can be promoted; 400 for other roles
- [ ] STAFF_ASSIGNED notification fired on promotion
- [ ] Tests pass — all 11 cases
- [ ] Branch `ihm/feat/staff-service-api`; PR title `[Slice 25]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §Staff rules
   - [Slice 23](./23-notifications-service-api.md)
2. **Write spec first** with all 8 service cases.
3. **Implement service.**
4. **Wire controller** with role guards.
5. **Test.**

### Gotchas

- The ownership check should be a single private helper `private async assertOwnership(shopId, ownerId)` reused across all three endpoints.
- Return the updated User mapped to shared type — not Prisma model.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §"Staff promotion flow", §"Staff demotion flow"
- [`docs/05-api-contract.md`](../05-api-contract.md) §Staff
