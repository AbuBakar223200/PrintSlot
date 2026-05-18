# API Contract

> See also: [`CONTEXT.md`](../CONTEXT.md) — all responses follow `{ data: T, message: string, statusCode: number }` shape, handled automatically by `apps/api/src/common/interceptors/response.interceptor.ts`.

**Base URL:** `https://<render-host>/api`

## Deployment

| Layer | Platform | Notes |
|---|---|---|
| API | Render Web Service | Build: `cd apps/api && npx prisma migrate deploy && npm run build` · Start: `node dist/main` |
| DB | Supabase PostgreSQL | External — Prisma connects via `DATABASE_URL` |
| Auth | Supabase Auth | Same Supabase project as DB |
| Files | Cloudinary | `printslot/pending/` (TTL 24h) + `printslot/orders/{orderId}/` |
| Mobile | Expo EAS Build + EAS Submit | Managed workflow — no ejecting |

**Required Render environment variables:** `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`
**Auth header:** `Authorization: Bearer <supabase-jwt>`
**Validation:** All DTOs validated via `ZodValidationPipe`. Invalid input → 400 with field errors.
**Role guard:** `@Roles()` decorator + `RolesGuard` on all protected routes.

---

## Auth

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/auth/register` | No | Public | `{ email, password, name, phone?, role: CUSTOMER\|SHOP_OWNER }` | `{ user: User, accessToken: string }` |
| POST | `/auth/login` | No | Public | `{ email, password }` | `{ user: User, accessToken: string }` |
| GET | `/auth/me` | Yes | Any | — | `User` |

> Platform Admin and Staff accounts created by Platform Admin / Shop Owner only — not via public register.

---

## Users

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| PATCH | `/users/me` | Yes | Any | `{ name?, phone?, language?: EN\|BN }` | `User` |
| PATCH | `/users/me/device` | Yes | Any | `{ deviceId: string, token: string }` | `UserDevice` (upsert by deviceId) |
| DELETE | `/users/me/device/:deviceId` | Yes | Any | — | `{ success: true }` |

---

## Shops

| Method | Path | Auth | Role | Request Body / Query | Response `data` |
|---|---|---|---|---|---|
| POST | `/shops` | Yes | SHOP_OWNER | `{ name, address, phone?, colorRate, bwRate, a3Surcharge, duplexDiscount }` | `Shop` |
| GET | `/shops` | Yes | CUSTOMER · STAFF · SHOP_OWNER · PLATFORM_ADMIN | `?search=&page=1&limit=20` | `{ items: Shop[], total, page, limit }` |
| GET | `/shops/:id` | Yes | Any | — | `Shop` |
| PATCH | `/shops/:id` | Yes | SHOP_OWNER (own shop) | `{ name?, address?, phone?, colorRate?, bwRate?, a3Surcharge?, duplexDiscount? }` | `Shop` |
| PATCH | `/shops/:id/status` | Yes | PLATFORM_ADMIN | `{ status: ACTIVE\|REJECTED\|SUSPENDED, rejectionReason? }` | `Shop` |
| PATCH | `/shops/:id/resubmit` | Yes | SHOP_OWNER (own, status=REJECTED only — not SUSPENDED) | — | `Shop` (status → PENDING, rejectionReason cleared) |
| GET | `/shops/:id/slots` | Yes | CUSTOMER | `?date=YYYY-MM-DD` | `ShopSlot[]` (isOpen=true, currentCount < maxOrders only) |
| GET | `/shops/:id/slots/active` | Yes | CUSTOMER | — | `ShopSlot \| null` — returns current time window's open slot if one exists right now (BST). `null` = "Print Now" unavailable. |

---

## Slot Templates *(Platform Admin)*

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| GET | `/slots/templates` | Yes | PLATFORM_ADMIN | — | `SlotTemplate[]` |
| POST | `/slots/templates` | Yes | PLATFORM_ADMIN | `{ startTime: "HH:MM", endTime: "HH:MM", durationMins }` | `SlotTemplate` |
| PATCH | `/slots/templates/:id` | Yes | PLATFORM_ADMIN | `{ startTime?, endTime?, durationMins? }` | `SlotTemplate` |
| DELETE | `/slots/templates/:id` | Yes | PLATFORM_ADMIN | — | `{ success: true }` |

---

## Shop Slots *(Shop Owner)*

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/shops/:id/slots` | Yes | SHOP_OWNER (own shop) | `{ templateId, date: "YYYY-MM-DD", isOpen, maxOrders }` | `ShopSlot` |
| PATCH | `/shops/:id/slots/:slotId` | Yes | SHOP_OWNER (own shop) | `{ isOpen?, maxOrders? }` | `ShopSlot` |

---

## Staff

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/shops/:id/staff` | Yes | SHOP_OWNER (own shop) | `{ userId }` | `User` (updated with shopId + role=STAFF) |
| DELETE | `/shops/:id/staff/:userId` | Yes | SHOP_OWNER (own shop) | — | `{ success: true }` |
| GET | `/shops/:id/staff` | Yes | SHOP_OWNER (own shop) | — | `User[]` |

> Platform Admin can create staff accounts via `POST /auth/register` with role `STAFF` + manual `shopId` assignment.

---

## Upload

| Method | Path | Auth | Role | Request | Response `data` |
|---|---|---|---|---|---|
| POST | `/upload` | Yes | CUSTOMER | `multipart/form-data { file }` | `{ url: string, fileName: string, fileSize: number, mimeType: string, detectedPages: number\|null }` |

> `detectedPages` is non-null only for PDF files (via `pdf-parse`). For DOCX, PPTX, XLS, XLSX, JPG, PNG → returns `null`. Client shows a manual page count input field when `null`.

**Accepted MIME types:** `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `image/jpeg`, `image/png`

**Max size:** 20 MB. Exceeding returns 413.

---

## Price Preview

| Method | Path | Auth | Role | Request Body | Response `data` |
|---|---|---|---|---|---|
| POST | `/orders/preview-price` | Yes | CUSTOMER | `{ shopId, files: [{ detectedPages, colorMode, paperSize, copies, duplex, pageRange? }] }` | `{ totalPrice: number, breakdown: [{ resolvedPages, subtotalPrice }] }` |

> Call before placing order so customer sees price. Same formula used on actual order creation.

---

## Orders

| Method | Path | Auth | Role | Request Body / Query | Response `data` |
|---|---|---|---|---|---|
| POST | `/orders` | Yes | CUSTOMER | `{ shopId, pickupMode: QUEUE\|SLOT, slotId?, paymentMethod: WALLET\|CASH, files: [{ fileUrl, fileName, mimeType, fileSize, detectedPages, colorMode, paperSize, orientation, copies, duplex, pageRange? }] }` | `Order` (with `orderFiles` included) |
| GET | `/orders` | Yes | CUSTOMER | `?page=1&limit=20&status?` | `{ items: Order[], total, page, limit }` |
| GET | `/orders/:id` | Yes | CUSTOMER · STAFF · SHOP_OWNER | — | `Order` |
| PATCH | `/orders/:id/cancel` | Yes | CUSTOMER (own order, status QUEUED\|SCHEDULED) | — | `Order` |
| GET | `/shops/:id/orders` | Yes | STAFF · SHOP_OWNER (own shop) | `?status?&date=YYYY-MM-DD&page=1&limit=20` | `{ items: Order[], total, page, limit }` |
| PATCH | `/orders/:id/status` | Yes | STAFF (own shop orders only) | `{ status: PROCESSING\|READY\|COLLECTED, expectedCurrentStatus: QUEUED\|SCHEDULED\|PROCESSING\|READY }` | `Order` — 409 if `expectedCurrentStatus` doesn't match DB |

**Order creation rules:**
- `slotId` required when `pickupMode = SLOT`; must be an open slot with capacity
- `totalPrice` never accepted in body; always computed server-side
- `paymentMethod: WALLET` → balance deducted atomically; insufficient balance → 402
- `paymentMethod: CASH` → order placed without deduction; staff marks paid on `COLLECTED`

---

## Wallet

| Method | Path | Auth | Role | Request Body / Query | Response `data` |
|---|---|---|---|---|---|
| GET | `/wallet/balance` | Yes | CUSTOMER | — | `{ balance: number }` |
| GET | `/wallet/transactions` | Yes | CUSTOMER | `?page=1&limit=20` | `{ items: WalletTransaction[], total, page, limit }` |
| POST | `/wallet/topup` | Yes | SHOP_OWNER · PLATFORM_ADMIN | `{ userId, amount }` | `WalletTransaction` |
| POST | `/wallet/topup/gateway` | Yes | CUSTOMER | `{ amount, provider: bkash\|card }` | `{ paymentUrl: string }` |

---

## Notifications

| Method | Path | Auth | Role | Query | Response `data` |
|---|---|---|---|---|---|
| GET | `/notifications` | Yes | Any | `?page=1&limit=20&read?=true\|false` | `{ items: Notification[], total, page, limit }` |
| PATCH | `/notifications/:id/read` | Yes | Any (own) | — | `Notification` |
| PATCH | `/notifications/read-all` | Yes | Any | — | `{ count: number }` |

---

## Analytics

| Method | Path | Auth | Role | Query | Response `data` |
|---|---|---|---|---|---|
| GET | `/shops/:id/analytics` | Yes | SHOP_OWNER (own shop) | `?date=YYYY-MM-DD` | `{ totalOrders, revenue, byStatus: { QUEUED, PROCESSING, READY, COLLECTED, CANCELLED }, avgProcessingMins }` |
| GET | `/admin/analytics` | Yes | PLATFORM_ADMIN | — | `{ totalShops, totalOrders, revenuePerShop: [{ shopId, name, revenue }], pendingApprovals }` |
| GET | `/admin/config` | Yes | PLATFORM_ADMIN | — | `AppConfig[]` |
| PATCH | `/admin/config/:key` | Yes | PLATFORM_ADMIN | `{ value: string }` | `AppConfig` |

---

## WebSocket (socket.io)

**Namespace:** `/orders`
**Auth:** `auth: { token: <supabase-jwt> }` in handshake

| Event | Direction | Payload | Description |
|---|---|---|---|
| `order:join` | Client → Server | `{ orderId: string }` | Customer joins room for specific order |
| `order:leave` | Client → Server | `{ orderId: string }` | Customer leaves room |
| `order:status_changed` | Server → Client | `{ orderId, status, updatedAt }` | Fired when staff advances order status |
| `order:queue_updated` | Server → Client | `{ orderId, position: number, etaMins: number }` | Fired when queue position changes (new order placed ahead, or order ahead completes) |

---

## Error Responses

All errors returned by `HttpExceptionFilter` in shape:
```json
{
  "data": null,
  "message": "<human-readable error>",
  "statusCode": 4xx | 5xx
}
```

| Code | Meaning |
|---|---|
| 400 | Validation error (Zod) |
| 401 | Missing or invalid JWT |
| 402 | Insufficient wallet balance |
| 403 | Role not permitted |
| 404 | Resource not found |
| 409 | Conflict (slot full, duplicate, etc.) |
| 413 | File too large |
| 415 | Unsupported file type |
| 500 | Internal server error |
