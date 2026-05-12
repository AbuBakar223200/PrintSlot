# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Essential Reading

Before touching any file, read these in order:

1. **`CONTEXT.md`** — domain language, golden rules, feature ownership table, all business rules. This is the law.
2. **`docs/04-data-model.md`** — every entity, relation, constraint, pricing formula, ETA algorithm.
3. **`docs/05-api-contract.md`** — every endpoint, request/response shape, WebSocket events, error codes.
4. **`docs/06-definition-of-done.md`** — 20 criteria every feature must satisfy before it is done.

---

## Commands

### Root (runs all workspaces via Turborepo)
```bash
npm run dev        # Start API + mobile in watch mode (parallel)
npm run build      # Build all packages in dependency order
npm run test       # Run all tests (shared → api → mobile)
npm run lint       # Lint all workspaces
```

### API only (`apps/api`)
```bash
cd apps/api
npm run dev              # NestJS watch mode
npm run build            # tsc build → dist/
npm run test             # Jest unit tests
npm run test:e2e         # Jest e2e (apps/api/test/)
npm run test -- --testPathPattern=orders   # Single module tests
npm run test -- --testNamePattern="should create order"  # Single test

npx prisma migrate dev --name <migration-name>  # New migration
npx prisma migrate deploy                        # Apply migrations (CI/Render)
npx prisma generate                              # Regenerate client after schema change
npx prisma studio                                # DB browser (localhost:5555)
npx prisma db seed                               # Seed Platform Admin account
```

### Mobile only (`apps/mobile`)
```bash
cd apps/mobile
npx expo start          # Start Expo dev server
npx expo start --ios    # iOS simulator
npx expo start --android # Android emulator
npm run test            # Jest tests
npm run test -- --testPathPattern=Button   # Single component test
npx expo build          # EAS build (requires eas-cli)
```

### Shared package (`packages/shared`)
```bash
cd packages/shared
npm run dev    # tsc --watch
npm run build  # tsc compile
npm run test   # Jest
```

---

## Monorepo Architecture

```
PrintSlot/
├── apps/
│   ├── api/          NestJS REST + WebSocket server
│   └── mobile/       React Native (Expo Router) app
├── packages/
│   └── shared/       @printslot/shared — types + constants only
├── turbo.json        Build graph: shared → api + mobile
└── package.json      Workspace root
```

**Build order enforced by Turborepo:** `packages/shared` builds first. Both `apps/api` and `apps/mobile` depend on it. Never import between `apps/` — only through `packages/shared`.

---

## API Architecture (`apps/api`)

### Request lifecycle
```
HTTP Request
  → JwtAuthGuard        (validates Supabase JWT via supabase-jwt.strategy.ts)
  → RolesGuard          (checks @Roles() decorator against User.role from DB)
  → ZodValidationPipe   (validates DTO shape, returns 400 on failure)
  → Controller          (routes to service)
  → Service             (business logic, calls PrismaService)
  → ResponseInterceptor (wraps result in { data, message, statusCode })
  ← HTTP Response

Errors → HttpExceptionFilter → { data: null, message, statusCode }
```

### Module structure
```
src/
├── common/
│   ├── decorators/    @CurrentUser(), @Roles()
│   ├── filters/       HttpExceptionFilter
│   ├── guards/        RolesGuard
│   ├── interceptors/  ResponseInterceptor
│   └── pipes/         ZodValidationPipe
├── config/            supabase.config.ts, cloudinary.config.ts, database.config.ts
├── modules/           One folder per feature (auth/orders/shops/wallet/upload/notifications/staff/users/slots/admin)
├── prisma/            PrismaService (singleton, injected everywhere)
└── types/             express.d.ts (extends Request with user)
```

### Every NestJS module follows this pattern
```
modules/<feature>/
├── __tests__/
│   ├── <feature>.controller.spec.ts
│   └── <feature>.service.spec.ts
├── dto/
│   └── <action>-<resource>.dto.ts   (Zod schema + inferred type)
├── <feature>.controller.ts
├── <feature>.module.ts
├── <feature>.service.ts
└── <feature>.gateway.ts             (only for orders — socket.io)
```

### Writing a DTO
DTOs use Zod for validation (not class-validator). The `ZodValidationPipe` is global.
```typescript
// dto/create-order.dto.ts
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  shopId: z.string().uuid(),
  // ...
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
```

### Accessing current user in a controller
```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: User) { ... }
```

### PrismaService usage
```typescript
// Always injected — never instantiated directly
constructor(private readonly prisma: PrismaService) {}

// Atomic wallet debit pattern (see docs/04-data-model.md)
await this.prisma.$transaction(async (tx) => {
  const balance = await tx.walletTransaction.aggregate({ ... });
  if (balance < amount) throw new HttpException('Insufficient balance', 402);
  await tx.walletTransaction.create({ ... });
});
```

---

## Mobile Architecture (`apps/mobile`)

### Expo Router layout
```
app/
├── _layout.tsx          Root layout — auth state listener, Zustand hydration
├── (auth)/              Login, register screens (no auth required)
├── (customer)/          Customer screens — tabs: home, orders, wallet, notifications
├── (staff)/             Staff screens — job list, job detail
└── (admin)/             Admin screens — shops, staff management
```

Root `_layout.tsx` reads `role` from auth store and redirects to the correct route group. Role-based access is enforced at navigation level, not just API level.

### Data fetching pattern
```typescript
// hooks/useOrders.ts — TanStack Query hook
export const useOrders = () =>
  useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });

export const useCreateOrder = () =>
  useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
```

**Rule:** Never do `useOrderStore.setState({ orders: data })`. TanStack Query IS the cache.

### Zustand stores (UI state only)
```typescript
// stores/useOrderWizardStore.ts — print config wizard state before submission
// stores/useAuthStore.ts       — session, user, role
// stores/useSettingsStore.ts   — language preference, connectivity status
```

### Feature folder structure (mobile)
```
src/features/<feature>/
├── __tests__/
├── components/    Feature-specific components (not shared)
├── hooks/         useXxx.ts (TanStack Query wrappers)
├── screens/       Screen components (imported by app/ routes)
├── store/         useXxxStore.ts (Zustand, UI state only)
└── api/           API call functions (fetch wrappers)
```

### Navigation
```typescript
import { router } from 'expo-router';
router.push('/(customer)/orders/new');   // ✅
router.replace('/(auth)/login');          // ✅
useNavigation();                          // ❌ never
```

### WebSocket (real-time order tracking)
```typescript
// Mobile connects to socket.io namespace /orders on order detail screen mount
// Joins room: socket.emit('order:join', { orderId })
// Listens: socket.on('order:status_changed', handler)
// TanStack Query polls GET /orders/:id every 30s as fallback
```

---

## Shared Package (`packages/shared`)

The contract between API and mobile. **Only types and constants.** No logic.

```
src/
├── types/
│   ├── order.types.ts
│   ├── user.types.ts
│   ├── shop.types.ts
│   ├── wallet.types.ts
│   └── notification.types.ts
├── constants/
│   ├── orderStatus.ts    OrderStatus enum
│   ├── roles.ts          Role enum
│   └── printConfig.ts    ColorMode, PaperSize, Orientation enums
└── index.ts              Re-exports everything
```

Import in both apps as: `import { OrderStatus, Role } from '@printslot/shared'`

API maps Prisma model → shared type before returning from service. Mobile never sees Prisma types.

---

## Environment Variables

Required in `apps/api/.env`:
```
DATABASE_URL=             # Supabase PostgreSQL connection string
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=     # Admin SDK — seed script + push notification dispatch
JWT_SECRET=               # Supabase JWT secret (for NestJS validation)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAIL=              # Seeded Platform Admin email
ADMIN_PASSWORD=           # Seeded Platform Admin password
```

Required in `apps/mobile/.env` (Expo format, prefix `EXPO_PUBLIC_`):
```
EXPO_PUBLIC_API_URL=      # NestJS API base URL
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Critical Patterns Not Obvious From Code

### Price is always server-calculated
`OrdersService.calculatePrice()` computes `subtotalPrice` per `OrderFile` and `totalPrice` on `Order`. Client never sends these fields. `POST /orders` and `POST /orders/preview-price` both use the same pricing fn.

### Queue mode requires an active slot
`pickupMode: QUEUE` does NOT create a free-floating queue. It auto-assigns to the currently active `ShopSlot` (the slot whose BST time window contains `now`). If no active slot exists, "Print Now" is unavailable — `GET /shops/:id/slots/active` returns `null`.

### orderNumber vs id
`Order.id` (UUID) used in all API routes. `Order.orderNumber` (`PS-XXXXX`) shown to humans on receipts and at counter. Never expose UUID to end users for pickup reference.

### Wallet balance is never stored
Balance = `SUM(WalletTransaction.amount WHERE type=CREDIT) - SUM(...WHERE type=DEBIT)` per user. No `balance` column. Debit always inside `prisma.$transaction` that re-checks balance sum before inserting.

### Cloudinary folders
- Upload: `POST /upload` → stores in `printslot/pending/` (24h TTL)
- Order created: API moves file to `printslot/orders/{orderId}/`
- Abandoned uploads auto-expire in Cloudinary — no cleanup code needed

### Push notifications fan-out
`NotificationsService.send(userId, ...)` queries all `UserDevice` rows for that user and sends to each token. On `DeviceNotRegistered` error from Expo → delete that `UserDevice` row silently.

### Staff demotion
`DELETE /shops/:id/staff/:userId` sets `user.role = CUSTOMER`, `user.shopId = null`. Role reverts completely — user becomes a regular customer again.

### Optimistic lock on order status
`PATCH /orders/:id/status` requires `{ status, expectedCurrentStatus }`. Server updates only if current DB status matches. Returns 409 if mismatch (two staff tapped simultaneously).

---

## Prisma Schema Notes

Schema lives at `apps/api/prisma/schema.prisma`. It must exactly match `docs/04-data-model.md`.

Key non-obvious schema decisions:
- `Order.slotId` is **NOT NULL** — all orders (queue and slot) have a slot
- `WalletTransaction.amount` is always positive — `type` (CREDIT/DEBIT) determines direction
- `SlotTemplate.deletedAt` — soft delete only, never hard-delete
- `UserDevice` table — not `User.expoPushToken` — for multi-device push
- `AppConfig` table — key-value store for `LOW_BALANCE_THRESHOLD` (default 50) and `SLOT_DURATION_MINS` (default 30)
- `Order.orderNumber` — generated via Postgres sequence `order_number_seq`, format `PS-00001`
- `Order.colorPages` + `Order.bwPages` — pre-computed sums for ETA algorithm (see `docs/04-data-model.md` Queue ETA Algorithm section)

After any schema change: `npx prisma generate` then restart API.
