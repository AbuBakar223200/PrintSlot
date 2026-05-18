# Slice 30 — Mobile: (owner) Route Group — Layout + Shop Screen

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 04](./04-shops-service-api.md)
> **Branch:** `ihm/feat/owner-route-group-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

`apps/mobile/app/_layout.tsx` redirects `SHOP_OWNER` to `/(owner)/shop/` but the directory does not exist. Without it, owner-role users land on a 404 route after login.

This slice creates the route group and the first tab (Shop view/edit). [Slice 31](./31-owner-slots-jobs-analytics-mobile.md) adds the rest (Slots, Jobs, Analytics).

## 2. Goal

Working (owner) route group with tab navigator and the Shop tab — view shop info, edit fields and pricing rates, handle the PENDING/REJECTED/ACTIVE/SUSPENDED states, and offer resubmit when REJECTED.

## 3. Files to Create / Modify

### Create
- `apps/mobile/app/(owner)/_layout.tsx`
- `apps/mobile/app/(owner)/shop/index.tsx`
- `apps/mobile/src/features/shops/hooks/useOwnerShop.ts`
- `apps/mobile/src/features/shops/services/shopService.ts` — extend with `updateShop`, `resubmitShop`, `getOwnerShop`
- `apps/mobile/app/(owner)/index.tsx` — redirect to `/(owner)/shop/`

### Modify
- `apps/mobile/app/_layout.tsx` — verify SHOP_OWNER redirect goes to `/(owner)/shop/`

### Read first
- [Slice 04](./04-shops-service-api.md) §Endpoints + Status transitions
- [`AGENTS.md`](../../AGENTS.md) §Modals, §Pressable

## 4. Implementation Rules

### (owner)/_layout.tsx
- Expo Router `<Tabs>` with tabs: Shop, Jobs, Slots, Staff, Analytics.
- Role guard: redirect non-SHOP_OWNER to login.
- Header style consistent across tabs.

> **Tabs for Jobs / Slots / Staff / Analytics are placeholders here.** [Slice 31](./31-owner-slots-jobs-analytics-mobile.md) and [Slice 26](./26-staff-management-screen-mobile.md) fill them. To avoid a broken route, scaffold empty stubs that say "Coming soon" if needed.

### Owner shop service
- `getOwnerShop(): Promise<Shop | null>` — owner has one shop. Fetch by `currentUser.shopId`? Or via a dedicated `GET /shops/mine` endpoint — coordinate with API. **Pragmatic v1:** owner's shopId lives on `authStore.user.shopId`; call `GET /shops/:id` directly.
- `updateShop(shopId, patch): Promise<Shop>` — `PATCH /shops/:id`.
- `resubmitShop(shopId): Promise<Shop>` — `PATCH /shops/:id/resubmit`.

### shop/index.tsx
- States to handle:
  - **No shop yet (new owner):** show CTA "Create your shop" → navigates to a creation screen (or inline form). For v1, inline form using POST /shops.
  - **PENDING:** banner "Pending admin approval" + read-only details + edit button.
  - **ACTIVE:** editable form + save button.
  - **REJECTED:** banner with rejectionReason + edit form + "Resubmit" button.
  - **SUSPENDED:** banner "Shop suspended — contact platform admin" + read-only details.
- Form fields: name, address, phone, colorRate, bwRate, a3Surcharge, duplexDiscount, defaultProcessingMins.
- Save calls `updateShop`.
- Resubmit calls `resubmitShop`.

### Rules
- **TanStack Query keyed by shopId.**
- **Optimistic UI:** save button disables while submitting.
- **Error toasts** for 4xx server responses.
- **Owner without shopId set** → render create flow.
- **i18n keys.**

## 5. Edge Cases

- **New owner with no shop:** `authStore.user.shopId` is null. Show "Create Shop" flow.
- **Owner sees their own PENDING shop:** unlike public `GET /shops`, `GET /shops/:id` returns regardless of status.
- **REJECTED → resubmit:** after success, the shop becomes PENDING; UI updates.
- **SUSPENDED:** no actions available; admin reinstates.
- **Decimal rate input:** validate as positive number with ≤ 2 decimals.

## 6. Test Cases

1. SHOP_OWNER with no shop sees "Create Shop" flow.
2. SHOP_OWNER with PENDING shop sees pending banner.
3. Save button calls `updateShop`.
4. Resubmit on REJECTED transitions to PENDING.
5. SUSPENDED hides edit form.

## 7. Definition of Done

- [ ] (owner)/_layout.tsx with tab navigator
- [ ] Role guard redirects non-SHOP_OWNER
- [ ] Shop tab handles all 4 status states + no-shop case
- [ ] Form saves changes via PATCH
- [ ] Resubmit available only for REJECTED
- [ ] Stub tabs for Jobs/Slots/Staff/Analytics (placeholder messages OK; replaced by other slices)
- [ ] Tests pass
- [ ] Branch `ihm/feat/owner-route-group-mobile`; PR title `[Slice 30]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 04](./04-shops-service-api.md) §Status transitions matrix
2. **Create the (owner) directory.**
3. **Build the layout with tabs** — for stub tabs, show "Coming soon" placeholder screens.
4. **Build the shop screen** — start with the form, then layer in status banners.
5. **Test all 5 states.**

### Gotchas

- `_layout.tsx` already redirects SHOP_OWNER to `/(owner)/shop/` — match path exactly.
- Tab labels: "Shop", "Jobs", "Slots", "Staff", "Analytics".
- Use `authStore.user.shopId` to determine whether owner has a shop.
- For the create flow, after `POST /shops` success, update `authStore` with the new user (since `shopId` is set on the User row by the server response? — verify; if not, refetch `/auth/me`).

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Shops
- [`CONTEXT.md`](../../CONTEXT.md) §Shop status transitions
- [`AGENTS.md`](../../AGENTS.md)
