# Slice 14 — Mobile: Order Creation Wizard (4 Steps)

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 06](./06-shop-detail-screen-mobile.md), [Slice 08](./08-slot-picker-component-mobile.md), [Slice 11](./11-file-upload-mobile.md), [Slice 13](./13-order-creation-api.md)
> **Branch:** `ihm/feat/order-creation-wizard-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

This is the customer's order placement flow. Reached from Shop Detail's "Print Now" or "Schedule Pickup" buttons ([Slice 06](./06-shop-detail-screen-mobile.md)). It consumes the slot picker, file picker, and PrintConfigForm built in earlier slices. The terminal action is `POST /orders` ([Slice 13](./13-order-creation-api.md)).

The screen file `apps/mobile/app/(customer)/orders/new.tsx` exists as a stub. The Zustand wizard store and order service hooks are empty.

## 2. Goal

A 4-step wizard that gracefully handles every error path (insufficient balance, slot full, shop inactive, no active slot), uses Zustand only for wizard state, invalidates relevant queries on success, and navigates to the order detail screen.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/src/features/orders/store/orderStore.ts` — wizard state
- `apps/mobile/src/features/orders/services/orderService.ts` — `previewPrice`, `createOrder`
- `apps/mobile/src/features/orders/hooks/useOrders.ts` — `usePreviewPrice`, `useCreateOrder`
- `apps/mobile/app/(customer)/orders/new.tsx` — the wizard screen

### Create
- `apps/mobile/src/features/orders/__tests__/orderStore.test.ts`
- `apps/mobile/src/features/orders/__tests__/orderService.test.ts`

### Read first
- [Slice 13](./13-order-creation-api.md) §DTO + §Errors
- [Slice 08](./08-slot-picker-component-mobile.md), [Slice 10](./10-print-config-form-mobile.md), [Slice 11](./11-file-upload-mobile.md)
- [`AGENTS.md`](../../AGENTS.md)

## 4. Implementation Rules

### Wizard store (Zustand)

```ts
type WizardState = {
  shopId: string | null;
  mode: 'QUEUE' | 'SLOT' | null;
  slotId: string | null;
  files: WizardFile[];           // see Slice 11
  paymentMethod: 'WALLET' | 'CASH' | null;
  step: 1 | 2 | 3 | 4;
  totalPrice: number | null;     // from preview
  previewedAt: number | null;    // timestamp
};

type WizardActions = {
  init: (shopId: string, mode: 'QUEUE' | 'SLOT') => void;
  setSlot: (slotId: string) => void;
  addFile: (file: WizardFile) => void;
  updateFile: (localId: string, patch: Partial<WizardFile>) => void;
  removeFile: (localId: string) => void;
  setPaymentMethod: (m: 'WALLET' | 'CASH') => void;
  setStep: (s: 1 | 2 | 3 | 4) => void;
  setPreview: (totalPrice: number) => void;
  reset: () => void;
};
```

### Service
- `previewPrice(input)` → `POST /orders/preview-price`. Input shape strictly matches Slice 12 DTO.
- `createOrder(input)` → `POST /orders`. Input strictly matches Slice 13 DTO.

### Hooks
- `usePreviewPrice()` mutation.
- `useCreateOrder()` mutation. On success invalidate `['orders']` and `['wallet','balance']`. On error, rethrow.

### Screen layout
- Single screen with a step indicator at the top (1/4, 2/4, ...).
- Renders the active step's UI based on `wizardStore.step`.

### Step 1 — Slot selection
- Shown only when `mode === 'SLOT'`. For `mode === 'QUEUE'`, auto-skip to step 2 on mount.
- Renders `<SlotPicker shopId value={slotId} onChange={setSlot} />` from Slice 08.
- "Next" button enabled when `slotId !== null`.

### Step 2 — Files & config
- Renders `<FilePickerSection files onAdd onChange onRemove maxFiles={10} />` from Slice 11.
- "Next" button enabled when all files have `uploadStatus === 'done'`, all configs valid, and `files.length ≥ 1`.

### Step 3 — Price preview
- On entering this step, call `usePreviewPrice().mutate({ shopId, files: [...] })`.
- Show per-file subtotal + total in ৳.
- "Confirm" button calls `setStep(4)`.
- If preview fails (e.g. page range invalid), surface error and let user go back.

### Step 4 — Payment
- Show two cards: WALLET (with current balance from `useWalletBalance()`), CASH.
- "Place Order" button calls `useCreateOrder().mutate(...)`.
- On 200: `wizardStore.reset()` and `router.replace('/(customer)/orders/' + order.id)`.
- On 402: show modal "Insufficient balance. [Top up Wallet]" — link to wallet screen.
- On 409: show toast "Slot full — please pick another"; navigate user back to step 1.
- On 400 (no active slot): show toast "Print Now unavailable right now."
- On other errors: show generic error toast.

### Rules
- **All UI state in Zustand wizard store.** Never persist server data here.
- **TanStack mutations** for preview and create. Errors handled per-status code.
- **Confirm-on-back:** on hardware back press during steps 2–4, show "Discard order?" confirmation.
- **i18n keys** for all text.

## 5. Edge Cases

- **User backs out and re-enters wizard with stale store:** `init()` on mount resets state.
- **User logs out mid-wizard:** root layout redirects to login; store wiped on logout.
- **Wallet balance changed during wizard:** payment step refetches balance on mount.
- **Active slot expires between step 1 and step 4:** server returns 400 on submit → "No active slot" toast.
- **Preview fails on step 3:** stay on step 3 with error; user can fix on step 2.
- **All files removed after preview:** invalidate preview; force re-preview before submit.
- **`Cancel` action:** clears store and `router.back()`.

## 6. Test Cases

### Store
1. `init('shopX', 'QUEUE')` sets shopId, mode, step=1, files=[], etc.
2. `addFile` / `removeFile` mutate `files` array.
3. `reset()` returns store to defaults.

### Service
4. `previewPrice` calls `/orders/preview-price` with correct body shape (no `totalPrice`).
5. `createOrder` calls `/orders` with correct body shape.

### Hook
6. `useCreateOrder` invalidates `['orders']` and `['wallet','balance']` on success.

### Screen
7. QUEUE mode skips step 1.
8. SLOT mode lands on step 1.
9. Next button disabled until step requirements met.
10. 402 response opens "top up" prompt.

## 7. Definition of Done

- [ ] Zustand wizard store implemented per contract
- [ ] `previewPrice` and `createOrder` services
- [ ] Hooks invalidate correct queries on success
- [ ] 4-step UI flows correctly; QUEUE skips step 1
- [ ] All 4 error states (402, 409, 400 no slot, generic) handled gracefully
- [ ] On success: navigate to `/(customer)/orders/{id}` and reset store
- [ ] No `totalPrice` sent in body
- [ ] Tests pass
- [ ] Branch `ihm/feat/order-creation-wizard-mobile`; PR title `[Slice 14]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice + every blocker slice's §Implementation Rules
   - [`AGENTS.md`](../../AGENTS.md) §Zustand vs TanStack Query
2. **Build the Zustand store first** with full tests.
3. **Implement service methods.**
4. **Implement hooks.**
5. **Build the wizard screen** step by step; mock data first to verify layout.
6. **Wire real data and mutations.**
7. **Manual smoke** on iOS + Android: place a queue order with wallet payment, observe end-to-end flow, verify navigation.

### Gotchas

- Use `router.replace` (not `push`) on success so back button doesn't return to wizard.
- The wizard files array shares structure with the API DTO but adds `localId`, `uploadStatus`, `uploadError`. Map carefully before sending.
- Always call `wizardStore.reset()` after navigation to clear state.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §`POST /orders`, §`POST /orders/preview-price`
- [`AGENTS.md`](../../AGENTS.md) §Zustand, §typed navigation
- [`CONTEXT.md`](../../CONTEXT.md) §"Optimistic status lock", §"Active shop required"
