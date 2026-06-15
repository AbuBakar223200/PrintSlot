import type { Order, OrderStatus } from '@printslot/shared';
import { apiFetch } from '@/services/api';

/**
 * A staff-facing print job. Server returns the shared `Order` shape from
 * `GET /shops/:id/orders`; for the counter view the API may additionally attach
 * the customer's name/phone and the resolved slot window. These extras are
 * optional so the screens degrade gracefully when they are absent.
 */
export interface StaffJob extends Order {
  customerName?: string | null;
  customerPhone?: string | null;
  /** Resolved slot window label, e.g. "10:00–10:30" (SLOT mode only). */
  slotTime?: string | null;
}

/** Shape of `GET /shops/:id/orders` (docs/05 — `{ items, total, page, limit }`). */
export interface StaffJobListResult {
  items: StaffJob[];
  total: number;
  page: number;
  limit: number;
}

/** Active job states a staff member can act on (queue + slot pipelines). */
export const STAFF_ACTIVE_STATUSES = [
  'QUEUED',
  'SCHEDULED',
  'PROCESSING',
  'READY',
] as const;

export interface AdvanceStatusInput {
  orderId: string;
  status: OrderStatus;
  expectedCurrentStatus: OrderStatus;
}

function jobsPath(shopId: string): string {
  // Active states only — the counter never shows COLLECTED/CANCELLED jobs.
  const params = new URLSearchParams();
  for (const status of STAFF_ACTIVE_STATUSES) {
    params.append('status', status);
  }
  return `/shops/${shopId}/orders?${params.toString()}`;
}

export const staffJobService = {
  /** List active jobs at the staff member's shop. */
  async listJobs(shopId: string): Promise<StaffJob[]> {
    const result = await apiFetch<StaffJobListResult>(jobsPath(shopId));
    return result.items;
  },

  /** Fetch a single job by order id (`GET /orders/:id`). */
  getJob(orderId: string): Promise<StaffJob> {
    return apiFetch<StaffJob>(`/orders/${orderId}`);
  },

  /**
   * Advance an order's status with an optimistic lock. The server applies the
   * change only when `expectedCurrentStatus` still matches the DB row, returning
   * 409 otherwise (two staff tapped at once).
   */
  advanceStatus({ orderId, status, expectedCurrentStatus }: AdvanceStatusInput): Promise<StaffJob> {
    return apiFetch<StaffJob>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, expectedCurrentStatus }),
    });
  },
};
