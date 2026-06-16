# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Git Workflow

```
main          ← production-stable, never commit directly
development   ← integration branch, all feature PRs merge here
ihm/<type>/<desc>  ← feature branches, always cut from development
```

**Rules:**
- Always `git checkout -b ihm/<type>/<desc> origin/development`
- PRs target `development`, not `main`
- Never branch from `main` for dev work
- `main` only receives merges from `development` at release time

---

## Branch Naming

Every branch **must** follow this format:

```
ihm/<type>/<kebab-case-description>
```

**Allowed types:**

| Type | When to use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `hotfix` | Urgent production fix |
| `refactor` | Code restructure with no behavior change |
| `chore` | Tooling, deps, config, CI — no production code change |
| `docs` | Documentation only |
| `test` | Adding or fixing tests only |

**Rules:**

- Description is 2–5 words, kebab-case, present tense, no articles
- Maximum 60 characters total
- Never use `dev/`, `patch`, `update`, `temp`, `wip`, or any other generic name

**Good examples:**
```
ihm/feat/orders-slot-booking
ihm/fix/auth-jwt-token-refresh
ihm/chore/upgrade-prisma-v6
ihm/refactor/wallet-balance-calculation
ihm/docs/api-response-shape
ihm/test/order-status-transitions
ihm/hotfix/double-charge-on-retry
```

**Bad examples — never create these:**
```
dev/something
feat/orders-slot-booking       ← missing ihm/ prefix
ihm/feature/something          ← wrong type name
ihm/feat/fix                   ← too vague
```

---

## Essential Reading

Before touching any file, read these in order:

1. **`CONTEXT.md`** — domain language, golden rules, feature ownership table, all business rules. This is the law.
2. **`docs/04-data-model.md`** — every entity, relation, constraint, pricing formula, ETA algorithm.
3. **`docs/05-api-contract.md`** — every endpoint, request/response shape, WebSocket events, error codes.
4. **`docs/06-definition-of-done.md`** — 21 criteria every feature must satisfy before it is done.
5. **`docs/08-implementation-slices.md`** — slice-to-issue status. Closed slices must not be reimplemented.
6. **docs/09-ui-ux-design-spec.md** — the locked UI/UX design system (tokens, theming, typography, iconography, component primitives) and the detailed per-screen spec for every mobile screen. Read before implementing any mobile UI slice.

---

## Strict Reuse Rule

Before adding any new function, component, hook, service, DTO, type, utility, or test helper, search the repository for an existing equivalent. Reuse, extend, or move existing code instead of duplicating it. If duplication is unavoidable, document the reason in the PR/commit notes.

---

## Slice Completion Checklist

Every slice and every GitHub issue **must** go through this checklist before it is considered done. Do not skip any step even if the code was already merged.

1. **All acceptance criteria met** — re-read the GitHub issue body and confirm every bullet is addressed.
2. **Tests pass** — unit tests (service + controller) and, where applicable, e2e tests all green.
3. **`docs/08-implementation-slices.md` updated** — add the slice row (or update its `Status` to `Closed`) and record the GitHub issue number and close date. Use `YYYY-MM-DD` format for dates.
4. **GitHub issue closed** — close the issue via `gh issue close <number> --comment "Implemented in PR #<pr>"`. Never leave a merged slice's issue open.
5. **API contract doc checked** — if the slice added or changed any endpoint, verify `docs/05-api-contract.md` matches the implementation exactly (field names, types, HTTP verbs, response shapes). Fix any drift before closing.
6. **Shared types checked** — if the slice touched `packages/shared`, confirm `packages/shared/src/index.ts` re-exports everything the API and mobile need.

**These steps are not optional.** A slice whose GitHub issue is still open or whose entry is missing from `docs/08-implementation-slices.md` is not done, regardless of whether the code merged.

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

## React Native Rules (`apps/mobile`)

> Full rules with code examples live in `AGENTS.md`. This is the quick-reference summary.

### CRITICAL — Never break these

| Rule | Requirement |
|---|---|
| **No falsy &&** | `{count && <X />}` crashes if `count=0`. Use `{count > 0 ? <X /> : null}` or `{!!count && <X />}` |
| **Strings in Text** | Every string literal must be inside `<Text>` — never a direct child of `<View>` |
| **Virtualize all lists** | Use `FlashList` for every scrollable list — never `ScrollView` + `.map()` |
| **No scroll state** | Never `useState` for scroll position — use Reanimated `useSharedValue` + `useAnimatedScrollHandler` |
| **Native deps in app** | All packages with native code must be in `apps/mobile/package.json` for autolinking |

### HIGH — Default to these

| Rule | Requirement |
|---|---|
| **Images** | Always `expo-image` — never RN `Image`. Cloudinary list thumbnails: append `?w=120&h=120&c=fill&q=auto` |
| **Animations** | Animate `transform` + `opacity` only — never `width`, `height`, `margin`, `padding` |
| **Pressable** | Use `Pressable` — never `TouchableOpacity` or `TouchableHighlight` |
| **Modals** | Native `<Modal presentationStyle="formSheet">` — never JS bottom sheet libraries |
| **Menus** | Use `zeego` — never custom absolute-positioned JS menus |
| **Stable list refs** | Never `.map()` data inline before passing to `FlashList` — keep inner object references stable |
| **Light list items** | No queries or context inside list items — fetch at parent, pass primitives as props |
| **Zustand in lists** | Use Zustand selectors inside list items instead of `useContext` |

### MEDIUM — Follow consistently

| Rule | Requirement |
|---|---|
| **Derive don't store** | Compute values from state instead of storing derived state in `useState` |
| **State = ground truth** | Store `pressed` (0/1), not `scale` (0.95). Derive visuals via `interpolate` |
| **useDerivedValue** | Derive Reanimated values declaratively — use `useAnimatedReaction` for side effects only |
| **Safe areas** | Use `contentInsetAdjustmentBehavior="automatic"` on root ScrollView — not `SafeAreaView` wrapper |
| **contentInset** | Dynamic bottom spacing via `contentInset={{ bottom: x }}` — not `paddingBottom` |
| **Styling** | Use `gap` between siblings (not `margin`). `borderCurve: 'continuous'` with all rounded corners. CSS `boxShadow` string over legacy shadow props |
| **Dispatch updater** | Use `setState(prev => ...)` when next state depends on current value |
| **Compound components** | `Button` + `ButtonText` + `ButtonIcon` pattern — not polymorphic string children |
| **Single dep versions** | Pin exact versions across all packages — no `^` or `~` in RN deps |

### LOW — Apply when relevant

| Rule | Requirement |
|---|---|
| **Fonts** | Use `expo-font` config plugin (embed at build) — not `useFonts` async loading |
| **Intl objects** | Hoist `Intl.NumberFormat` / `Intl.DateTimeFormat` to module scope — never create inside render |
| **Design system imports** | Import `View`, `Text`, `Button` from `@/components/` — not directly from `react-native` |
| **GestureDetector** | For animated press states (scale/opacity), use `Gesture.Tap()` — not Pressable's `onPressIn/Out` |

### PrintSlot-specific mobile rules

- **TanStack Query is the server cache** — never `useXxxStore.setState({ data: serverData })`. Invalidate queries on mutation success.
- **Zustand is UI state only** — wizard steps, auth session, connectivity. Not server data.
- **Navigation** — always `router.push/replace` from `expo-router`. Never `useNavigation()`.
- **Role guards** — enforce in route group `_layout.tsx` files, never inside screen components.
- **Order display** — show `order.orderNumber` (`PS-XXXXX`) to users; use `order.id` (UUID) in API calls and routes.
- **Real-time** — WebSocket `order:status_changed` is primary; `refetchInterval: 30_000` in TanStack Query is fallback. Never `setInterval` in `useEffect`.
- **Optimistic status lock** — always include `expectedCurrentStatus` on `PATCH /orders/:id/status`. Handle 409 by refetching and letting user retry.

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
