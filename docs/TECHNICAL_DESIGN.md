# Technical Design Document
## PrintSlot — Campus Print Shop Platform

---

## 1. System Overview

PrintSlot is a monorepo containing two applications — a NestJS REST + WebSocket API and a React Native (Expo Router) mobile app — that share a common type package. The system follows a strict vertical-slice architecture: each product feature owns its own folder in both the API and the mobile app, and those slices communicate only through the shared types package (`@printslot/shared`).

### High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Mobile Client                      │
│            React Native (Expo Router)                │
│   TanStack Query (server cache)                      │
│   Zustand (UI / session state)                       │
│   socket.io-client (real-time)                       │
└───────────────────┬─────────────────────────────────┘
                    │  HTTPS REST + WebSocket (socket.io)
                    ▼
┌─────────────────────────────────────────────────────┐
│                    NestJS API                        │
│   JwtAuthGuard → RolesGuard → ZodValidationPipe     │
│   ResponseInterceptor / HttpExceptionFilter          │
│   OrdersGateway (socket.io namespace /orders)        │
│   PrismaService (singleton DB client)                │
└───────┬──────────────┬────────────────┬─────────────┘
        │              │                │
        ▼              ▼                ▼
 Supabase PG      Cloudinary        Expo Push
 (via Prisma)    (file storage)    Notifications
```

### Key Architectural Decisions
- **Single app, role-based routing** (ADR-001): One React Native binary serves all four roles. Expo Router route groups gate access at the navigation layer.
- **Role in DB, not JWT** (ADR-002): Supabase issues JWTs; NestJS validates them but reads `role` from the DB on every request so role changes take effect immediately.
- **Unified Order entity** (ADR-003): Queue and Slot orders are the same model with a `pickupMode` discriminator. No separate tables per mode.
- **Wallet as immutable ledger** (ADR-004): No stored balance column. Balance = aggregate of `WalletTransaction` rows.
- **Server-side upload only** (ADR-005): Mobile never uploads directly to Cloudinary. All files go through the NestJS API for validation.
- **socket.io + polling fallback** (ADR-006): WebSocket delivers instant status updates; TanStack Query polls every 30 s as a safety net.
- **TanStack Query for server state, Zustand for UI state** (ADR-007): Hard separation — server responses never flow into Zustand manually.
- **Prisma boundary at API** (ADR-008): `@prisma/client` is imported only in `apps/api/src/`. API services map Prisma models to shared types before returning.
- **Price server-side only** (ADR-011): `OrdersService.calculatePrice()` is the sole source of truth for pricing. No client computation accepted.

---

## 2. Tech Stack

### Frontend (Mobile)
| Concern | Tool |
|---|---|
| Framework | React Native (Expo SDK 51, managed workflow) |
| Navigation | Expo Router v3 (file-based, typed `router.push`) |
| Server cache | TanStack Query v5 |
| UI state | Zustand v4 |
| Real-time | socket.io-client |
| Images | expo-image |
| Animations | React Native Reanimated v3 |
| Gestures | React Native Gesture Handler |
| Lists | FlashList (Shopify) |
| Internationalisation | i18next + react-i18next |
| PDF export (P1) | expo-print + expo-sharing |
| Push (receiving) | expo-notifications |
| Testing | Jest + React Native Testing Library |

### Backend (API)
| Concern | Tool |
|---|---|
| Framework | NestJS v10 |
| Language | TypeScript 5 |
| DB ORM | Prisma v5 |
| Validation | Zod (via custom `ZodValidationPipe`) |
| Auth | Supabase JWT (`passport-jwt` + custom strategy) |
| Real-time | socket.io v4 (`@nestjs/websockets`) |
| File upload | Multer (NestJS built-in) |
| PDF page detection | pdf-parse |
| Push (sending) | expo-server-sdk |
| Testing | Jest + Supertest |

### Infrastructure
| Concern | Tool |
|---|---|
| Database | Supabase PostgreSQL |
| Auth service | Supabase Auth |
| File storage | Cloudinary |
| API deployment | Render Web Service |
| Mobile deployment | Expo EAS Build + EAS Submit |
| Monorepo | Turborepo + npm workspaces |
| Shared types | `packages/shared` (`@printslot/shared`) |

---

## 3. Module Boundaries

### Monorepo Layout

```
PrintSlot/
├── apps/
│   ├── api/                   NestJS REST + WebSocket server
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── src/
│   │       ├── common/        Cross-cutting infrastructure
│   │       ├── config/        External service config
│   │       ├── modules/       One folder per feature domain
│   │       ├── prisma/        PrismaService singleton
│   │       └── types/         express.d.ts (extends Request)
│   │
│   └── mobile/                React Native (Expo Router) app
│       ├── app/               File-based routes (Expo Router)
│       └── src/
│           ├── components/    Shared + UI design-system components
│           ├── features/      One folder per feature domain
│           └── stores/        Global Zustand stores
│
└── packages/
    └── shared/                @printslot/shared — types + constants only
        └── src/
            ├── types/         Shared entity types
            └── constants/     Enums (OrderStatus, Role, etc.)
```

### API Module Structure

Each feature module follows this layout:

```
src/modules/<feature>/
├── __tests__/
│   ├── <feature>.controller.spec.ts
│   └── <feature>.service.spec.ts
├── dto/
│   └── <action>-<resource>.dto.ts    Zod schema + inferred type
├── <feature>.controller.ts           Routes, guards, decorators
├── <feature>.module.ts               NestJS DI wiring
└── <feature>.service.ts              Business logic, PrismaService calls
```

Gateway (WebSocket) only in `orders` module:
```
src/modules/orders/
└── orders.gateway.ts                 socket.io namespace /orders
```

### API Module Responsibilities

| Module | Responsibility |
|---|---|
| `auth` | Register, login, JWT validation, `GET /auth/me` |
| `users` | Profile update, UserDevice upsert/delete |
| `shops` | Shop CRUD, status transitions, slot availability queries |
| `slots` | SlotTemplate CRUD (admin), ShopSlot open/close (owner) |
| `upload` | File validation, Cloudinary upload, page detection |
| `orders` | Order creation, price calculation, status advance, cancel, history, ETA, WebSocket gateway |
| `wallet` | Balance query, transaction history, debit, credit, top-up |
| `notifications` | Notification creation, push dispatch, mark-read |
| `staff` | Staff assignment, demotion |
| `admin` | Platform analytics, AppConfig CRUD |

### Common Infrastructure (`src/common/`)

```
src/common/
├── decorators/
│   ├── current-user.decorator.ts    @CurrentUser() — extracts User from request
│   └── roles.decorator.ts           @Roles(...) — metadata for RolesGuard
├── filters/
│   └── http-exception.filter.ts     Wraps all errors → { data: null, message, statusCode }
├── guards/
│   └── roles.guard.ts               Reads @Roles() metadata, checks user.role from DB
├── interceptors/
│   └── response.interceptor.ts      Wraps success results → { data, message, statusCode }
└── pipes/
    └── zod-validation.pipe.ts       Validates request body against Zod schema, 400 on failure
```

### Mobile Feature Structure

Each feature follows this layout:

```
src/features/<feature>/
├── __tests__/
├── api/
│   └── <feature>.api.ts             Typed fetch wrappers (called by TanStack hooks)
├── components/
│   └── <Feature>Card.tsx            Feature-specific display components
├── hooks/
│   └── use<Feature>.ts              TanStack Query useQuery / useMutation wrappers
├── screens/
│   └── <Feature>Screen.tsx          Screen-level components (imported by app/ routes)
└── store/
    └── use<Feature>Store.ts         Zustand — UI state only (e.g. wizard steps)
```

### Mobile Route Groups (Expo Router)

```
app/
├── _layout.tsx                      Root: auth listener, Zustand hydration, role redirect
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── register.tsx
├── (customer)/
│   ├── _layout.tsx                  Role guard: redirects non-CUSTOMER
│   ├── index.tsx                    Shop list (home tab)
│   ├── orders/
│   │   ├── index.tsx                Order history
│   │   ├── new.tsx                  Order creation wizard
│   │   └── [id].tsx                 Order detail + real-time tracking
│   ├── wallet/
│   │   └── index.tsx                Balance + transaction history
│   └── notifications/
│       └── index.tsx                Notification list
├── (staff)/
│   ├── _layout.tsx                  Role guard: redirects non-STAFF
│   └── jobs/
│       ├── index.tsx                Job dashboard
│       └── [id].tsx                 Job detail + status advance
├── (admin)/
│   ├── _layout.tsx                  Role guard: redirects non-PLATFORM_ADMIN
│   ├── shops/
│   │   ├── index.tsx                Shop approval queue
│   │   └── [id].tsx                 Shop detail + status controls
│   ├── templates/
│   │   └── index.tsx                SlotTemplate management
│   └── config/
│       └── index.tsx                AppConfig management
└── (owner)/
    ├── _layout.tsx                  Role guard: redirects non-SHOP_OWNER
    ├── shop/
    │   └── index.tsx                Shop settings + pricing
    ├── slots/
    │   └── index.tsx                ShopSlot calendar management
    ├── staff/
    │   └── index.tsx                Staff roster management
    └── analytics/
        └── index.tsx                Daily analytics dashboard
```

### Shared Package

```
packages/shared/src/
├── types/
│   ├── user.types.ts                User, UserDevice
│   ├── shop.types.ts                Shop, ShopSlot, SlotTemplate
│   ├── order.types.ts               Order, OrderFile, PrintConfig
│   ├── wallet.types.ts              WalletTransaction
│   └── notification.types.ts        Notification
└── constants/
    ├── orderStatus.ts               OrderStatus enum
    ├── roles.ts                     Role enum
    └── printConfig.ts               ColorMode, PaperSize, Orientation enums
```

---

## 4. Data Model

### Schema: `User`
```
id            UUID       PK (Supabase Auth UID)
email         String     UNIQUE NOT NULL
name          String     NOT NULL
phone         String?
role          Role       CUSTOMER | STAFF | SHOP_OWNER | PLATFORM_ADMIN
shopId        UUID?      FK → Shop (set for STAFF and SHOP_OWNER)
language      Language   EN | BN  default EN
createdAt     DateTime   default now()
updatedAt     DateTime   auto
```

### Schema: `UserDevice`
```
id            UUID       PK
userId        UUID       FK → User  NOT NULL
token         String     NOT NULL  (Expo push token)
deviceId      String     NOT NULL  (Expo stable device ID)
updatedAt     DateTime   auto
UNIQUE        (userId, deviceId)
```
Upsert on app launch. Delete row on `DeviceNotRegistered` from Expo.

### Schema: `Shop`
```
id                    UUID       PK
name                  String     NOT NULL
address               String     NOT NULL
phone                 String?
status                ShopStatus PENDING | ACTIVE | REJECTED | SUSPENDED  default PENDING
rejectionReason       String?    set on REJECTED/SUSPENDED; cleared on resubmit
ownerId               UUID       FK → User  UNIQUE
colorRate             Decimal    NOT NULL  (BDT per page)
bwRate                Decimal    NOT NULL
a3Surcharge           Decimal    NOT NULL  (added per A3 page)
duplexDiscount        Decimal    NOT NULL  (multiplier, e.g. 0.8 = 20% off)
defaultProcessingMins Int        NOT NULL  default 15  (ETA fallback)
createdAt             DateTime   default now()
updatedAt             DateTime   auto
```
Status transitions: `PENDING→ACTIVE`, `PENDING→REJECTED`, `ACTIVE→SUSPENDED`, `SUSPENDED→ACTIVE` (admin only), `REJECTED→PENDING` (resubmit). SUSPENDED cannot resubmit.

### Schema: `SlotTemplate`
```
id            UUID       PK
startTime     String     NOT NULL  format "HH:MM"
endTime       String     NOT NULL  format "HH:MM"
deletedAt     DateTime?  soft delete — never hard-deleted
createdAt     DateTime   default now()
```
Duration comes from `AppConfig.SLOT_DURATION_MINS`. `GET /slots/templates` filters `deletedAt: null`.

### Schema: `ShopSlot`
```
id            UUID       PK
shopId        UUID       FK → Shop  NOT NULL
templateId    UUID       FK → SlotTemplate  NOT NULL
date          Date       NOT NULL
isOpen        Boolean    default false
maxOrders     Int        NOT NULL  min 1
currentCount  Int        default 0
UNIQUE        (shopId, templateId, date)
```
`currentCount` incremented/decremented atomically via `prisma.$transaction`.

### Schema: `Order`
```
id                   UUID         PK  (used in all API routes)
orderNumber          String       UNIQUE NOT NULL  "PS-00001"
customerId           UUID         FK → User  NOT NULL
shopId               UUID         FK → Shop  NOT NULL
pickupMode           PickupMode   QUEUE | SLOT
slotId               UUID         FK → ShopSlot  NOT NULL
status               OrderStatus  QUEUED | SCHEDULED | PROCESSING | READY | COLLECTED | CANCELLED
paymentMethod        PaymentMethod WALLET | CASH
totalPages           Int          NOT NULL
colorPages           Int          NOT NULL
bwPages              Int          NOT NULL
totalPrice           Decimal      NOT NULL  server-calculated
processingStartedAt  DateTime?    set on → PROCESSING
readyAt              DateTime?    set on → READY
cancelledAt          DateTime?
createdAt            DateTime     default now()
updatedAt            DateTime     auto
```
Status transitions:
```
QUEUED     → PROCESSING → READY → COLLECTED
SCHEDULED  → PROCESSING → READY → COLLECTED
QUEUED     → CANCELLED   (customer only, before PROCESSING)
SCHEDULED  → CANCELLED   (customer only, before PROCESSING)
```

### Schema: `OrderFile`
```
id             UUID       PK
orderId        UUID       FK → Order  NOT NULL
fileUrl        String     NOT NULL  (Cloudinary URL)
fileName       String     NOT NULL
mimeType       String     NOT NULL
fileSize       Int        NOT NULL  (bytes)
detectedPages  Int        NOT NULL
colorMode      ColorMode  COLOR | BW
paperSize      PaperSize  A4 | A3 | LETTER
orientation    Orientation PORTRAIT | LANDSCAPE
copies         Int        NOT NULL  min 1
duplex         Boolean    default false
pageRange      String?    null = all pages; format "1-5" or "1,3,5"
resolvedPages  Int        NOT NULL  server-computed
subtotalPrice  Decimal    NOT NULL  server-computed
uploadedAt     DateTime   default now()
```
Pricing formula:
```
base      = resolvedPages × copies × (colorMode=COLOR ? colorRate : bwRate)
surcharge = paperSize=A3  ? resolvedPages × copies × a3Surcharge : 0
body      = duplex        ? base × (1 − duplexDiscount) : base
subtotal  = body + surcharge
```

### Schema: `WalletTransaction`
```
id         UUID            PK
userId     UUID            FK → User  NOT NULL
type       TransactionType CREDIT | DEBIT
amount     Decimal         NOT NULL  always positive
reason     TransactionReason TOPUP_ADMIN | TOPUP_GATEWAY | ORDER_PAYMENT | ORDER_REFUND
orderId    UUID?           FK → Order
createdAt  DateTime        default now()
```
Balance = `SUM(amount WHERE type=CREDIT) − SUM(amount WHERE type=DEBIT)` per userId. Debit always inside `prisma.$transaction` with balance re-check.

### Schema: `Notification`
```
id         UUID             PK
userId     UUID             FK → User  NOT NULL
title      String           NOT NULL
body       String           NOT NULL
type       NotificationType ORDER_PLACED | ORDER_ACCEPTED | ORDER_READY | ORDER_CANCELLED
                            | NEW_ORDER | WALLET_TOPUP | WALLET_DEDUCTED | SHOP_APPROVED
                            | SHOP_REJECTED | SHOP_SUSPENDED | STAFF_ASSIGNED | LOW_BALANCE
read       Boolean          default false
orderId    UUID?            FK → Order
createdAt  DateTime         default now()
```

### Schema: `AppConfig`
```
key        String   PK
value      String   NOT NULL
updatedAt  DateTime auto
```
Known keys: `LOW_BALANCE_THRESHOLD` (default `"50"`), `SLOT_DURATION_MINS` (default `"30"`).

### Entity Relationship Summary
```
User ──< Order                (customerId)
User ──< WalletTransaction    (userId)
User ──< Notification         (userId)
User ──< UserDevice           (userId)
User >── Shop                 (ownerId  1:1 UNIQUE)
User >── Shop                 (shopId   staff membership  N:1)

Shop ──< Order                (shopId)
Shop ──< ShopSlot             (shopId)
Shop ──< User                 (staff, via shopId on User)

SlotTemplate ──< ShopSlot     (templateId)
ShopSlot ──< Order            (slotId  NOT NULL on all orders)

Order ──< OrderFile           (orderId)
Order ──< WalletTransaction   (orderId  nullable)
Order ──< Notification        (orderId  nullable)
```

---

## 5. API Design

### Conventions
- Base URL: `https://<render-host>/api`
- Auth header: `Authorization: Bearer <supabase-jwt>`
- All responses: `{ data: T, message: string, statusCode: number }` (via `ResponseInterceptor`)
- All errors: `{ data: null, message: string, statusCode: number }` (via `HttpExceptionFilter`)
- Validation: `ZodValidationPipe` on all DTOs — invalid input → 400 with field-level messages

### Auth

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/auth/register` | No | Public | `{ email, password, name, phone?, role: CUSTOMER\|SHOP_OWNER }` | `{ user: User, accessToken: string }` |
| POST | `/auth/login` | No | Public | `{ email, password }` | `{ user: User, accessToken: string }` |
| GET | `/auth/me` | Yes | Any | — | `User` |

### Users

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| PATCH | `/users/me` | Yes | Any | `{ name?, phone?, language?: EN\|BN }` | `User` |
| PATCH | `/users/me/device` | Yes | Any | `{ deviceId, expoPushToken }` | `UserDevice` |
| DELETE | `/users/me/device/:deviceId` | Yes | Any | — | `{ success: true }` |

### Shops

| Method | Path | Auth | Role | Request Body / Query | Response `data` |
|---|---|---|---|---|---|
| POST | `/shops` | Yes | SHOP_OWNER | `{ name, address, phone?, colorRate, bwRate, a3Surcharge, duplexDiscount }` | `Shop` |
| GET | `/shops` | Yes | Any | `?search&page&limit` | `{ items: Shop[], total, page, limit }` |
| GET | `/shops/:id` | Yes | Any | — | `Shop` |
| PATCH | `/shops/:id` | Yes | SHOP_OWNER (own) | `{ name?, address?, phone?, colorRate?, bwRate?, a3Surcharge?, duplexDiscount? }` | `Shop` |
| PATCH | `/shops/:id/status` | Yes | PLATFORM_ADMIN | `{ status: ACTIVE\|REJECTED\|SUSPENDED, rejectionReason? }` | `Shop` |
| PATCH | `/shops/:id/resubmit` | Yes | SHOP_OWNER (own, REJECTED only) | — | `Shop` |
| GET | `/shops/:id/slots` | Yes | CUSTOMER | `?date=YYYY-MM-DD` | `ShopSlot[]` (open, with capacity) |
| GET | `/shops/:id/slots/active` | Yes | CUSTOMER | — | `ShopSlot \| null` |

### Slot Templates (Platform Admin)

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| GET | `/slots/templates` | Yes | PLATFORM_ADMIN | — | `SlotTemplate[]` |
| POST | `/slots/templates` | Yes | PLATFORM_ADMIN | `{ startTime, endTime }` | `SlotTemplate` |
| PATCH | `/slots/templates/:id` | Yes | PLATFORM_ADMIN | `{ startTime?, endTime? }` | `SlotTemplate` |
| DELETE | `/slots/templates/:id` | Yes | PLATFORM_ADMIN | — | `{ success: true }` |

### Shop Slots (Shop Owner)

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/shops/:id/slots` | Yes | SHOP_OWNER (own) | `{ templateId, date, isOpen, maxOrders }` | `ShopSlot` |
| PATCH | `/shops/:id/slots/:slotId` | Yes | SHOP_OWNER (own) | `{ isOpen?, maxOrders? }` | `ShopSlot` |

### Staff

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/shops/:id/staff` | Yes | SHOP_OWNER (own) | `{ userId }` | `User` |
| DELETE | `/shops/:id/staff/:userId` | Yes | SHOP_OWNER (own) | — | `{ success: true }` |
| GET | `/shops/:id/staff` | Yes | SHOP_OWNER (own) | — | `User[]` |

### Upload

| Method | Path | Auth | Role | Request | Response `data` |
|---|---|---|---|---|---|
| POST | `/upload` | Yes | CUSTOMER | `multipart/form-data { file }` | `{ url, fileName, fileSize, mimeType, detectedPages: number\|null }` |

Accepted MIME types: `application/pdf`, DOCX, PPTX, XLS, XLSX, `image/jpeg`, `image/png`. Max 20 MB.

### Price Preview

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/orders/preview-price` | Yes | CUSTOMER | `{ shopId, files: [{ detectedPages, colorMode, paperSize, copies, duplex, pageRange? }] }` | `{ totalPrice, breakdown: [{ resolvedPages, subtotalPrice }] }` |

### Orders

| Method | Path | Auth | Role | Request Body / Query | Response `data` |
|---|---|---|---|---|---|
| POST | `/orders` | Yes | CUSTOMER | `{ shopId, pickupMode, slotId?, paymentMethod, files: [OrderFileInput] }` | `Order` (with `orderFiles`) |
| GET | `/orders` | Yes | CUSTOMER | `?page&limit&status?` | `{ items: Order[], total, page, limit }` |
| GET | `/orders/:id` | Yes | CUSTOMER · STAFF · SHOP_OWNER | — | `Order` |
| PATCH | `/orders/:id/cancel` | Yes | CUSTOMER (own, QUEUED\|SCHEDULED) | — | `Order` |
| GET | `/shops/:id/orders` | Yes | STAFF · SHOP_OWNER (own) | `?status?&date&page&limit` | `{ items: Order[], total, page, limit }` |
| PATCH | `/orders/:id/status` | Yes | STAFF (own shop) | `{ status, expectedCurrentStatus }` | `Order` — 409 on optimistic lock mismatch |

`OrderFileInput`:
```typescript
{
  fileUrl: string
  fileName: string
  mimeType: string
  fileSize: number
  detectedPages: number
  colorMode: ColorMode
  paperSize: PaperSize
  orientation: Orientation
  copies: number         // min 1
  duplex: boolean
  pageRange?: string     // "1-5" or "1,3,5" or omit for all pages
}
```

### Wallet

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| GET | `/wallet/balance` | Yes | CUSTOMER | — | `{ balance: number }` |
| GET | `/wallet/transactions` | Yes | CUSTOMER | `?page&limit` | `{ items: WalletTransaction[], total, page, limit }` |
| POST | `/wallet/topup` | Yes | SHOP_OWNER · PLATFORM_ADMIN | `{ userId, amount }` | `WalletTransaction` |
| POST | `/wallet/topup/gateway` | Yes | CUSTOMER | `{ amount, provider: bkash\|card }` | `{ paymentUrl: string }` |

### Notifications

| Method | Path | Auth | Role | Query | Response `data` |
|---|---|---|---|---|---|
| GET | `/notifications` | Yes | Any | `?page&limit&read?` | `{ items: Notification[], total, page, limit }` |
| PATCH | `/notifications/:id/read` | Yes | Any (own) | — | `Notification` |
| PATCH | `/notifications/read-all` | Yes | Any | — | `{ count: number }` |

### Analytics & Admin Config

| Method | Path | Auth | Role | Query | Response `data` |
|---|---|---|---|---|---|
| GET | `/shops/:id/analytics` | Yes | SHOP_OWNER (own) | `?date` | `{ totalOrders, revenue, byStatus, avgProcessingMins }` |
| GET | `/admin/analytics` | Yes | PLATFORM_ADMIN | — | `{ totalShops, totalOrders, revenuePerShop, pendingApprovals }` |
| GET | `/admin/config` | Yes | PLATFORM_ADMIN | — | `AppConfig[]` |
| PATCH | `/admin/config/:key` | Yes | PLATFORM_ADMIN | `{ value: string }` | `AppConfig` |

### WebSocket (socket.io)

Namespace: `/orders`. Handshake auth: `{ token: <supabase-jwt> }`.

| Event | Direction | Payload |
|---|---|---|
| `order:join` | Client → Server | `{ orderId: string }` |
| `order:leave` | Client → Server | `{ orderId: string }` |
| `order:status_changed` | Server → Client | `{ orderId, status, updatedAt }` |
| `order:queue_updated` | Server → Client | `{ orderId, position: number, etaMins: number }` |

### Error Codes

| Code | Meaning |
|---|---|
| 400 | Zod validation failure, invalid transition, cancel rule violation |
| 401 | Missing or expired JWT |
| 402 | Insufficient wallet balance |
| 403 | Role not permitted |
| 404 | Resource not found |
| 409 | Optimistic lock mismatch, slot full, duplicate constraint |
| 413 | File exceeds 20 MB |
| 415 | Unsupported MIME type |
| 500 | Unhandled server exception |

---

## 6. Frontend Structure

### State Management Architecture

```
┌─────────────────────────────────────────┐
│          TanStack Query (server state)   │
│  Cache keys: ['orders'], ['wallet'],     │
│  ['shops'], ['notifications'], etc.      │
│  Invalidated on mutation success         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Zustand (UI state only)        │
│  useAuthStore     — session, user, role  │
│  useOrderWizardStore — print config      │
│                      wizard steps        │
│  useSettingsStore — language, offline    │
└─────────────────────────────────────────┘
```

Never put server data in Zustand. Never read TanStack Query cache from outside React Query hooks.

### Key Screens and Components

#### Customer Flow
- **ShopListScreen** — `FlashList` of active shops. TanStack Query `['shops']`. Search filter as local controlled input.
- **ShopDetailScreen** — Shop info. "Print Now" button visible only when `GET /shops/:id/slots/active` returns non-null. "Schedule Pickup" always visible.
- **OrderWizardScreen** — Multi-step:
  1. Upload step: file picker → `POST /upload` per file → stores `{ url, detectedPages, ... }` in `useOrderWizardStore`
  2. Config step: `PrintConfigForm` per uploaded file
  3. Slot picker step (SLOT mode): date selector → `GET /shops/:id/slots?date=` → `SlotPicker` component
  4. Review + price preview step: `POST /orders/preview-price` → price breakdown display
  5. Payment step: Wallet or Cash toggle → confirm
- **OrderDetailScreen** — Displays `OrderNumber`, status badge, PrintConfig per file, ETA (queue mode), Slot time (slot mode). Joins `order:{orderId}` socket room on mount. Disconnect banner from `useSettingsStore`.
- **OrderHistoryScreen** — Paginated `FlashList`. TanStack Query with `?status` filter.
- **WalletScreen** — Balance header + paginated `WalletTransaction` list.
- **NotificationsScreen** — Paginated list with read/unread grouping. "Mark all read" button.

#### Staff Flow
- **JobDashboardScreen** — `FlashList` sorted: Slot orders first, then Queue by `createdAt`. TanStack Query `['shop-orders']` with `refetchInterval: 30_000`.
- **JobDetailScreen** — Full spec view. "Advance Status" button with optimistic lock: sends `expectedCurrentStatus`. On 409, shows inline conflict toast and triggers refetch.

#### Shop Owner Flow
- **ShopSettingsScreen** — Pricing rate inputs. `PATCH /shops/:id`.
- **SlotCalendarScreen** — Date-based grid of ShopSlots. Toggle `isOpen`, edit `maxOrders` inline.
- **StaffRosterScreen** — List of staff. Promote (userId input) / demote buttons.
- **ShopAnalyticsScreen** — Date picker + stat cards (totalOrders, revenue, byStatus breakdown).

#### Admin Flow
- **ShopApprovalScreen** — List of PENDING shops with approve/reject actions. Rejection reason input.
- **SlotTemplatesScreen** — Create/edit/delete SlotTemplate rows.
- **AppConfigScreen** — Key-value pairs editable inline.
- **PlatformAnalyticsScreen** — Platform-wide stats + revenuePerShop table.

### Component Design Conventions

- **Design system imports**: `View`, `Text`, `Button`, `Icon` from `@/components/ui/` — never directly from `react-native`.
- **Compound components**: `Button` + `ButtonText` + `ButtonIcon` pattern — not polymorphic string children.
- **Lists**: Always `FlashList` — never `ScrollView + .map()`.
- **Images**: Always `expo-image` — never RN `Image`.
- **Modals**: Native `<Modal presentationStyle="formSheet">` — never JS bottom sheet libraries.
- **Menus**: `zeego` — never custom absolute-positioned menus.
- **Press states**: `Pressable` — never `TouchableOpacity`.
- **Animated press (scale/opacity)**: `Gesture.Tap()` via `GestureDetector` — not `onPressIn/Out`.
- **No falsy `&&`**: `{count > 0 ? <X /> : null}` — never `{count && <X />}` (crashes on `count=0`).
- **Strings in Text**: Every string literal must be inside `<Text>` — never a direct child of `<View>`.

### i18n Key Convention
```
feature.component.label
orders.card.status
wallet.balance.header
notifications.empty.title
```

### Real-Time Integration Pattern
```typescript
// On OrderDetailScreen mount:
useEffect(() => {
  socket.emit('order:join', { orderId });
  socket.on('order:status_changed', ({ status }) => {
    queryClient.setQueryData(['order', orderId], (old) => ({ ...old, status }));
  });
  socket.on('order:queue_updated', ({ position, etaMins }) => {
    setQueueInfo({ position, etaMins }); // Zustand or local state OK here — UI only
  });
  return () => socket.emit('order:leave', { orderId });
}, [orderId]);
```

---

## 7. Authentication and Authorization

### Identity Flow

1. User registers or logs in via `POST /auth/register` or `POST /auth/login`.
2. NestJS calls Supabase Auth SDK → returns Supabase JWT + user record.
3. Mobile stores JWT in `useAuthStore` (Zustand, persisted to SecureStore).
4. Every subsequent API request includes `Authorization: Bearer <jwt>`.
5. NestJS `JwtAuthGuard` validates the JWT signature against `JWT_SECRET` via `supabase-jwt.strategy.ts`.
6. On valid JWT, the guard queries `prisma.user.findUnique({ where: { id: sub } })` and attaches the full `User` row (including current `role`) to `request.user`.
7. `RolesGuard` reads `@Roles()` metadata and compares against `request.user.role`. 403 if mismatch.
8. `@CurrentUser()` decorator extracts `request.user` in controllers.

### Why Role Lives in DB (Not JWT)
Supabase JWTs are long-lived and cached on device. If role were embedded in JWT claims, a Shop Owner who is suspended would retain their role until token expiry. Reading role from DB on every request means role changes (promote to Staff, demote, suspend) take effect on the very next API call.

### Role Capabilities Summary

| Role | Key Permissions |
|---|---|
| `CUSTOMER` | Upload files, place/cancel own orders, manage own wallet, read own notifications |
| `STAFF` | Advance status on own Shop's orders, read order detail |
| `SHOP_OWNER` | All STAFF permissions + manage own Shop (pricing, slots, staff), admin-credit wallet, view shop analytics |
| `PLATFORM_ADMIN` | All permissions + approve/reject/suspend shops, manage AppConfig and SlotTemplates, view platform analytics |

### Ownership Guards
Beyond role, several endpoints enforce resource ownership:
- Shop Owner endpoints (`PATCH /shops/:id`, slot/staff management): `ShopsService` verifies `shop.ownerId === req.user.id`.
- Staff status advance: `OrdersService` verifies `order.shopId === req.user.shopId`.
- Customer cancel: `OrdersService` verifies `order.customerId === req.user.id`.
- Notification mark-read: `NotificationsService` verifies `notification.userId === req.user.id`.

---

## 8. Validation Strategy

Validation happens at three layers. Each layer catches a different class of invalid input.

### Layer 1: Mobile (client-side, UX only)
- Form-level validation before API call: required fields, min/max values, page range format.
- Purpose: fast feedback. Not a security boundary.
- Implementation: Zod schemas reused from `packages/shared` where possible, or local form state validation.
- Offline check: `useSettingsStore.isOffline` — blocks all mutations before they fire.

### Layer 2: API DTO validation (Zod + `ZodValidationPipe`)
- Every controller action that accepts a body has a Zod schema in its `dto/` file.
- `ZodValidationPipe` runs before the controller method. Invalid input → 400 with field-level error messages.
- `ZodValidationPipe` is registered globally in `AppModule` — no per-controller setup needed.
- Example DTO:
```typescript
// dto/create-order.dto.ts
export const CreateOrderSchema = z.object({
  shopId:        z.string().uuid(),
  pickupMode:    z.enum(['QUEUE', 'SLOT']),
  slotId:        z.string().uuid().optional(),
  paymentMethod: z.enum(['WALLET', 'CASH']),
  files:         z.array(OrderFileInputSchema).min(1).max(10),
});
export type CreateOrderDto = z.infer<typeof CreateOrderSchema>;
```

### Layer 3: Service-level business rule validation
Business rules that require DB state are validated in the service layer:
- Wallet balance re-checked inside `prisma.$transaction` before debit insert.
- `ShopSlot.currentCount < maxOrders` re-checked inside transaction on order creation.
- `order.status IN (QUEUED, SCHEDULED)` checked before cancel.
- `expectedCurrentStatus` matched against DB value before status advance (optimistic lock).
- `shop.status === ACTIVE` checked before order creation.
- Active Slot existence checked before QUEUE order creation.
- Booking horizon (today + 3 days) enforced in `SlotsService`.
- Staff promotion: target user must have role `CUSTOMER`.
- Shop resubmit: only valid from `REJECTED` status (not `SUSPENDED`).

### File Validation
Multer enforces 20 MB limit (returns 413 before the handler runs). MIME type validated by inspecting the actual MIME string server-side — not file extension. Validation runs before Cloudinary upload.

---

## 9. Testing Strategy

### Philosophy
Tests verify **external observable behaviour** — what is returned or what side effects occur — not which internal methods were called. A test that breaks because a private method was renamed, but the feature still works, is a bad test.

### API Unit Tests

Each module's `__tests__/` contains:
- `<feature>.service.spec.ts` — unit tests for service methods with mocked `PrismaService`.
- `<feature>.controller.spec.ts` — unit tests for controller with mocked service, verifying route guards, DTO shape, and response structure.

| Module | Critical Test Cases |
|---|---|
| `OrdersService` | Price formula for all ColorMode × PaperSize × duplex combinations; cancel blocked after PROCESSING; status transitions valid/invalid; QUEUE rejects when no active slot; SLOT rejects beyond booking horizon; totalPrice not accepted from client body |
| `WalletService` | Debit returns 402 on insufficient balance; balance aggregate formula; LOW_BALANCE fires when new balance < threshold; top-up min/max limits enforced |
| `SlotsService` | Active slot returns null when time window has no open slot; slot hidden when full; ShopSlot creation validates unique (shopId, templateId, date) |
| `ShopsService` | Status transition table: valid transitions succeed, invalid ones return 400; resubmit blocked on SUSPENDED; PENDING shop not returned to CUSTOMER queries |
| `StaffService` | Promotion fails if user.role ≠ CUSTOMER; demotion sets role=CUSTOMER and shopId=null |
| `NotificationsService` | All 12 event types produce Notification row; push skipped when no UserDevice; UserDevice deleted on DeviceNotRegistered |
| `AuthService` | Registration blocked for STAFF and PLATFORM_ADMIN roles |
| `OrdersController` | Role guard: 403 for non-CUSTOMER on POST /orders; DTO validation: 400 on missing shopId |

### API Integration / E2E Tests (`apps/api/test/`)

Use a real test database — no Prisma mocks. Mirrors the project's zero-tolerance for mock/prod divergence.

| Test Scenario | Assertion |
|---|---|
| Full order creation flow | Upload → preview price → POST /orders → verify OrderFile rows, totalPrice matches formula, orderNumber format `PS-\d{5}`, slotId not null |
| Concurrent wallet debit | Two simultaneous POST /orders (WALLET) for same user, one succeeds, other returns 402 |
| Concurrent slot booking | Two simultaneous POST /orders for same last-capacity slot, one succeeds, other returns 409 |
| Optimistic lock | Two simultaneous PATCH /orders/:id/status, one succeeds, other returns 409 |
| Role guard | All protected endpoints return 403 with mismatched role |
| Cancel and refund | Cancel WALLET order → WalletTransaction CREDIT row created for exact totalPrice |
| Slot cancellation capacity restore | Cancel SLOT order → ShopSlot.currentCount decremented |
| Shop approval flow | PENDING shop → ACTIVE → CUSTOMER can see it; PENDING shop → CUSTOMER cannot see it |

### Mobile Unit Tests (Jest + React Native Testing Library)

| Target | Test Cases |
|---|---|
| `useOrders` hook | Correct query key; on mutation success, `['orders']` invalidated |
| `useWallet` hook | Balance query returns aggregated value |
| `OrderCard` | Renders OrderNumber and status badge; no crash when ETA is null or count is 0 |
| `PrintConfigForm` | pageRange validation; copies min 1 enforced; all 6 config fields rendered |
| `SlotPicker` | Renders only open, non-full slots; past dates disabled; full slots disabled |
| `StatusBadge` | Correct colour and label for all 6 OrderStatus values |
| Offline banner | Renders when `useSettingsStore.isOffline = true`; hidden when online |
| Price preview | Matches server formula for known inputs (regression guard) |

### TDD Protocol
1. Write a failing test (red).
2. Write minimal implementation to pass (green).
3. Refactor, keeping tests passing.
Test file must exist and have failed before PR opens for any feature.

---

## 10. Risks

### Risk 1 — Concurrency: wallet debit and slot booking races
**Likelihood:** Medium | **Impact:** High

Two users could simultaneously submit the last-balance wallet payment, or book the last available slot, resulting in overdraft or overbooking.

**Mitigation:**
- Wallet debit wrapped in `prisma.$transaction` that aggregates balance, checks sufficiency, and inserts debit row atomically. If balance insufficient at transaction time, 402 is returned.
- Slot booking: `currentCount` increment uses `prisma.$transaction` with re-read check. Second concurrent request finds `currentCount >= maxOrders` and returns 409.
- Both paths covered by E2E tests that simulate concurrent HTTP requests.

---

### Risk 2 — WebSocket drops on mobile
**Likelihood:** Medium | **Impact:** Medium

Mobile networks are unreliable. A customer could miss `order:status_changed` events, appearing stuck.

**Mitigation:**
- TanStack Query polls `GET /orders/:id` every 30 seconds as a silent fallback (ADR-006).
- Offline banner displayed when WebSocket is disconnected.
- On reconnect (app foreground, network change), `order:join` is re-emitted automatically — no manual refresh needed.

---

### Risk 3 — Prisma schema errors discovered mid-build
**Likelihood:** High | **Impact:** Critical

Incorrect relations or missing fields force destructive migrations after features are already implemented against the wrong schema, breaking all dependent services.

**Mitigation:**
- Review full `schema.prisma` against `docs/04-data-model.md` before any feature work begins.
- Run `prisma migrate dev` and `prisma db seed` on day one. No feature branches open until the first migration succeeds and the seed script passes.
- Schema changes require a peer review of the migration file before merge.

---

### Risk 4 — File upload abuse
**Likelihood:** High | **Impact:** Medium

Customers could upload oversized files or disguised malicious content (e.g. executable renamed to `.pdf`), crashing the server or filling Cloudinary storage.

**Mitigation:**
- Multer hard limit: 20 MB. Returns 413 before handler runs.
- MIME type whitelist enforced server-side by inspecting actual MIME (not file extension).
- Cloudinary upload preset configured to reject non-whitelisted MIME types as a second layer.

---

### Risk 5 — Payment gateway scope creep (P1)
**Likelihood:** Medium | **Impact:** High

bKash/card integration involves sandbox onboarding, callback webhooks, and failure recovery. Attempting it alongside P0 features risks delaying the entire v1.

**Mitigation:**
- v1 ships admin-credit-only wallet top-up (P0: `POST /wallet/topup`).
- Gateway endpoint (`POST /wallet/topup/gateway`) is a P1 stub behind its own route. Zero other features depend on it.
- Gateway work begins only after all P0 features are done and tested.

---

### Risk 6 — Expo SDK version lock
**Likelihood:** Low | **Impact:** Medium

Upgrading Expo SDK mid-project risks breaking native modules.

**Mitigation:**
- Lock Expo SDK version in `app.json` on project initialisation. No upgrades during the build sprint. Schedule upgrade after v1 ships.

---

### Risk 7 — i18n string drift
**Likelihood:** Medium | **Impact:** Low

As features are added, developers forget to add Bengali translations, leaving raw key strings in the UI.

**Mitigation:**
- Add an i18n lint rule to CI (`i18next-parser` or equivalent) that fails the build on missing translation keys for any language other than the default.

---

### Risk 8 — Render cold start on demo
**Likelihood:** Medium | **Impact:** Medium

Render free tier spins down after inactivity. First request after inactivity takes 10–30 seconds.

**Mitigation:**
- Use Render paid tier ("Starter") for demo deployment, which does not spin down.
- Alternatively, configure a keep-alive cron that pings the health endpoint every 10 minutes.

---

## 11. Migration Plan

This is a greenfield project — no existing production data to migrate. However, the schema will evolve during development as features are built in sequence. The following protocol keeps the team safe.

### Day-One Baseline
1. The complete `schema.prisma` (all entities) is written and peer-reviewed against `docs/04-data-model.md` before any feature work begins.
2. `npx prisma migrate dev --name init` runs the initial migration.
3. `npx prisma db seed` seeds the Platform Admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`).
4. All developers run `npx prisma generate` to refresh the Prisma client.

### Adding or Changing Schema Mid-Build
If a schema change is needed during development:
1. Update `docs/04-data-model.md` first (source of truth).
2. Update `schema.prisma` to match.
3. Run `npx prisma migrate dev --name <descriptive-name>`.
4. Run `npx prisma generate`.
5. Restart the NestJS dev server (`npm run dev` from root via Turborepo).
6. Update any affected shared types in `packages/shared/src/types/`.
7. Run `npm run build` from the root to verify the full build graph passes.

### Additive-Only Rule for Shared Types
Changes to `packages/shared/src/types/` must be additive (add fields with `?` optional) during active development. Removing or renaming a field without coordinating both apps simultaneously will cause TypeScript errors across the monorepo. Plan breaking type changes as a paired commit across `packages/shared`, `apps/api`, and `apps/mobile`.

### Production Deployment Migration
Render build command: `cd apps/api && npx prisma migrate deploy && npm run build`.
`migrate deploy` applies pending migrations in sequence without prompting. This runs on every deploy — safe because each migration file is immutable once committed.

### Rollback
Prisma does not support automatic rollback. If a migration causes a regression:
1. Fix forward: write a new corrective migration (`npx prisma migrate dev --name fix-<description>`).
2. For destructive scenarios (data loss), restore from Supabase automated backup before applying the fix.
3. Never edit or delete a committed migration file — this breaks the migration history checksum.
