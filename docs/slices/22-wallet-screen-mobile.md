# Slice 22 — Mobile: Wallet Screen

> **Type:** Mobile
> **Priority:** P0
> **Blocked by:** [Slice 21](./21-wallet-service-api.md)
> **Branch:** `ihm/feat/wallet-screen-mobile`
> **Labels:** `ready-for-agent`, `mobile`, `p0`

---

## 1. Context

Customers view their Wallet balance and transaction history here. The screen is one of the customer tabs ([Slice 32](./32-customer-home-tabs-mobile.md)).

`apps/mobile/app/(customer)/wallet.tsx` exists as a stub. Feature directories `apps/mobile/src/features/wallet/` have empty stubs.

## 2. Goal

Polished Wallet screen with balance hero, paginated transaction list, pull-to-refresh, low-balance warning banner, and clean visual hierarchy.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/mobile/src/features/wallet/services/walletService.ts` — `getBalance`, `getTransactions`
- `apps/mobile/src/features/wallet/hooks/useWallet.ts` — `useWalletBalance`, `useWalletTransactions`
- `apps/mobile/app/(customer)/wallet.tsx`

### Create
- `apps/mobile/src/features/wallet/components/TransactionRow.tsx`
- `apps/mobile/src/features/wallet/__tests__/useWallet.test.ts`

### Read first
- [Slice 21](./21-wallet-service-api.md) §Endpoints

## 4. Implementation Rules

### Service
- `getBalance(): Promise<{ balance: number }>` — `GET /wallet`.
- `getTransactions(page = 1, limit = 20): Promise<Paginated<WalletTransaction>>` — `GET /wallet/transactions`.

### Hooks
- `useWalletBalance()` — `useQuery({ queryKey: ['wallet', 'balance'], queryFn: getBalance, staleTime: 30_000 })`.
- `useWalletTransactions(page)` — `useQuery({ queryKey: ['wallet', 'transactions', page], queryFn: () => getTransactions(page) })`.

### Screen layout
- **Balance hero card:**
  - Large `৳{balance.toFixed(2)}` text.
  - Subtle "Wallet balance" label.
  - Background: glass card with gradient accent.
- **Low-balance banner:** shown when `balance < 50`. Yellow/amber tint. "Balance is low — top up soon." (No top-up button for customer in v1.)
- **Transactions section:**
  - Heading "Transactions".
  - FlashList of `TransactionRow`.
  - Empty state: "No transactions yet."

### TransactionRow
- Left: icon per type — CREDIT = ↑ (green), DEBIT = ↓ (red).
- Middle: reason label, timestamp.
- Right: amount with sign and color: `+৳50.00` (green) or `−৳25.00` (red).

### Reason display labels
- `TOPUP_ADMIN` → "Top-up by Admin"
- `TOPUP_GATEWAY` → "Gateway Top-up"
- `ORDER_PAYMENT` → "Order Payment"
- `ORDER_REFUND` → "Order Refund"

### Rules
- **Pull-to-refresh** invalidates both queries.
- **No top-up flow on customer-facing wallet screen in v1** — top-up is admin-only.
- **Wallet balance invalidated by order placement and cancellation** — handled in [Slice 14](./14-order-creation-wizard-mobile.md) and [Slice 18](./18-order-history-cancel-mobile.md).
- **Hoist `Intl.NumberFormat`** for BDT format.
- **i18n keys** for labels.

## 5. Edge Cases

- **Balance is 0:** show ৳0.00 (not "Empty").
- **Balance is negative:** impossible per debit guard; defensive UI still shows the value.
- **No transactions:** empty state.
- **Long transaction history:** FlashList handles thousands of rows efficiently.
- **Pull-to-refresh while loading:** debounced by TanStack Query.
- **Offline:** stale data shown.

## 6. Test Cases

### Hooks
1. `useWalletBalance` calls `GET /wallet`.
2. `useWalletTransactions(2)` calls `GET /wallet/transactions?page=2`.

### TransactionRow
3. Renders CREDIT amount in green with + prefix.
4. Renders DEBIT amount in red with − prefix.
5. Renders reason label from constant map.

### Screen
6. Balance hero shows formatted ৳ value.
7. Low-balance banner shown when balance < 50.
8. Empty state when no transactions.

## 7. Definition of Done

- [ ] `walletService` methods implemented
- [ ] `useWalletBalance` and `useWalletTransactions` hooks
- [ ] TransactionRow with correct icons + colors
- [ ] Wallet screen with hero + list
- [ ] Pull-to-refresh works
- [ ] Low-balance banner appears at < 50
- [ ] FlashList used
- [ ] Tests pass
- [ ] Branch `ihm/feat/wallet-screen-mobile`; PR title `[Slice 22]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [Slice 21](./21-wallet-service-api.md) §Endpoints
2. **Implement service + hooks.**
3. **Build TransactionRow** as a focused component.
4. **Build screen** with balance hero + FlashList.
5. **Manual smoke** after placing an order: confirm DEBIT row appears.

### Gotchas

- Currency: always `৳` not `$` or `₹`.
- Use `toFixed(2)` for display; don't trust JS number formatting for decimals.
- Empty state must not flash during initial load — gate on `isLoading`.

## 9. References

- [`docs/05-api-contract.md`](../05-api-contract.md) §Wallet
- [`AGENTS.md`](../../AGENTS.md) §FlashList, §Intl objects hoisted
