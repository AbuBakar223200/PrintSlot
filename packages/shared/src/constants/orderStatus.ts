/**
 * Order status state machine.
 *
 * Valid transitions:
 *   QUEUED     → PROCESSING → READY → COLLECTED   (queue mode, staff-driven)
 *   SCHEDULED  → PROCESSING → READY → COLLECTED   (slot mode, staff-driven)
 *   QUEUED     → CANCELLED                         (customer only)
 *   SCHEDULED  → CANCELLED                         (customer only)
 */
export enum OrderStatus {
  QUEUED = 'QUEUED',
  SCHEDULED = 'SCHEDULED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  COLLECTED = 'COLLECTED',
  CANCELLED = 'CANCELLED',
}

/**
 * Notification event types — all 12 documented events.
 */
export enum NotificationType {
  ORDER_PLACED = 'ORDER_PLACED',
  ORDER_ACCEPTED = 'ORDER_ACCEPTED',
  ORDER_READY = 'ORDER_READY',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  NEW_ORDER = 'NEW_ORDER',
  WALLET_TOPUP = 'WALLET_TOPUP',
  WALLET_DEDUCTED = 'WALLET_DEDUCTED',
  SHOP_APPROVED = 'SHOP_APPROVED',
  SHOP_REJECTED = 'SHOP_REJECTED',
  SHOP_SUSPENDED = 'SHOP_SUSPENDED',
  STAFF_ASSIGNED = 'STAFF_ASSIGNED',
  LOW_BALANCE = 'LOW_BALANCE',
}
