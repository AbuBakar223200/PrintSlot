import { OrderStatus } from '@printslot/shared';

/**
 * Staff status state machine — mirrors the prototype `NEXT_STATUS` map.
 *
 *   QUEUED    → PROCESSING → READY → COLLECTED
 *   SCHEDULED → PROCESSING → READY → COLLECTED
 *
 * COLLECTED / CANCELLED are terminal (no next status).
 */
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  [OrderStatus.QUEUED]: OrderStatus.PROCESSING,
  [OrderStatus.SCHEDULED]: OrderStatus.PROCESSING,
  [OrderStatus.PROCESSING]: OrderStatus.READY,
  [OrderStatus.READY]: OrderStatus.COLLECTED,
};

/** The next status a staff member can advance an order to, or `null` if terminal. */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  return NEXT_STATUS[current] ?? null;
}

/**
 * i18n key for the advance-action button label, keyed off the *current* status:
 *   QUEUED/SCHEDULED → staff.startProcessing
 *   PROCESSING       → staff.markReady
 *   READY            → staff.markCollected
 */
export function advanceLabelKey(current: OrderStatus): string | null {
  switch (current) {
    case OrderStatus.QUEUED:
    case OrderStatus.SCHEDULED:
      return 'staff.startProcessing';
    case OrderStatus.PROCESSING:
      return 'staff.markReady';
    case OrderStatus.READY:
      return 'staff.markCollected';
    default:
      return null;
  }
}
