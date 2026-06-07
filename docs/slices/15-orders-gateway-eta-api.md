# Slice 15 — API: OrdersGateway + ETA Algorithm + Queue Position

> **Type:** API
> **Priority:** P0
> **Blocked by:** [Slice 13](./13-order-creation-api.md)
> **Branch:** `ihm/feat/orders-gateway-eta-api`
> **Labels:** `ready-for-agent`, `api`, `p0`

---

## 1. Context

`apps/api/src/modules/orders/orders.gateway.ts` is an empty stub. The gateway powers real-time order tracking via socket.io. It is called by `OrdersService.advanceStatus()` ([Slice 19](./19-order-status-advance-api.md)) and `cancelOrder()` ([Slice 17](./17-order-retrieval-cancel-api.md)) to push live updates to customer clients.

The ETA algorithm and queue position computation live in `OrdersService` (so they can be reused by `GET /orders/:id` from Slice 17). The gateway is the transport.

## 2. Goal

A working `OrdersGateway` on socket.io namespace `/orders` with the 4 events spec'd in `CONTEXT.md`, JWT-authenticated handshake, room-per-order, and `OrdersService` ETA/queue-position helpers ready for downstream slices to call.

## 3. Files to Create / Modify

### Modify (stub)
- `apps/api/src/modules/orders/orders.gateway.ts`
- `apps/api/src/modules/orders/orders.service.ts` — add `computeQueuePosition(order)` + `computeETA(order)`
- `apps/api/src/modules/orders/orders.module.ts` — register `OrdersGateway` as provider

### Create
- `apps/api/src/modules/orders/__tests__/orders.gateway.spec.ts`
- `apps/api/src/modules/orders/__tests__/orders-eta.spec.ts` — pure function ETA tests

### Read first
- [`CONTEXT.md`](../../CONTEXT.md) §"WebSocket Events", §"ETA Algorithm"
- [`docs/04-data-model.md`](../04-data-model.md) §"Queue ETA Algorithm"
- [`docs/05-api-contract.md`](../05-api-contract.md) §WebSocket Events
- [`apps/api/src/modules/auth/strategies/supabase-jwt.strategy.ts`](../../apps/api/src/modules/auth/strategies/supabase-jwt.strategy.ts) — JWT validation pattern

## 4. Implementation Rules

### Gateway

```ts
@WebSocketGateway({ namespace: '/orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  handleConnection(client: Socket) { /* validate JWT from client.handshake.auth.token */ }
  handleDisconnect(client: Socket) { /* cleanup if needed */ }

  @SubscribeMessage('order:join')   handleJoin(client, payload: { orderId: string });
  @SubscribeMessage('order:leave')  handleLeave(client, payload: { orderId: string });

  emitStatusChanged(orderId, status, updatedAt): void;     // called by service
  emitQueueUpdated(orderId, position, etaMins): void;      // called by service
}
```

### Events

| Direction | Event | Payload | Trigger |
|---|---|---|---|
| C → S | `order:join` | `{ orderId }` | Client mounts order detail |
| C → S | `order:leave` | `{ orderId }` | Client unmounts order detail |
| S → C | `order:status_changed` | `{ orderId, status, updatedAt }` | After status advance/cancel |
| S → C | `order:queue_updated` | `{ orderId, position, etaMins }` | After any status change that shifts queue |

### Auth on handshake
- Read `client.handshake.auth.token` (supplied by mobile in `socket.io-client` config).
- Validate against Supabase JWT (reuse strategy logic or call a helper).
- Attach `client.data.userId`.
- Disconnect on invalid token.

### Join authorization
- On `order:join`: verify the order belongs to `userId` (customer) or `order.shopId === user.shopId` (staff). If not, disconnect or emit error.

### ETA algorithm (in OrdersService)

```
computeETA(targetOrder, shop):
  lastDone = await prisma.order.findMany(
    where: { shopId: shop.id, status: 'READY' (or COLLECTED) },
    orderBy: { readyAt: 'desc' },
    take: 20
  )

  if (lastDone.length >= 10):
    sum colorMins = sum( (readyAt - processingStartedAt) / 60000 * (colorPages / (colorPages + bwPages)) ) per order with colorPages>0
    sum bwMins    = same for bw
    avgColorRate = sum colorMins / total colorPages across those orders
    avgBwRate    = sum bwMins / total bwPages across those orders
  else:
    fallback = shop.defaultProcessingMins / 10  // mins per page
    avgColorRate = avgBwRate = fallback

  ordersAhead = await prisma.order.findMany(
    where: { shopId, slot.date = target slot.date, status IN ('QUEUED', 'PROCESSING'),
             createdAt: { lt: target.createdAt } }
  )

  etaMins = sum( o.colorPages * avgColorRate + o.bwPages * avgBwRate for o in ordersAhead )
          + target.colorPages * avgColorRate + target.bwPages * avgBwRate

  return Math.ceil(etaMins)
```

### Queue position
```
computeQueuePosition(target):
  count = await prisma.order.count(
    where: { shopId, slot.date = target slot.date, status IN ('QUEUED', 'PROCESSING'),
             createdAt: { lt: target.createdAt } }
  )
  return count + 1
```

### Rules
- **JWT validation on handshake** — disconnect immediately on invalid.
- **Join authorisation** — customer can only join their own order rooms; staff/owner can join orders for their shop.
- **Server broadcasts to room** `order:${orderId}` — clients join/leave that specific room.
- **Cleanup** on disconnect: socket.io auto-removes from rooms.
- **Gateway methods** `emitStatusChanged` and `emitQueueUpdated` are public on the service instance and called by `OrdersService` after status changes.

## 5. Edge Cases

- **Token missing or invalid:** disconnect socket with error event.
- **Client joins a room for an order they don't own:** emit `error` event, do not add to room.
- **Concurrent join from multiple devices:** each socket joins independently; emit to all.
- **Server restarts:** all sockets disconnect; clients reconnect and re-emit `order:join`.
- **`processingStartedAt` is null in a historical order** (shouldn't happen, but data integrity) → skip that order from rate computation.
- **`(colorPages + bwPages) === 0` for any order** → skip.
- **`ordersAhead.length === 0` and own order's pages = 0** → ETA = 0.
- **Shop has zero completed orders** → use fallback.

## 6. Test Cases

### ETA (pure-function with mocked DB)
1. With ≥10 completed orders: ETA uses calculated rate.
2. With <10 completed: fallback `defaultProcessingMins / 10` per page.
3. With zero ordersAhead: ETA = own pages × rate.
4. Order with `colorPages = 0, bwPages = 10`: only bwRate contributes.

### Queue position
5. Order created at T0 with 3 earlier QUEUED orders: position = 4.

### Gateway
6. Connection with invalid JWT: disconnected.
7. Join own order: socket added to room.
8. Join other's order: not added.
9. `emitStatusChanged` broadcasts to correct room only.

## 7. Definition of Done

- [ ] Gateway authenticates JWT on handshake
- [ ] All 4 events implemented
- [ ] `emitStatusChanged` and `emitQueueUpdated` public and tested
- [ ] ETA algorithm matches spec, handles fallback
- [ ] Queue position correct
- [ ] Customer can only join own order rooms
- [ ] Staff/owner can join shop's order rooms
- [ ] Tests pass
- [ ] Branch `ihm/feat/orders-gateway-eta-api`; PR title `[Slice 15]`
- [ ] All applicable [DoD](../06-definition-of-done.md) criteria met

## 8. Agent Instructions

1. **Read first:**
   - This slice
   - [`CONTEXT.md`](../../CONTEXT.md) §WebSocket Events, §ETA Algorithm
   - [`docs/04-data-model.md`](../04-data-model.md) §"Queue ETA Algorithm"
   - [`apps/api/src/modules/auth/strategies/supabase-jwt.strategy.ts`](../../apps/api/src/modules/auth/strategies/supabase-jwt.strategy.ts)
2. **Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`** if not present.
3. **Write ETA pure function first** — extracted helper, easy to test.
4. **Implement gateway** — handshake auth, join/leave, emit methods.
5. **Inject `OrdersGateway` into `OrdersService`** so the create flow can pre-load it (downstream slices use it).
6. **Test** gateway with a small socket.io-client harness in the spec.

### Gotchas

- Avoid emitting from inside DB transactions — only after commit.
- `client.join('order:' + orderId)` adds to room; `socket.to(room).emit(...)` broadcasts.
- `client.handshake.auth.token` is set by mobile via `io(url, { auth: { token } })`.
- Mocking socket.io in tests: use `@nestjs/testing` plus a fake `Server` object that captures emit calls.

## 9. References

- [`CONTEXT.md`](../../CONTEXT.md) §"WebSocket Events (namespace `/orders`)"
- [`docs/04-data-model.md`](../04-data-model.md) §"Queue ETA Algorithm"
- [`docs/05-api-contract.md`](../05-api-contract.md) §WebSocket Events
- [NestJS WebSockets docs](https://docs.nestjs.com/websockets/gateways)
