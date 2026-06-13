import type { OrderStatus } from '@printslot/shared';
import { apiFetch } from '@/services/api';

/** Status → count map from the analytics endpoint (active + terminal states). */
export type OwnerStatusBreakdown = Partial<Record<OrderStatus, number>>;

/** Shape of `GET /shops/:id/analytics` (docs/05 — Analytics). */
export interface OwnerAnalytics {
  totalOrders: number;
  revenue: number;
  avgProcessingMins: number;
  byStatus: OwnerStatusBreakdown;
}

export const ownerAnalyticsService = {
  /** Fetch the owner's shop analytics (`GET /shops/:id/analytics`). */
  getAnalytics(shopId: string): Promise<OwnerAnalytics> {
    return apiFetch<OwnerAnalytics>(`/shops/${shopId}/analytics`);
  },
};
