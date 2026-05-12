# Data Model

> See also: [`CONTEXT.md`](../CONTEXT.md) — Golden Rule #2: `@prisma/client` imported inside `apps/api/src/` only. Golden Rule #1: shared types live in `packages/shared/src/types/`.
>
> Schema file: `apps/api/prisma/schema.prisma` — this document is the source of truth; schema.prisma must match exactly.

---

## Entities & Relationships

```
User ──< Order (as customer)
User ──< WalletTransaction
User ──< Notification
User ──< UserDevice
User >── Shop (as owner, 1:1)
User >── Shop (as staff member, N:1)

Shop ──< Order
Shop ──< ShopSlot
Shop ──< User (staff)

SlotTemplate ──< ShopSlot

ShopSlot ──< Order (slot orders only)

Order ──< OrderFile
Order ──< WalletTransaction (refund/payment link)
Order ──< Notification (reference)

AppConfig (singleton key-value store, managed by Platform Admin)
```

---

## Models

### User
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK, default Supabase Auth UID |
| email | String | UNIQUE, NOT NULL |
| name | String | NOT NULL |
| phone | String | nullable |
| role | Enum | CUSTOMER · STAFF · SHOP_OWNER · PLATFORM_ADMIN |
| shopId | UUID | FK → Shop, nullable (set for STAFF and SHOP_OWNER) |
| language | Enum | EN · BN, default EN |
| createdAt | DateTime | default now() |
| updatedAt | DateTime | auto-updated |

> `expoPushToken` removed from User. Push tokens live in `UserDevice` table (multi-device support).

---

### UserDevice
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User, NOT NULL |
| token | String | NOT NULL (Expo push token) |
| deviceId | String | NOT NULL (Expo stable device ID) |
| updatedAt | DateTime | auto-updated |
| UNIQUE | — | (userId, deviceId) |

**Rules:**
- Upsert on every login/app launch via `PATCH /users/me` with `{ deviceId, expoPushToken }`
- On Expo `DeviceNotRegistered` error → delete that `UserDevice` row
- Push dispatch fans out to all rows for a given `userId`

---

### Shop
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | String | NOT NULL |
| address | String | NOT NULL |
| phone | String | nullable |
| status | Enum | PENDING · ACTIVE · REJECTED · SUSPENDED, default PENDING |
| rejectionReason | String | nullable — set by Admin on REJECTED or SUSPENDED; cleared on resubmit |
| ownerId | UUID | FK → User, UNIQUE (one shop per owner) |
| colorRate | Decimal | NOT NULL, per page BDT |
| bwRate | Decimal | NOT NULL, per page BDT |
| a3Surcharge | Decimal | NOT NULL, added per A3 page |
| duplexDiscount | Decimal | NOT NULL, multiplier e.g. 0.8 = 20% off |
| defaultProcessingMins | Int | NOT NULL, default 15 — used as ETA fallback when < 10 completed orders |
| createdAt | DateTime | default now() |
| updatedAt | DateTime | auto-updated |

---

### SlotTemplate *(managed by Platform Admin)*
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| startTime | String | NOT NULL, format "HH:MM" e.g. "09:00" |
| endTime | String | NOT NULL, format "HH:MM" e.g. "09:30" (startTime + SLOT_DURATION_MINS from AppConfig) |
| deletedAt | DateTime | nullable — soft delete only; never hard-deleted if ShopSlots reference it |
| createdAt | DateTime | default now() |

> `durationMins` removed from SlotTemplate — duration is a single global value in `AppConfig.SLOT_DURATION_MINS`. All templates use the same duration.
> `GET /slots/templates` returns only `deletedAt: null` records. Existing ShopSlots referencing soft-deleted templates remain valid.

---

### ShopSlot *(managed by Shop Owner per date)*
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| shopId | UUID | FK → Shop, NOT NULL |
| templateId | UUID | FK → SlotTemplate, NOT NULL |
| date | Date | NOT NULL |
| isOpen | Boolean | default false |
| maxOrders | Int | NOT NULL, min 1 |
| currentCount | Int | default 0, incremented atomically on order placement |
| UNIQUE | — | (shopId, templateId, date) |

---

### Order
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK — used in all API routes and server logic |
| orderNumber | String | UNIQUE, NOT NULL — human-readable e.g. "PS-00142", shown on receipt + counter |
| customerId | UUID | FK → User, NOT NULL |
| shopId | UUID | FK → Shop, NOT NULL |
| pickupMode | Enum | QUEUE · SLOT |
| slotId | UUID | FK → ShopSlot, NOT NULL — QUEUE mode auto-assigns to currently active slot; SLOT mode customer-picks |
| status | Enum | QUEUED · SCHEDULED · PROCESSING · READY · COLLECTED · CANCELLED |
| paymentMethod | Enum | WALLET · CASH |
| totalPages | Int | NOT NULL, SUM of all OrderFile.resolvedPages × copies |
| colorPages | Int | NOT NULL, SUM of resolvedPages × copies where colorMode=COLOR |
| bwPages | Int | NOT NULL, SUM of resolvedPages × copies where colorMode=BW |
| totalPrice | Decimal | NOT NULL, SUM of all OrderFile.subtotalPrice, server-calculated |
| processingStartedAt | DateTime | nullable, set when status → PROCESSING |
| readyAt | DateTime | nullable, set when status → READY |
| cancelledAt | DateTime | nullable |
| createdAt | DateTime | default now() |
| updatedAt | DateTime | auto-updated |

> Print config fields (colorMode, paperSize, orientation, copies, duplex, pageRange, pages) removed from Order — they live on each `OrderFile` individually.

**Status transition rules:**
```
QUEUED     → PROCESSING → READY → COLLECTED   (queue mode)
SCHEDULED  → PROCESSING → READY → COLLECTED   (slot mode)
QUEUED     → CANCELLED  (customer, before staff accepts)
SCHEDULED  → CANCELLED  (customer, before staff accepts)
```
Cancel only allowed while status is `QUEUED` or `SCHEDULED`.

---

### OrderFile *(one row per uploaded file per order)*
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| orderId | UUID | FK → Order, NOT NULL |
| fileUrl | String | NOT NULL (Cloudinary URL) |
| fileName | String | NOT NULL |
| mimeType | String | NOT NULL |
| fileSize | Int | NOT NULL (bytes) |
| detectedPages | Int | NOT NULL — auto-detected for PDF via `pdf-parse`; customer-entered for DOCX/PPTX/XLS/XLSX/images |
| colorMode | Enum | COLOR · BW |
| paperSize | Enum | A4 · A3 · LETTER |
| orientation | Enum | PORTRAIT · LANDSCAPE |
| copies | Int | NOT NULL, min 1 |
| duplex | Boolean | default false |
| pageRange | String | nullable — null means all pages; format "1-5" or "1,3,5" |
| resolvedPages | Int | NOT NULL — actual pages to print after applying pageRange; default = detectedPages |
| subtotalPrice | Decimal | NOT NULL — price for this file only, server-calculated |
| uploadedAt | DateTime | default now() |

**Page resolution rule:** `resolvedPages = pageRange ? parseRange(pageRange).length : detectedPages`

**Subtotal formula per file:**
```
base     = resolvedPages × copies × (colorMode=COLOR ? colorRate : bwRate)
surcharge = paperSize=A3 ? resolvedPages × copies × a3Surcharge : 0
discount  = duplex ? base × (1 - duplexDiscount) : base
subtotal  = discount + surcharge
```

---

### WalletTransaction
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User, NOT NULL |
| type | Enum | CREDIT · DEBIT |
| amount | Decimal | NOT NULL, always positive |
| reason | Enum | TOPUP_ADMIN · TOPUP_GATEWAY · ORDER_PAYMENT · ORDER_REFUND |
| orderId | UUID | FK → Order, nullable |
| createdAt | DateTime | default now() |

**Balance formula:** `SUM(amount WHERE type=CREDIT) - SUM(amount WHERE type=DEBIT)` per userId.
Debit always executed inside Prisma transaction that re-checks balance before inserting.

---

### Notification
| Field | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| userId | UUID | FK → User, NOT NULL |
| title | String | NOT NULL |
| body | String | NOT NULL |
| type | Enum | ORDER_PLACED · ORDER_ACCEPTED · ORDER_READY · ORDER_CANCELLED · NEW_ORDER · WALLET_TOPUP · WALLET_DEDUCTED · SHOP_APPROVED · SHOP_REJECTED · SHOP_SUSPENDED · STAFF_ASSIGNED · LOW_BALANCE |
| read | Boolean | default false |
| orderId | UUID | FK → Order, nullable |
| createdAt | DateTime | default now() |

---

### AppConfig *(managed by Platform Admin)*
| Field | Type | Constraints |
|---|---|---|
| key | String | PK (e.g. `LOW_BALANCE_THRESHOLD`) |
| value | String | NOT NULL |
| updatedAt | DateTime | auto-updated |

**Known keys:**
| Key | Default | Meaning |
|---|---|---|
| `LOW_BALANCE_THRESHOLD` | `50` | BDT amount; LOW_BALANCE notification fires after every debit where new balance < this value |
| `SLOT_DURATION_MINS` | `30` | Global slot window duration in minutes |

**LOW_BALANCE trigger logic (in `WalletService.debit()`):**
```
1. Execute debit transaction
2. Compute new balance
3. If new balance < AppConfig.LOW_BALANCE_THRESHOLD → create Notification(LOW_BALANCE) + push
```

---

## Queue ETA Algorithm

Computed dynamically in `OrdersService.getQueueEta()`. Never stored — always fresh.

### Step 1 — Compute per-page rates for this shop
```
completedOrders = last 20 orders WHERE shopId = X AND status = READY AND colorPages > 0 OR bwPages > 0

avgMinsPerColorPage = AVG(
  (readyAt - processingStartedAt).minutes / colorPages
) WHERE colorPages > 0

avgMinsPerBWPage = AVG(
  (readyAt - processingStartedAt).minutes / bwPages
) WHERE bwPages > 0
```

**Fallback** (< 10 completed orders): use `shop.defaultProcessingMins / 10` as rate for both color and BW.

### Step 2 — Estimate time per order ahead in queue
```
for each order O ahead (status QUEUED or PROCESSING, createdAt < this order):
  estimatedMins(O) = (O.colorPages × avgMinsPerColorPage) + (O.bwPages × avgMinsPerBWPage)
```

### Step 3 — Customer ETA
```
etaMins = SUM(estimatedMins for all orders ahead) + estimatedMins(this order)
```

Emitted via `order:queue_updated` WebSocket event on every status change that affects queue position.

---

## Key Constraints Summary

| Constraint | Enforcement |
|---|---|
| Staff belongs to one shop | `User.shopId` NOT NULL for STAFF role; enforced in `StaffService.assign()` |
| Shop Owner owns one shop | `UNIQUE` on `Shop.ownerId` |
| Slot capacity | `ShopSlot.currentCount < maxOrders` checked + incremented in Prisma transaction on order creation |
| Slot capacity reduction | `maxOrders` can be set below `currentCount` — existing orders unaffected, slot closes to new bookings immediately (`currentCount >= maxOrders`) |
| Wallet debit safety | Balance re-checked inside Prisma transaction before debit insert |
| Cancel window | `OrdersService.cancel()` throws 400 if status not in `[QUEUED, SCHEDULED]` |
| Active shop required | `OrdersService.create()` throws 400 if `shop.status !== ACTIVE` |
| QUEUE requires active slot | `OrdersService.create()` with `pickupMode=QUEUE` throws 400 if no ShopSlot exists for current time window (`isOpen=true`, `currentCount < maxOrders`). Client must check `GET /shops/:id/slots/active` before showing "Print Now" button. |
| SLOT requires future slot | `slotId` must reference a slot with `today <= date <= today + 3 days`, `isOpen=true`, `currentCount < maxOrders` |
| Concurrent status advance | `PATCH /orders/:id/status` checks `expectedCurrentStatus` — returns 409 if mismatch (optimistic lock) |
| Shop resubmit guard | `ShopsService.resubmit()` throws 400 if `shop.status !== REJECTED` |
| File types | Validated server-side by MIME type before Cloudinary upload |
| Price server-only | `totalPrice`, `subtotalPrice`, `resolvedPages` never accepted from client body; always computed in `OrdersService` |
| orderNumber generation | Server generates on order creation: `"PS-" + LPAD(sequence, 5, '0')`. Sequence via Postgres sequence `order_number_seq` — `NEXTVAL('order_number_seq')`. Never gaps, never duplicates. |
| Wallet top-up limits | Min 10 BDT, max 10,000 BDT per transaction. Hardcoded in `WalletService`. Applies to both admin credit and gateway top-up. |
| Staff promotion | User must exist with role `CUSTOMER`. `POST /shops/:id/staff { userId }` → sets `user.role = STAFF`, `user.shopId = shopId`. Rejected if user already has role STAFF/SHOP_OWNER/PLATFORM_ADMIN. |
| Staff demotion | `DELETE /shops/:id/staff/:userId` → sets `user.role = CUSTOMER`, `user.shopId = null`. User returns to regular customer state. |
| Max files per order | `POST /orders` rejected with 400 if `files.length > 10` or `files.length < 1`. |
| Analytics revenue | `revenue` = SUM of `totalPrice` WHERE `status = COLLECTED` only. Cancelled orders excluded. Both CASH and WALLET payment methods included. |
| detectedPages trusted | Server re-detects pages on order creation from Cloudinary URL — client-supplied `detectedPages` used as hint only, server value wins |
| Min 1 file per order | `POST /orders` rejected with 400 if `files` array is empty |
| pageRange validation | If `pageRange` specified, all page numbers must be ≤ `detectedPages`; invalid range → 400 |
