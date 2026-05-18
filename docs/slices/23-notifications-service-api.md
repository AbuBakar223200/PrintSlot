# Slice 23 — API: NotificationsService (12 Events + Expo Push Fan-out + Endpoints)

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 02](./02-users-module-api.md)
> **Branch:** `ihm/feat/notifications-service-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`NotificationsService` is the platform's communication backbone. Every business event that needs the user's attention flows through it. It must always create a `Notification` DB row (regardless of push outcome) and fan push to all `UserDevice` rows. Stale tokens are auto-cleaned.

`apps/api/src/modules/notifications/notifications.service.ts` is an empty stub. `notifications.controller.ts` does not exist yet.

## 2. Goal

`NotificationsService` exposes 12 typed event-helper methods (e.g. `notifyOrderPlaced`), each guaranteed to create the DB row and attempt push fan-out. Plus three endpoints for the in-app list. The service is injectable into every other module that fires events.

## 3. Files to Create / Modify

### Modify (stub)
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/modules/notifications/notifications.module.ts` — export `NotificationsService`

### Create
- `apps/api/src/modules/notifications/notifications.controller.ts`
- `apps/api/src/modules/notifications/dto/list-notifications.dto.ts` — query DTO for pagination
- `apps/api/src/modules/notifications/__tests__/notifications.service.spec.ts` (extend existing)
- `apps/api/src/modules/notifications/__tests__/notifications.controller.spec.ts`

### Modify package.json
- Add `expo-server-sdk` if missing

### Read first
- [`CONTEXT.md`](../../CONTEXT.md) §"Notification Events", §"Push notifications fan-out"
- [`docs/04-data-model.md`](../04-data-model.md) §Notification, §UserDevice

## 4. Implementation Rules

### Core `send` method

```ts
async send(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId?: string;
}): Promise<Notification> {
  // 1. ALWAYS create DB row first
  const notification = await this.prisma.notification.create({ data: opts });

  // 2. Fetch devices
  const devices = await this.prisma.userDevice.findMany({ where: { userId: opts.userId } });
  if (devices.length === 0) return notification;

  // 3. Build Expo messages
  const messages = devices.map(d => ({
    to: d.token,
    title: opts.title,
    body: opts.body,
    data: { orderId: opts.orderId, type: opts.type },
  }));

  // 4. Send via Expo SDK
  try {
    const tickets = await this.expo.sendPushNotificationsAsync(messages);

    // 5. Check tickets for DeviceNotRegistered
    for (let i = 0; i < tickets.length; i++) {
      const t = tickets[i];
      if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') {
        await this.prisma.userDevice.delete({ where: { id: devices[i].id } });
      }
    }
  } catch (err) {
    // Push failure is non-fatal — DB row already saved
    this.logger.warn('Push dispatch failed', err);
  }

  return notification;
}
```

### 12 event helpers (each calls `send` with correct args)

| Method | Notification type | Recipient | Title (English) | Body |
|---|---|---|---|---|
| `notifyOrderPlaced(order, customer)` | ORDER_PLACED | customer | "Order placed" | "Your order {orderNumber} has been placed." |
| `notifyOrderAccepted(order, customer)` | ORDER_ACCEPTED | customer | "Order in progress" | "Your order {orderNumber} is now being processed." |
| `notifyOrderReady(order, customer)` | ORDER_READY | customer | "Order ready" | "Your order {orderNumber} is ready for pickup." |
| `notifyOrderCancelled(order, customer, staffAndOwner[])` | ORDER_CANCELLED | customer + each staff/owner | "Order cancelled" | "Order {orderNumber} has been cancelled." |
| `notifyNewOrder(order, staffAndOwner[])` | NEW_ORDER | each staff/owner | "New order" | "New order {orderNumber} from {customerName}." |
| `notifyWalletTopup(userId, amount)` | WALLET_TOPUP | recipient | "Wallet topped up" | "৳{amount} added to your Wallet." |
| `notifyWalletDeducted(userId, amount, orderId)` | WALLET_DEDUCTED | user | "Payment processed" | "৳{amount} deducted for order {orderNumber}." |
| `notifyShopApproved(shop, ownerId)` | SHOP_APPROVED | owner | "Shop approved" | "Your shop {name} is now active." |
| `notifyShopRejected(shop, ownerId, reason)` | SHOP_REJECTED | owner | "Shop rejected" | "Your shop application was rejected: {reason}." |
| `notifyShopSuspended(shop, ownerId)` | SHOP_SUSPENDED | owner | "Shop suspended" | "Your shop has been suspended." |
| `notifyStaffAssigned(userId, shopName)` | STAFF_ASSIGNED | promoted user | "Welcome to {shopName}" | "You have been added as staff at {shopName}." |
| `notifyLowBalance(userId, balance)` | LOW_BALANCE | user | "Low Wallet balance" | "Your Wallet balance is ৳{balance}. Please top up." |

> i18n: titles/bodies above are English. Bengali equivalents come in [Slice 33](./33-i18n-en-bn-mobile.md). For v1, send English text; mobile renders incoming notifications as-is. Future: pass `language` and render server-side from a key map. **For v1, hardcode English text.**

### Endpoints

| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/notifications?page&limit&unreadOnly` | Authenticated | Paginated list for current user. |
| PATCH | `/notifications/:id/read` | Authenticated | Mark one as read. 403 if not own. |
| PATCH | `/notifications/read-all` | Authenticated | Mark all of current user's notifications as read. |

## 5. Edge Cases

- **User has no devices:** DB row created, no push attempted, no error.
- **All push fail:** DB rows exist; users see in-app list.
- **DeviceNotRegistered ticket:** auto-delete that UserDevice row.
- **Push dispatch throws:** caught, logged, never bubbles up.
- **Notification for nonexistent user:** Prisma FK error — caller's bug. Let it throw 500 with clear log.
- **Concurrent NEW_ORDER to multiple staff:** fan out one DB row + push per recipient. Use `Promise.all`.
- **Mark-read for another user's notification:** 403.
- **Pagination with no notifications:** `data: []`.

## 6. Test Cases

### Service (mocked Expo)
1. `send` creates DB row even when no devices exist.
2. `send` with 3 devices sends 3 Expo messages.
3. `DeviceNotRegistered` ticket deletes the corresponding UserDevice row.
4. Expo throws → DB row still saved.
5. All 12 helpers produce correct `NotificationType` value in DB.

### Controller
6. GET /notifications scoped to current user only.
7. PATCH /:id/read for another user's row → 403.
8. PATCH /read-all marks all current user's notifications as read.

## 7. Definition of Done

- [ ] `send` method correctly creates DB row + fan-out
- [ ] DeviceNotRegistered auto-deletes UserDevice
- [ ] All 12 helpers implemented and tested
- [ ] Three endpoints wired with correct guards
- [ ] `expo-server-sdk` installed and singleton client created
- [ ] `NotificationsService` exported from module
- [ ] Tests pass
- [ ] Branch `ihm/feat/notifications-service-api`; PR title `[Slice 23]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §Notification Events, §Push fan-out
   - [`docs/04-data-model.md`](../04-data-model.md) §Notification
2. **Install `expo-server-sdk`** and create an `Expo` client singleton in the service (or via a provider).
3. **Write the spec first.**
4. **Implement `send`** with the careful ticket inspection.
5. **Implement 12 helpers** as thin wrappers calling `send` with the right title/body.
6. **Wire controller** with pagination + role guards.
7. **Run tests.**

### Gotchas

- Expo SDK requires batching: `chunkPushNotifications()` for >100 messages. For v1 (per-user fan-out is small), can skip chunking.
- `sendPushNotificationsAsync` returns tickets immediately; receipts are deferred — for v1, we trust tickets and clean stale on `DeviceNotRegistered` only.
- Notification.body has a Prisma `String` column — pre-format the string with substituted values.
- Catch all errors inside `send` — never let push failure bubble to callers.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §"Notification Events", §"Push notifications fan-out"
- [`docs/04-data-model.md`](../04-data-model.md) §Notification, §UserDevice
- [Expo server SDK docs](https://github.com/expo/expo-server-sdk-node)
