# Slice 28 — Mobile: Admin Shop Approval Screen

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md), [Slice 27](./27-admin-module-api.md)
> **Branch:** `ihm/feat/admin-shop-approval-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

The Platform Admin approves new shops, can reinstate suspended ones, and reject with a reason. `apps/mobile/app/(admin)/shops.tsx` exists as a stub. `apps/mobile/app/(admin)/_layout.tsx` exists but needs a tab navigator.

## 2. Goal

Shops tab inside (admin) route group with two sub-tabs ("Pending" / "All"), each showing a list with action buttons; Reject opens a native Modal for reason input.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/app/(admin)/_layout.tsx` — add tab navigator
- `apps/mobile/app/(admin)/shops.tsx`

### Create
- `apps/mobile/src/features/admin/services/adminApi.ts` — admin endpoints
- `apps/mobile/src/features/admin/hooks/useAdmin.ts`
- `apps/mobile/src/features/admin/components/ShopApprovalRow.tsx`
- `apps/mobile/src/features/admin/components/RejectShopModal.tsx`

### Read first
- [Slice 04](./04-shops-service-api.md) §Status transitions
- [Slice 27](./27-admin-module-api.md) §Endpoints

## 4. Implementation Rules

### adminApi.ts (this slice's portion)
- `listShops(status?: ShopStatus): Promise<Shop[]>` — fetches all shops; client-side filtering by status if backend doesn't support it (extend `GET /shops` or add an admin-scoped endpoint; for v1, list all and filter client-side).
- `updateShopStatus(shopId, status, rejectionReason?): Promise<Shop>` — `PATCH /shops/:id/status`.

> **Note:** the existing `GET /shops` from Slice 04 filters to ACTIVE only. For admin to see all, add an admin variant `GET /admin/shops?status=...` to `AdminController` (Slice 27 should include this — coordinate). Or treat `GET /shops/:id` per-row.

### Hooks
- `useAdminShops(status?)` — query.
- `useUpdateShopStatus()` — mutation invalidates `['admin', 'shops']`.

### (admin)/_layout.tsx
- Tab navigator: Shops, Analytics, Config.
- Use Expo Router `<Tabs>`.

### shops.tsx
- Top: segmented control "Pending" / "All".
- "Pending" shows status=PENDING shops.
- "All" shows status=ACTIVE/REJECTED/SUSPENDED.
- FlashList of `ShopApprovalRow`.

### ShopApprovalRow
- Shop name + status badge.
- Address line.
- For PENDING: "Approve" and "Reject" buttons.
- For ACTIVE: "Suspend" button.
- For SUSPENDED: "Reinstate" and "Reject" buttons.
- For REJECTED: read-only with rejection reason.

### RejectShopModal
- Native Modal with `presentationStyle="formSheet"`.
- Text input for `rejectionReason`, min 5 chars.
- "Reject" button calls `updateShopStatus(shopId, 'REJECTED', reason)`.

### Rules
- **All status transitions valid per Slice 04 matrix.**
- **403 from backend on invalid transition** — surface message.
- **Optimistic invalidation** on success.
- **Native Modal only** (no JS bottom sheet).

## 5. Edge Cases

- **No pending shops:** empty state in Pending tab.
- **Suspending an active shop:** confirmation modal.
- **Reject with empty reason:** disable submit until ≥ 5 chars.
- **Network failure:** show toast.

## 6. Test Cases

1. Pending sub-tab filters PENDING shops.
2. Approve button calls `updateShopStatus(id, ACTIVE)`.
3. Reject modal requires reason ≥ 5 chars.
4. Reject submit calls `updateShopStatus(id, REJECTED, reason)`.
5. Success invalidates `['admin', 'shops']`.

## 7. Definition of Done

- [ ] (admin) tab layout with Shops, Analytics, Config tabs
- [ ] Shops screen with Pending/All sub-tabs
- [ ] Approve/Reject/Suspend/Reinstate actions per status
- [ ] Native Modal for reject reason
- [ ] All actions surface 4xx errors as toasts
- [ ] Tests pass
- [ ] Branch `ihm/feat/admin-shop-approval-mobile`; PR title `[Slice 28]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 04](./04-shops-service-api.md) §Status transitions matrix
   - [Slice 27](./27-admin-module-api.md)
2. **If Slice 27 added admin-scoped GET /admin/shops, use it.** Otherwise, fetch all with the public endpoint and supplement with admin-only fetches per shopId — coordinate with API author.
3. **Build (admin) tab layout** with Expo Router `<Tabs>`.
4. **Build ShopApprovalRow** with status-conditional buttons.
5. **Build RejectShopModal** with validation.
6. **Wire all status transition mutations.**

### Gotchas

- Segmented control on top: roll your own `Pressable` row, no library.
- Reject reason must be passed as `rejectionReason` (not `reason`) — match API exactly.
- The PLATFORM_ADMIN role guard in `(admin)/_layout.tsx` redirects others away.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`PATCH /shops/:id/status`
- [`CONTEXT.md`](../../CONTEXT.md) §"Shop status transitions"
- [`AGENTS.md`](../../AGENTS.md) §Modals
