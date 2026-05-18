# Slice 21 — API: WalletService (Balance, Debit, Credit, Top-up)

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 01](./01-prisma-migration-seed.md), [Slice 23](./23-notifications-service-api.md)
> **Branch:** `ihm/feat/wallet-service-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

Wallet balance is **never stored** — it is the SUM of CREDIT amounts minus DEBIT amounts. `WalletService` is consumed by `OrdersService.createOrder` for atomic debit (Slice 13) and `OrdersService.cancelOrder` for refund credit (Slice 17). Top-up is admin-controlled in v1 (no payment gateway).

`apps/api/src/modules/wallet/wallet.service.ts` and `wallet.controller.ts` are empty stubs.

## 2. Goal

A fully working `WalletService` with `getBalance`, `debit`, `credit`, and three endpoints — `GET /wallet`, `GET /wallet/transactions`, `POST /wallet/topup`. Debit and credit accept an optional `tx` arg for atomic use inside the order transaction. Fires `WALLET_DEDUCTED`, `WALLET_TOPUP`, `LOW_BALANCE` notifications.

## 3. Files to Create / Modify

### Modify (stubs)
- `apps/api/src/modules/wallet/wallet.service.ts`
- `apps/api/src/modules/wallet/wallet.controller.ts`
- `apps/api/src/modules/wallet/wallet.module.ts` — export `WalletService`; `imports: [NotificationsModule]`
- `apps/api/src/modules/wallet/dto/topup-wallet.dto.ts` — verify Zod: `{ userId, amount }` with bounds

### Create
- `apps/api/src/modules/wallet/__tests__/wallet.service.spec.ts`
- `apps/api/src/modules/wallet/__tests__/wallet.controller.spec.ts`

### Read first
- [`docs/04-data-model.md`](../04-data-model.md) §WalletTransaction
- [`CONTEXT.md`](../../CONTEXT.md) §"Wallet balance is never stored", §"Wallet debit is atomic"
- [Slice 23](./23-notifications-service-api.md) §helpers

## 4. Implementation Rules

### Public methods

```ts
class WalletService {
  async getBalance(userId: string): Promise<number>;   // SUM(CREDIT) - SUM(DEBIT)
  async getTransactions(userId, page, limit): Promise<Paginated<WalletTransaction>>;
  async debit(userId, amount, orderId, tx: PrismaTx): Promise<void>;  // throws 402 if insufficient
  async credit(userId, amount, reason: TransactionReason, orderId?, tx?: PrismaTx): Promise<void>;
  async adminTopup(actorUserId, recipientUserId, amount): Promise<WalletTransaction>;
}
```

### `getBalance(userId)`
```sql
SELECT
  COALESCE(SUM(CASE WHEN type='CREDIT' THEN amount END), 0)
- COALESCE(SUM(CASE WHEN type='DEBIT' THEN amount END), 0)
FROM "WalletTransaction"
WHERE userId = $1
```
Use Prisma `aggregate` or raw query.

### `debit(userId, amount, orderId, tx)`
- **MUST be called inside a `prisma.$transaction`.** Pass `tx` as the prisma client.
- Compute balance via `tx.walletTransaction.aggregate(...)`.
- If balance < amount → throw `HttpException('Insufficient balance', 402)`.
- Insert DEBIT row: `{ userId, type: DEBIT, amount, reason: ORDER_PAYMENT, orderId }`.
- After commit (outside the `tx`), fire `WALLET_DEDUCTED` and (if new balance < `LOW_BALANCE_THRESHOLD`) `LOW_BALANCE` notification.
- **Note:** notifications cannot fire from inside `tx`. Pattern: collect notification intents in a "post-commit" array, fire after `$transaction` resolves. Cleaner: have caller (OrdersService) own the post-commit dispatch using info returned from `debit`.

### `credit(userId, amount, reason, orderId?, tx?)`
- Insert CREDIT row with reason.
- If called outside a transaction, use plain `prisma`. If inside, use `tx`.
- For `TOPUP_ADMIN`: fire `WALLET_TOPUP` notification after commit.
- For `ORDER_REFUND`: caller (OrdersService.cancelOrder) handles its own notification.

### `adminTopup(actorUserId, recipientUserId, amount)`
- Validate `amount` ≥ 10 and ≤ 10000. Reject with 400 otherwise.
- Verify recipient exists (404 if not).
- Call `credit(recipientUserId, amount, TOPUP_ADMIN)`.
- Fire `WALLET_TOPUP` to recipient.
- Return the inserted WalletTransaction.

### Endpoints

| Method | Path | Roles | Body | Notes |
|---|---|---|---|---|
| GET | `/wallet` | CUSTOMER | — | Returns `{ balance: number }` for current user. |
| GET | `/wallet/transactions?page&limit` | CUSTOMER | — | Paginated history. |
| POST | `/wallet/topup` | SHOP_OWNER, PLATFORM_ADMIN | `{ userId, amount }` | Admin credit. |
| POST | `/wallet/topup/gateway` | CUSTOMER | — | Returns 501. P1 only. |

### Rules
- **Balance never stored.** Always aggregated.
- **Debit always inside a transaction.** Service exposes the contract; callers (OrdersService) must respect it.
- **Notifications dispatched OUTSIDE transactions.** Caller responsibility or post-commit hook.
- **Amounts in BDT** stored as `Decimal`. Convert to `number` in shared type.
- **Top-up bounds:** 10 ≤ amount ≤ 10000.

## 5. Edge Cases

- **First-ever transaction:** sum is 0. Debit 100 → 402.
- **Exact balance debit:** balance = 100, debit 100 → succeeds.
- **Concurrent debit (two parallel orders):** transaction isolation: first commits, second sees updated state and either succeeds or fails with 402.
- **Concurrent top-up + debit:** order doesn't matter; both are inserts; balance computed at read time.
- **Top-up < 10 BDT:** 400.
- **Top-up > 10000 BDT:** 400.
- **Recipient userId doesn't exist:** 404.
- **Recipient is not a CUSTOMER (e.g. is admin):** still allowed in v1 — any user can have a wallet. Spec is flexible. Keep open.
- **Decimal precision:** sum is `Decimal`; convert at the boundary.

## 6. Test Cases

### Service
1. `getBalance` with no transactions returns 0.
2. `getBalance` after CREDIT 100 → 100.
3. `getBalance` after CREDIT 100 + DEBIT 30 → 70.
4. `debit` with insufficient balance throws 402.
5. `debit` inserts a DEBIT row with correct reason.
6. `credit` with `TOPUP_ADMIN` inserts CREDIT and triggers `WALLET_TOPUP`.
7. `credit` with `ORDER_REFUND` inserts CREDIT (no auto-notification — caller's responsibility).
8. `adminTopup` < 10 → 400; > 10000 → 400; nonexistent recipient → 404.
9. `LOW_BALANCE` notification fires when post-debit balance < threshold.

### Controller
10. GET /wallet without JWT → 401.
11. POST /wallet/topup as CUSTOMER → 403.
12. POST /wallet/topup with invalid amount → 400.
13. GET /wallet/transactions paginated correctly.
14. POST /wallet/topup/gateway → 501.

## 7. Definition of Done

- [ ] All 5 service methods implemented
- [ ] Balance never stored — always aggregated
- [ ] Debit throws 402 on insufficient inside transaction
- [ ] All 4 endpoints wired with correct roles
- [ ] LOW_BALANCE fires on every qualifying debit
- [ ] WALLET_DEDUCTED, WALLET_TOPUP fire correctly
- [ ] Tests pass — all 14 cases
- [ ] Branch `ihm/feat/wallet-service-api`; PR title `[Slice 21]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`docs/04-data-model.md`](../04-data-model.md) §WalletTransaction
   - [`CONTEXT.md`](../../CONTEXT.md) §Wallet rules
   - [Slice 23](./23-notifications-service-api.md) §notify helpers
2. **Read AppConfig** for LOW_BALANCE_THRESHOLD: implement a tiny `getAppConfig(key, default)` helper either in `WalletService` or via injecting `AdminService` ([Slice 27](./27-admin-module-api.md)). For Slice 21 standalone, read directly from `prisma.appConfig.findUnique({ where: { key } })`. Default to 50 if missing.
3. **Write the service spec first.**
4. **Implement service** — keep `debit` and `credit` clean with `tx` parameter.
5. **Wire controller** with role guards.
6. **Verify aggregate query** returns correct sum types (Decimal).
7. **Run tests.**

### Gotchas

- Prisma `aggregate` returns Decimal-typed sums. Use `.toNumber()` for return values.
- The `tx` parameter is `Prisma.TransactionClient` — accept it as optional and fall back to `this.prisma` if not provided (but for `debit`, REQUIRE it).
- Notifications outside transactions: pattern is to do the DB work inside `$transaction`, then collect "intents" to fire after.
- `getAppConfig(key, default)` is a recurring pattern — extract into a small helper if convenient.

## 9. References

- [`docs/04-data-model.md`](../04-data-model.md) §WalletTransaction
- [`CONTEXT.md`](../../CONTEXT.md) §"Wallet balance is never stored", §"Wallet top-up limits", §"LOW_BALANCE trigger"
- [`docs/05-api-contract.md`](../05-api-contract.md) §Wallet
