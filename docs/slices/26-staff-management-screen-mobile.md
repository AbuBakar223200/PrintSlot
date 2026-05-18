# Slice 26 — Mobile: Staff Management Screen (Owner Group)

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 25](./25-staff-service-api.md), [Slice 30](./30-owner-route-group-mobile.md)
> **Branch:** `ihm/feat/staff-management-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

The (owner) route group exists ([Slice 30](./30-owner-route-group-mobile.md)). This slice owns the Staff tab — listing current staff, promoting a customer by userId, and removing existing staff.

## 2. Goal

`apps/mobile/app/(owner)/staff/index.tsx` — staff list with promote-by-userId input and remove buttons. Uses StaffService API.

## 3. Files to Create / Modify

### Create
- `apps/mobile/app/(owner)/staff/index.tsx`
- `apps/mobile/src/features/staff/services/staffApi.ts`
- `apps/mobile/src/features/staff/hooks/useStaff.ts`
- `apps/mobile/src/features/staff/__tests__/useStaff.test.ts`

### Read first
- [Slice 25](./25-staff-service-api.md) §Endpoints
- [Slice 30](./30-owner-route-group-mobile.md) §Layout

## 4. Implementation Rules

### Service
- `listStaff(shopId)` → `GET /shops/:id/staff`.
- `assignStaff(shopId, userId)` → `POST /shops/:id/staff { userId }`.
- `removeStaff(shopId, userId)` → `DELETE /shops/:id/staff/:userId`.

### Hooks
- `useStaff(shopId)` — query.
- `useAssignStaff()` — mutation invalidating `['shops', shopId, 'staff']`.
- `useRemoveStaff()` — mutation invalidating same key.

### Screen layout
- Header: "Staff (X)" + add button.
- FlashList of staff rows: name, email, "Remove" button.
- Add staff modal: text input for userId or email (v1: userId; future: email lookup) + Submit button.
- Empty state: "No staff yet."

### Rules
- **shopId** comes from `authStore.user.shopId` (owner's own shop).
- **403 on add when target isn't CUSTOMER** → toast "Only customers can be promoted to staff."
- **404 on remove** → toast "Staff not found."
- **Confirmation modal on remove** — native `<Modal presentationStyle="formSheet">`.
- **i18n keys.**

## 5. Edge Cases

- **Owner enters their own userId:** server returns 400; toast.
- **Owner enters userId that's already staff at this shop:** server returns 400.
- **Owner enters userId of staff at another shop:** server returns 400 (since their role is STAFF, not CUSTOMER).
- **No staff yet:** empty state.
- **Network error during list:** error state with retry.

## 6. Test Cases

1. `useStaff(shopId)` calls `GET /shops/:id/staff`.
2. `useAssignStaff` calls `POST /shops/:id/staff`.
3. Successful assign invalidates staff query.
4. 400 on assign shows toast.
5. Remove confirmation modal opens on remove button.

## 7. Definition of Done

- [ ] Service + hooks implemented
- [ ] Staff list screen with add/remove flows
- [ ] Add modal accepts userId
- [ ] Remove confirmation modal (native Modal)
- [ ] All error responses surfaced as toasts
- [ ] Tests pass
- [ ] Branch `ihm/feat/staff-management-screen-mobile`; PR title `[Slice 26]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 25](./25-staff-service-api.md)
   - [Slice 30](./30-owner-route-group-mobile.md) — to know the layout context
2. **Implement service + hooks.**
3. **Build the screen.**
4. **Wire native Modal for confirmation.**

### Gotchas

- The screen lives in the (owner) route group — Slice 30 must ship first (or in parallel) for the route to exist.
- Use the shopId from `authStore.user.shopId` (owner's shop).
- Future enhancement: lookup by email — keep userId for v1.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Staff
- [`CONTEXT.md`](../../CONTEXT.md) §Staff rules
- [`AGENTS.md`](../../AGENTS.md) §Modals (native Modal only)
