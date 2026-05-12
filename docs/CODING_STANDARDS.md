# Coding Standards
## PrintSlot — Full Stack (NestJS + React Native)

> These standards are written for both human developers and AI agents. Every rule exists to prevent a known class of bug, drift, or inconsistency in this specific codebase. Rules without a stated reason are cargo cult — every rule here has one.

---

## 1. General Principles

- **Prefer simple code over clever code.** If you need to explain what a line does, rewrite it.
- **Keep modules small and focused.** One module = one domain. One function = one responsibility.
- **Avoid hidden side effects.** A function that takes inputs and returns output is trustworthy. A function that also fires a push notification, mutates a global, or writes to the DB without that being obvious from its name is a trap.
- **Use explicit names.** `orderId` not `id`. `shopColorRate` not `rate`. Ambiguity causes bugs at 2am.
- **Do not introduce new dependencies without approval.** Every new package is a maintenance liability and a potential security surface. Prefer the standard library or existing packages already in the monorepo.
- **Do not modify unrelated files.** A PR for order cancellation should not touch the wallet module unless there is a documented reason. Unrelated changes hide intent and make rollback harder.
- **Keep public interfaces stable.** If you change a function signature or API response shape, you must update every caller in the same PR. Partial migrations cause runtime errors in production.
- **Use the domain language exactly.** Terms defined in `CONTEXT.md` (`Order`, `OrderFile`, `PrintConfig`, `Slot`, `Queue`, `Wallet`, `WalletTransaction`, `ShopSlot`, `SlotTemplate`, `QueuePosition`, `ETA`, `UserDevice`, `OrderNumber`, `AppConfig`) must be used verbatim in code — variable names, function names, comments, error messages. Never substitute synonyms (`job`, `booking`, `attachment`, `device`, `token`, `balance column`).

---

## 2. TypeScript Standards

### Strictness
- `strict: true` is set in every `tsconfig.json`. Never weaken it.
- Never use `any` unless you are wrapping a third-party library with genuinely unknown types, and you must add a comment explaining why.
- Never use `as unknown as T` to cast through `unknown` — this is `any` in disguise. Fix the type instead.
- `!` non-null assertion is only permitted when you have a preceding guard that makes the null case impossible. Add a comment.

### Types in Shared Package Only
- All entity types (`User`, `Order`, `Shop`, `WalletTransaction`, etc.) live in `packages/shared/src/types/`.
- All enums (`OrderStatus`, `Role`, `ColorMode`, `PaperSize`, `Orientation`, `PaymentMethod`, `PickupMode`) live in `packages/shared/src/constants/`.
- Both `apps/api` and `apps/mobile` import exclusively from `@printslot/shared`.
- **Never duplicate a type.** If you find yourself writing `type Order = { ... }` in `apps/mobile/`, stop and import from `@printslot/shared` instead.
- API services map Prisma models → shared types before returning. Mobile never sees a Prisma type.

### Naming Conventions
| Thing | Convention | Example |
|---|---|---|
| Source files | `camelCase.ts` | `orderStatus.ts` |
| React components | `PascalCase.tsx` | `OrderCard.tsx` |
| Test files | `fileName.spec.ts` or `fileName.test.ts` | `orders.service.spec.ts` |
| Zustand stores | `useXxxStore.ts` | `useOrderWizardStore.ts` |
| TanStack hooks | `useXxx.ts` | `useOrders.ts` |
| NestJS DTOs | `action-resource.dto.ts` | `create-order.dto.ts` |
| i18n keys | `feature.component.label` | `orders.card.status` |
| NestJS modules | `<feature>.module.ts` | `orders.module.ts` |
| NestJS services | `<feature>.service.ts` | `orders.service.ts` |
| NestJS controllers | `<feature>.controller.ts` | `orders.controller.ts` |
| NestJS gateways | `<feature>.gateway.ts` | `orders.gateway.ts` |

### Business Logic Location
- Business logic lives in NestJS **services**, never in controllers or DTOs.
- Mobile **components and screens** contain no business logic — they render data from hooks.
- Mobile **hooks** (`useXxx.ts`) contain no business logic — they are thin wrappers around `useQuery` / `useMutation`.
- Price calculation is server-side only, in `OrdersService.calculatePrice()`. No client-side price logic, ever.

---

## 3. NestJS / API Standards

### Module Structure
Every feature module must follow this exact layout:

```
src/modules/<feature>/
├── __tests__/
│   ├── <feature>.controller.spec.ts
│   └── <feature>.service.spec.ts
├── dto/
│   └── <action>-<resource>.dto.ts
├── <feature>.controller.ts
├── <feature>.module.ts
└── <feature>.service.ts
```

Do not create files outside this structure. Do not add a `utils.ts` or `helpers.ts` unless it is tested in isolation and named for its domain (e.g. `pageRange.utils.ts`).

### DTO Pattern (Zod — never class-validator)
Every DTO is a Zod schema plus its inferred type. Nothing else.

```typescript
// dto/create-order.dto.ts
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  shopId:        z.string().uuid(),
  pickupMode:    z.enum(['QUEUE', 'SLOT']),
  slotId:        z.string().uuid().optional(),
  paymentMethod: z.enum(['WALLET', 'CASH']),
  files:         z.array(OrderFileInputSchema).min(1).max(10),
});

export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
```

- Never accept `totalPrice`, `subtotalPrice`, or `resolvedPages` in any DTO body. These are server-computed.
- Never accept `role` on user update endpoints — role changes are privileged operations with their own endpoints.

### Controller Pattern

```typescript
@Post()
@UseGuards(JwtAuthGuard)
@Roles(Role.CUSTOMER)
async create(
  @CurrentUser() user: User,
  @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto,
): Promise<Order> {
  return this.ordersService.create(user, dto);
}
```

- Controllers route and delegate only. No business logic in controllers.
- Every protected route has `@UseGuards(JwtAuthGuard)` and `@Roles(...)`.
- Always use `@CurrentUser()` to access the authenticated user — never `@Req() req` directly.
- Return the service result directly — `ResponseInterceptor` wraps it automatically.

### Service Pattern

```typescript
@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User, dto: CreateOrderDto): Promise<Order> {
    // 1. Validate business rules (shop active, slot available, etc.)
    // 2. Execute atomic DB operations
    // 3. Fire notifications (non-blocking — do not await if not critical)
    // 4. Return mapped shared type (not Prisma model)
  }
}
```

- Never instantiate `PrismaClient` directly — always inject `PrismaService`.
- Map Prisma models to shared types before returning. Never return raw Prisma objects from a service method that is called by a controller.
- Use `prisma.$transaction` for all operations that must be atomic (wallet debit, slot booking).

### Atomic Transaction Pattern
Use this pattern for any multi-step DB operation that must not partially succeed:

```typescript
await this.prisma.$transaction(async (tx) => {
  // Re-check preconditions using tx (not this.prisma) inside the transaction
  const balance = await tx.walletTransaction.aggregate({ ... });
  if (balance._sum.amount < requiredAmount) {
    throw new HttpException('Insufficient balance', HttpStatus.PAYMENT_REQUIRED);
  }
  await tx.walletTransaction.create({ ... });
});
```

Never use `this.prisma` inside a `$transaction` callback — always use the `tx` parameter. `this.prisma` calls outside the transaction will not be rolled back on failure.

### Error Handling
- Throw `HttpException` (or its subclasses) from services. `HttpExceptionFilter` catches and formats them.
- Never throw plain `Error` objects from services — they become 500 responses with no message.
- Never return error objects as successful responses (e.g. `return { error: '...' }`).
- Use status codes precisely:
  - `400` — validation failure or violated business rule (cancel too late, wrong status transition)
  - `402` — insufficient wallet balance (only this)
  - `403` — role or ownership violation
  - `404` — resource not found
  - `409` — optimistic lock mismatch, duplicate, or slot full
  - `413` — file too large (Multer, automatic)
  - `415` — unsupported MIME type

### Response Shape
Never manually wrap responses. `ResponseInterceptor` handles:
```json
{ "data": <your return value>, "message": "ok", "statusCode": 200 }
```
Returning an already-wrapped object double-wraps it. Return the domain object directly.

---

## 4. Prisma Standards

### Boundary Rule
`@prisma/client` is imported **only** inside `apps/api/src/`. Running `grep -r "@prisma/client" apps/mobile` must always return zero results.

### Migration Protocol
1. Edit `docs/04-data-model.md` first (source of truth).
2. Update `prisma/schema.prisma` to match.
3. Run `npx prisma migrate dev --name <descriptive-name>`.
4. Run `npx prisma generate`.
5. Never edit or delete a committed migration file — this corrupts the checksum history.
6. `schema.prisma` and `docs/04-data-model.md` must always be in sync. A PR that changes one without the other will be rejected.

### Query Safety
- Always use `select` or `include` explicitly — never return entire models with unknown field counts from services.
- For pagination, always include `skip` and `take`. Never query an unbounded list from production data.
- `findFirst` and `findUnique` can return `null`. Always handle the null case — throw `NotFoundException` if the record must exist.

---

## 5. React Native Standards

### Critical — These cause crashes or silent data corruption

| Rule | Wrong | Right |
|---|---|---|
| No falsy `&&` rendering | `{count && <X />}` (crashes if count=0) | `{count > 0 ? <X /> : null}` |
| Strings inside Text | `<View>{"hello"}</View>` | `<View><Text>hello</Text></View>` |
| Virtualize all lists | `<ScrollView>{items.map(...)}</ScrollView>` | `<FlashList data={items} renderItem={...} />` |
| No scroll position in state | `const [scrollY, setScrollY] = useState(0)` | `const scrollY = useSharedValue(0)` |
| Native deps in app package | dep in `packages/shared/package.json` | dep in `apps/mobile/package.json` |

### Component Imports — Design System First
Never import `View`, `Text`, `Pressable`, `Image` directly from `react-native` in feature code. Import from the design system:

```typescript
// Wrong
import { View, Text } from 'react-native';

// Right
import { View, Text } from '@/components/ui';
```

Exception: `apps/mobile/src/components/ui/` itself, which is the design system and wraps RN primitives.

### UI Primitives
- **Images**: Always `expo-image`. Never RN `Image`. Append `?w=120&h=120&c=fill&q=auto` for list thumbnails.
- **Pressable**: Always `Pressable`. Never `TouchableOpacity` or `TouchableHighlight`.
- **Modals**: Native `<Modal presentationStyle="formSheet">`. Never JS bottom-sheet libraries.
- **Menus**: `zeego`. Never custom absolute-positioned JS menus.
- **Animated press** (scale/opacity feedback): `Gesture.Tap()` inside `GestureDetector`. Not `onPressIn/Out`.

### Animations
- Only animate `transform` and `opacity`. Never animate `width`, `height`, `margin`, or `padding` — they trigger layout passes.
- Store press state as `pressed: 0 | 1` in `useSharedValue`. Derive `scale` via `interpolate`. Do not store `scale` directly.
- Use `useDerivedValue` for declarative derived animated values. Use `useAnimatedReaction` for side effects only.

### Compound Component Pattern
```typescript
// Wrong — polymorphic string children
<Button icon="print" variant="primary">Print Now</Button>

// Right — compound components
<Button>
  <ButtonIcon name="print" />
  <ButtonText>Print Now</ButtonText>
</Button>
```

### Styling
- Use `gap` between siblings — not `marginBottom` or `marginTop` on children.
- Use `borderCurve: 'continuous'` with all rounded corners.
- Use CSS `boxShadow` string property — not legacy `shadowColor`/`shadowOffset`/`shadowRadius`/`elevation`.
- All `Intl.NumberFormat` and `Intl.DateTimeFormat` objects hoisted to module scope — never created inside a render function.

### Safe Area and Scroll
- `contentInsetAdjustmentBehavior="automatic"` on root `ScrollView` or `FlashList`. Not `SafeAreaView` wrapper.
- Dynamic bottom spacing via `contentInset={{ bottom: x }}`. Not `paddingBottom` on the list.

### Fonts
- Use `expo-font` config plugin (fonts embedded at build time). Never `useFonts()` hook (causes FOUT on first render).

---

## 6. State Management Standards

### Hard Separation: TanStack Query vs Zustand

| State Type | Tool | Rule |
|---|---|---|
| Server / remote data | TanStack Query | Fetched, cached, invalidated automatically |
| UI state (wizard steps, offline flag, auth session) | Zustand | Local only — never server data |

**Never** do this:
```typescript
// Wrong — storing server data in Zustand
const data = await ordersApi.list();
useOrderStore.setState({ orders: data });
```

**Always** do this:
```typescript
// Right — TanStack Query owns server data
export const useOrders = () =>
  useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
```

### TanStack Query Conventions

```typescript
// Query hook
export const useOrders = () =>
  useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
  });

// Mutation hook — always invalidate on success
export const useCreateOrder = () =>
  useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
```

- Query keys are arrays. First element is the domain noun. Add identifiers for item-level queries: `['order', orderId]`, `['shop-orders', shopId]`.
- Every mutation must call `queryClient.invalidateQueries` for the affected query keys in `onSuccess`.
- Use `refetchInterval: 30_000` on order detail queries as WebSocket polling fallback. Never `setInterval` in `useEffect`.

### Zustand Conventions
- Zustand stores are in `src/features/<feature>/store/use<Feature>Store.ts` or `src/stores/use<Name>Store.ts` for globals.
- Stores hold: auth session, order wizard state (before submission), language preference, connectivity status.
- Use `setState(prev => ...)` when next state depends on current value — never `setState({ ...store, field: value })` inline.

---

## 7. Navigation Standards

```typescript
// Right — always expo-router
import { router } from 'expo-router';
router.push('/(customer)/orders/new');
router.replace('/(auth)/login');

// Wrong — never useNavigation
import { useNavigation } from '@react-navigation/native';
```

- Role guards live in `_layout.tsx` files for route groups. Never inside screen components.
- Never hardcode role checks inside screen bodies — the layout-level guard handles access.

---

## 8. WebSocket Standards

### Joining and Leaving Rooms
Always clean up. Forgetting `order:leave` leaks server-side room membership.

```typescript
useEffect(() => {
  socket.emit('order:join', { orderId });

  const handleStatusChange = ({ status, updatedAt }) => {
    queryClient.setQueryData(['order', orderId], (old) => ({
      ...old, status, updatedAt,
    }));
  };
  socket.on('order:status_changed', handleStatusChange);

  return () => {
    socket.emit('order:leave', { orderId });
    socket.off('order:status_changed', handleStatusChange);
  };
}, [orderId]);
```

- The WebSocket room is `order:{orderId}`.
- Never put WebSocket event data into Zustand manually — update TanStack Query cache directly via `queryClient.setQueryData`.
- `order:queue_updated` (position + ETA) may be stored in local component state — it is display-only and not persisted.

---

## 9. Notification Standards

Every notification event must do two things, both of which are required:

1. Create a `Notification` row in the database.
2. Attempt to send an Expo push to all `UserDevice` rows for the recipient.

Step 2 must never prevent Step 1. Push failure is non-fatal — log it, delete the `UserDevice` row on `DeviceNotRegistered`, and continue.

```typescript
async send(userId: string, payload: NotificationPayload): Promise<void> {
  // Always create the DB record first
  await this.prisma.notification.create({ data: { userId, ...payload } });

  // Then attempt push — never throws, never awaited in request path
  const devices = await this.prisma.userDevice.findMany({ where: { userId } });
  for (const device of devices) {
    try {
      await this.expo.sendPushNotificationsAsync([{
        to: device.token, ...payload,
      }]);
    } catch (err) {
      if (isDeviceNotRegisteredError(err)) {
        await this.prisma.userDevice.delete({ where: { id: device.id } });
      }
    }
  }
}
```

Never store `expoPushToken` on the `User` model. It lives on `UserDevice`. One user can have multiple devices — always fan out to all rows.

---

## 10. Pricing Standards

The pricing formula lives **only** in `OrdersService.calculatePrice()`.

```
base      = resolvedPages × copies × (colorMode=COLOR ? colorRate : bwRate)
surcharge = paperSize=A3  ? resolvedPages × copies × a3Surcharge : 0
body      = duplex        ? base × (1 − duplexDiscount) : base
subtotal  = body + surcharge
totalPrice = SUM(subtotal for each OrderFile)
```

- `totalPrice`, `subtotalPrice`, `resolvedPages` are never accepted in any API request body.
- `POST /orders/preview-price` calls the same calculation function as `POST /orders`. They must never diverge.
- `pageRange` resolution: `resolvedPages = pageRange ? parseRange(pageRange).length : detectedPages`. Server re-validates the range against `detectedPages` and returns 400 if any page number exceeds it.

---

## 11. Order Status Standards

Order status follows a strict state machine. No transitions outside these paths are permitted:

```
QUEUED     → PROCESSING → READY → COLLECTED   (queue mode)
SCHEDULED  → PROCESSING → READY → COLLECTED   (slot mode)
QUEUED     → CANCELLED   (customer only)
SCHEDULED  → CANCELLED   (customer only)
```

- `OrdersService.advanceStatus()` validates the current DB status against `expectedCurrentStatus` before writing. Returns 409 on mismatch.
- `OrdersService.cancel()` throws 400 if `status` is not `QUEUED` or `SCHEDULED`.
- Never allow skipping a step (`QUEUED → READY` is invalid).
- `processingStartedAt` is set when transitioning to `PROCESSING`. `readyAt` is set when transitioning to `READY`. `cancelledAt` set on `CANCELLED`.

---

## 12. Wallet Safety Standards

- Wallet balance is **never stored**. It is always computed as `SUM(amount WHERE type=CREDIT) − SUM(amount WHERE type=DEBIT)` per userId.
- Every debit must execute inside `prisma.$transaction` that aggregates the current balance, checks sufficiency, and inserts the debit row atomically. If balance < required amount at transaction time, throw `HttpException('Insufficient balance', 402)`.
- `WalletTransaction.amount` is always a positive number. The `type` field (CREDIT / DEBIT) determines direction. Never store negative amounts.
- Top-up limits: min 10 BDT, max 10,000 BDT per transaction. Enforced in `WalletService` for both admin credit and gateway.
- `LOW_BALANCE` notification fires after every debit where the new balance is below `AppConfig.LOW_BALANCE_THRESHOLD`. This fires repeatedly — not just on the first crossing.

---

## 13. Slot Booking Safety Standards

- `ShopSlot.currentCount` is incremented and decremented only inside `prisma.$transaction`.
- Before incrementing: check `currentCount < maxOrders`. If full at transaction time, return 409.
- On order cancellation with `pickupMode=SLOT`: decrement `currentCount`. It cannot go below 0.
- `maxOrders` may be set below the current `currentCount` by the Shop Owner. This is valid — the slot immediately closes to new bookings. Existing orders are not affected.
- QUEUE orders must have an active ShopSlot (open, non-full, BST time window contains `now`). If none exists, return 400. The client must have checked `GET /shops/:id/slots/active` beforehand.
- All Orders (both QUEUE and SLOT mode) must have a non-null `slotId`. There is no free-floating queue outside a slot.

---

## 14. File Upload Standards

- File upload goes through `POST /upload` on the NestJS API. Mobile never uploads directly to Cloudinary.
- Multer hard limit: 20 MB. Exceeding returns 413 automatically.
- MIME type validated server-side by inspecting the actual MIME type — never trust the file extension.
- Accepted MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`.
- For PDF files: server runs `pdf-parse` to detect page count. Returns `detectedPages: number`.
- For all other types: server returns `detectedPages: null`. Mobile shows a manual page count input.
- Files are stored in `printslot/pending/` with a 24-hour Cloudinary TTL. On Order creation, the API moves the file to `printslot/orders/{orderId}/`. Abandoned uploads expire automatically — no cleanup code is needed.
- An Order requires 1–10 files. Fewer than 1 or more than 10 returns 400.

---

## 15. Internationalisation Standards

- **No hardcoded strings in `.tsx` files.** Every user-visible string must use an i18n translation key.
- Key format: `feature.component.label` — e.g. `orders.card.status`, `wallet.balance.header`.
- Two languages supported: English (`en`) and Bengali (`bn`). Both translation files must be updated in the same PR.
- Default language is English. Language preference stored on `User.language` and synced to `useSettingsStore`.
- Never use the i18n key string as fallback text visible to users (e.g. displaying `"orders.card.status"` raw). Configure `i18next` to fall back to the English value, not the key.
- CI must fail if any key present in `en.json` is missing from `bn.json`.

---

## 16. Architecture Boundary Standards

### Cross-feature imports are forbidden
```
src/features/orders/ — may NOT import from src/features/wallet/
src/features/wallet/ — may NOT import from src/features/orders/
```

Shared UI: import from `src/components/shared/` or `src/components/ui/`.
Shared types/constants: import from `@printslot/shared`.

### Mobile `@prisma/client` is forbidden
```
grep -r "@prisma/client" apps/mobile  →  must return zero results
```

### API price fields are forbidden in client bodies
Any endpoint body DTO that includes `totalPrice`, `subtotalPrice`, or `resolvedPages` as accepted input is wrong. These fields must be absent from Zod schemas on create/update DTOs.

---

## 17. Testing Standards

### Write tests first (TDD)
Every new service method or controller action must have a corresponding failing test before implementation begins. The test file must exist and have a failing run in the PR. This is not optional.

### Test external behaviour, not internals
A good test:
```typescript
// Tests what the service returns
expect(await ordersService.calculatePrice(shopRates, files)).toEqual(expectedTotal);
```

A bad test:
```typescript
// Tests implementation detail — breaks on refactor
expect(prisma.walletTransaction.aggregate).toHaveBeenCalledTimes(1);
```

### Specific rules
- Every feature must include tests. A PR without tests for new behaviour will be rejected.
- Test user-visible behaviour: what is returned, what is created in the DB, what error code is thrown.
- Add a regression test for every bug fix. The test must fail before the fix and pass after.
- Do not skip failing tests (`it.skip`, `xit`, `xtest`). Fix them or delete the feature.
- Do not weaken a test to make it pass (e.g. loosening `toEqual` to `toBeDefined`). Fix the implementation.
- E2E tests must use a real test database. No Prisma mocks in E2E — mock/prod divergence has caused production failures.
- Unit tests mock `PrismaService` at the constructor level, not individual Prisma methods.

### Test file location
```
src/modules/orders/__tests__/orders.service.spec.ts    ✅ correct
src/modules/orders/orders.service.test.ts              ✅ acceptable
src/orders.service.spec.ts                             ❌ wrong location
```

---

## 18. Git Standards

### Branch naming — `ihm/<type>/<description>`
All branches must follow this exact format:

```
ihm/<type>/<kebab-case-description>
```

| Type | When |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `hotfix` | Urgent production fix |
| `refactor` | Restructure, no behaviour change |
| `chore` | Tooling, deps, config, CI |
| `docs` | Documentation only |
| `test` | Tests only |

Rules:
- Description: 2–5 words, kebab-case, no articles, present tense.
- Maximum 60 characters total.
- **Never** use `dev/`, bare `feat/` (missing `ihm/`), `patch`, `update`, `temp`, `wip`, `fix-stuff`.
- If a branch already exists without the `ihm/` prefix, create a new branch with the correct name, push there, and open the PR from the correct branch.

Good:
```
ihm/feat/order-cancellation-flow
ihm/fix/wallet-debit-race-condition
ihm/chore/upgrade-prisma-v6
```

Bad:
```
dev/orders                      ← missing ihm/ prefix, wrong type
feat/orders                     ← missing ihm/ prefix
ihm/feature/something           ← "feature" is not a valid type
```

### Commit messages
Format: `<type>(<scope>): <what changed and why>`

```
feat(orders): add ETA recalculation on status advance

ETA was stale after a queue order moved to PROCESSING.
Now fires order:queue_updated to all remaining queued orders.

fix(wallet): prevent double debit on concurrent order creation

Two simultaneous requests for the same user could both pass
the balance check before either debit landed. Wrapped in
prisma.$transaction with re-check before insert.
```

- Subject line: imperative mood, ≤ 72 characters.
- Body: explain **why**, not just what. Reference the bug or rule being enforced.
- One logical change per commit. Do not bundle unrelated fixes.

### PR rules
- PR title matches the branch description in plain English.
- PR description references the relevant section of `docs/PRD.md` or `docs/02-feature-registry.md`.
- Every PR must have passing tests before review.
- Do not merge a PR that has `skip` on any test that was passing before the PR opened.

---

## 19. Security Standards

- Never log JWT tokens, passwords, or Cloudinary credentials — not even in debug logs.
- Never accept or forward user-supplied file paths to the filesystem.
- Never trust client-supplied prices, page counts, or role claims. Always recompute or read from DB.
- `SUPABASE_SERVICE_KEY` is used only in the seed script and push notification dispatch. Never expose it to mobile or log it.
- Environment variables are never committed to the repository. `.env` is in `.gitignore`. Use `.env.example` with placeholder values.
- MIME type validation uses the actual MIME bytes — not the file extension — to prevent renamed executables.

---

## 20. Performance Standards

- Never query an unbounded result set. Every list query uses `skip`/`take` (pagination) or a strict `where` clause that limits scope (e.g. `shopId = X AND date = today`).
- ETA computation (`OrdersService.getQueueEta()`) queries the last 20 completed orders only. Never `findMany` with no limit on the orders table.
- Analytics queries (`GET /shops/:id/analytics`) are scoped to a single date. Never aggregate the full orders table without a date filter.
- Balance aggregation (`WalletService.getBalance()`) is scoped to a single `userId`. Never aggregate all wallet transactions.
- Do not `await` non-critical operations (push notification dispatch) inside the HTTP request path if they are not needed by the response. Fire and handle errors asynchronously.
- FlashList `keyExtractor` must return a stable, unique string (UUID). Never use array index as key.
- List item component refs must be stable — never pass inline object/array literals or inline `.map()` results as `data` to `FlashList`. Memoize or derive outside the render function.
