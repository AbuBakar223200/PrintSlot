import { ShopStatus, type Shop, type ShopListResult } from '@printslot/shared';
import { apiFetch } from '@/services/api';

/**
 * Body for `PATCH /shops/:id/status` (docs/05 — Shops).
 * Admin may move a shop to ACTIVE, REJECTED, or SUSPENDED. `rejectionReason` is
 * required for REJECTED (≥5 chars enforced in the UI / ≥1 on the server).
 */
export interface UpdateShopStatusInput {
  shopId: string;
  status: ShopStatus.ACTIVE | ShopStatus.REJECTED | ShopStatus.SUSPENDED;
  rejectionReason?: string;
}

export const adminShopService = {
  /**
   * Every shop in the platform (`GET /shops` — PLATFORM_ADMIN sees all). The
   * approval queue filters this client-side by status (PENDING vs ALL).
   */
  async listShops(): Promise<Shop[]> {
    const result = await apiFetch<ShopListResult>('/shops');
    return result.items;
  },

  /** Transition a shop's status (`PATCH /shops/:id/status`). */
  updateStatus({ shopId, status, rejectionReason }: UpdateShopStatusInput): Promise<Shop> {
    return apiFetch<Shop>(`/shops/${shopId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(
        rejectionReason ? { status, rejectionReason } : { status },
      ),
    });
  },
};
