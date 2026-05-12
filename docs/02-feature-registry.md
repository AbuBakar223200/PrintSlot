# Feature Registry

> See also: [`CONTEXT.md`](../CONTEXT.md) — feature ownership table maps each feature to its mobile path and API module path.

**Priority legend:** P0 = must ship v1 · P1 = ship v1 but non-blocking · P2 = post-launch

| Feature | Priority | Status | Acceptance Criteria |
|---|---|---|---|
| Auth (register / login / JWT) | P0 | Not started | All 4 roles register and login. JWT validated on every protected route. Role guard blocks unauthorized access. Supabase Auth issues token; NestJS validates via `supabase-jwt.strategy.ts`. |
| User profile update | P0 | Not started | Any authed user can update `name`, `phone`, `language`, `expoPushToken` via `PATCH /users/me`. |
| Shop Owner self-registration + admin approval | P0 | Not started | Shop Owner registers with role `SHOP_OWNER` → status `PENDING`. Platform Admin approves or rejects. Push + in-app notification sent on both outcomes. |
| Shop CRUD | P0 | Not started | Shop Owner creates and edits own shop (name, address, phone, pricing rates). Platform Admin views and manages all shops. Customer/Staff can list and view active shops. |
| Staff assignment | P0 | Not started | Shop Owner assigns existing Customer-role users as Staff to own shop only. Staff belongs to exactly one shop. |
| Print file upload | P0 | Not started | Accepts PDF, DOCX, PPTX, XLS, XLSX, JPG, JPEG, PNG. Rejects all other types with 400. Max 20 MB. File stored on Cloudinary. URL returned to client. |
| Print configuration | P0 | Not started | Customer sets: color mode (COLOR/BW), paper size (A4/A3/LETTER), orientation (PORTRAIT/LANDSCAPE), copies (int ≥ 1), page range (nullable string e.g. "1-5"), duplex (bool). All 6 options required on order create. |
| Automatic price calculation | P0 | Not started | Price = pages × copies × color rate (or BW rate) × paper surcharge × duplex discount. Rates set per shop by Shop Owner. Price calculated server-side and returned before order confirmed. |
| Order placement — queue mode | P0 | Not started | Customer chooses "Print Now". Order created with `pickupMode: QUEUE`, status `QUEUED`. Customer sees queue position # and ETA on order detail screen. |
| Order placement — slot mode | P0 | Not started | Customer chooses "Schedule Pickup". Sees only open, non-full slots for selected date. Selects slot. Order created with `pickupMode: SLOT`, status `SCHEDULED`, `slotId` set. `ShopSlot.currentCount` incremented atomically. |
| Wallet deduction on order (wallet pay) | P0 | Not started | On order placed with `paymentMethod: WALLET`: balance checked inside DB transaction. If sufficient, deducted. If insufficient, order rejected with 402. Push notification sent for deduction. |
| Cash payment option | P0 | Not started | Customer selects `paymentMethod: CASH`. Order placed without wallet deduction. Staff marks payment received when order status set to `COLLECTED`. |
| Order cancellation | P0 | Not started | Customer can cancel only when `status IN (QUEUED, SCHEDULED)`. If `paymentMethod: WALLET`, refund credited automatically via `WalletTransaction`. `ShopSlot.currentCount` decremented if slot order. Push notification sent. |
| Real-time order tracking | P0 | Not started | Status changes emitted via socket.io `order:status_changed` event. Customer joins room `order:{orderId}` on detail screen. `StatusBadge` updates without refresh. TanStack Query polls `/orders/:id` every 30s as fallback. Offline: last cached status shown + disconnect banner. |
| Staff job dashboard | P0 | Not started | Staff sees unified job list for own shop: slot orders first (by slot time), then queue orders (by `createdAt`). Staff advances status: `QUEUED/SCHEDULED → PROCESSING → READY → COLLECTED`. Each advance emits WebSocket event and push notification to customer. |
| Push + in-app notifications (12 events) | P0 | Not started | Events: ORDER_PLACED, ORDER_ACCEPTED, ORDER_READY, ORDER_CANCELLED, NEW_ORDER (staff), WALLET_TOPUP, WALLET_DEDUCTED, SHOP_APPROVED, SHOP_REJECTED, SHOP_SUSPENDED, STAFF_ASSIGNED, LOW_BALANCE. Each event creates `Notification` record + sends Expo push to all UserDevice rows for that user. |
| Notification list screen | P0 | Not started | Customer sees paginated list of own notifications. Can mark individual or all as read. |
| Order history | P0 | Not started | Customer sees paginated list of all own orders with status, date, shop name, total price. |
| Wallet balance + transaction history | P0 | Not started | Customer views current balance (sum of all transactions). Paginated transaction list with type, amount, reason, date. |
| Wallet top-up — admin credit | P0 | Not started | Shop Owner or Platform Admin can credit any customer's wallet. Transaction logged as `TOPUP_ADMIN`. Push notification sent to customer. |
| Slot template management | P0 | Not started | Platform Admin creates/edits global slot templates (startTime, endTime, durationMins). These are the available windows shops can open. |
| Shop slot management | P0 | Not started | Shop Owner opens/closes individual slots per date. Sets `maxOrders` per slot. Customer only sees `isOpen: true` slots where `currentCount < maxOrders`. |
| Receipt — in-app view | P0 | Not started | Order detail screen shows full receipt: order ID, shop, file name, print config, total price, payment method, timestamp. |
| Receipt — PDF export | P1 | Not started | Customer can download receipt as PDF from order detail screen. |
| Receipt — share as image | P1 | Not started | Customer can share receipt as image (screenshot-to-share or generated image). |
| Wallet top-up — payment gateway | P1 | Not started | Customer initiates top-up via bKash or card. Redirected to payment URL. On callback success, wallet credited as `TOPUP_GATEWAY`. Isolated to `POST /wallet/topup/gateway` — does not block other features. |
| Basic analytics — Shop Owner | P1 | Not started | Shop Owner dashboard shows: total orders today, revenue today, orders by status (counts), average processing time (mins). Scoped to own shop. |
| Basic analytics — Platform Admin | P1 | Not started | Platform Admin dashboard shows: total active shops, total platform orders, revenue per shop (table), pending approval count. |
| i18n — English + Bengali | P1 | Not started | All UI strings externalized to i18n keys. Language toggle in settings screen. Default language: English. No hardcoded strings in components. |
| Offline cache fallback | P1 | Not started | TanStack Query stale cache shown when network unavailable. Disconnect banner rendered. All mutation actions (order, wallet, cancel) blocked with offline error. |
