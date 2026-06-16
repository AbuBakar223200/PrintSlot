import { apiFetch } from '@/services/api';

/** One row of the platform revenue-per-shop breakdown. */
export interface PlatformShopRevenue {
  shopId: string;
  name: string;
  revenue: number;
  totalOrders: number;
}

/**
 * Shape of `GET /admin/analytics` (the live API response — wins over docs/05).
 * The controller returns `activeShops` + `totalRevenue` in addition to the
 * documented fields.
 */
export interface PlatformAnalytics {
  totalShops: number;
  activeShops: number;
  pendingApprovals: number;
  totalOrders: number;
  totalRevenue: number;
  revenuePerShop: PlatformShopRevenue[];
}

export const adminAnalyticsService = {
  /** Fetch platform-wide analytics (`GET /admin/analytics`). */
  getAnalytics(): Promise<PlatformAnalytics> {
    return apiFetch<PlatformAnalytics>('/admin/analytics');
  },
};
