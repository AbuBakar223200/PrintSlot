import type { Shop, ShopListResult } from '@printslot/shared';
import { apiFetch } from '@/services/api';

/** Fields the owner can edit on their shop (docs/05 — `PATCH /shops/:id`). */
export interface UpdateShopInput {
  name?: string;
  address?: string;
  phone?: string | null;
  colorRate?: number;
  bwRate?: number;
  a3Surcharge?: number;
  duplexDiscount?: number;
}

export const ownerShopService = {
  /**
   * Resolve the signed-in owner's shop. `GET /shops` is scoped server-side, but we
   * additionally filter by `ownerId` so the screen always shows the owner's own
   * shop even when the list includes others.
   */
  async getMyShop(ownerId: string): Promise<Shop | null> {
    const result = await apiFetch<ShopListResult>('/shops');
    const mine = result.items.find((s) => s.ownerId === ownerId);
    return mine ?? result.items[0] ?? null;
  },

  /** Persist owner edits (`PATCH /shops/:id`). */
  updateShop(shopId: string, input: UpdateShopInput): Promise<Shop> {
    return apiFetch<Shop>(`/shops/${shopId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  /** Resubmit a REJECTED shop for review (`PATCH /shops/:id/resubmit`). */
  resubmitShop(shopId: string): Promise<Shop> {
    return apiFetch<Shop>(`/shops/${shopId}/resubmit`, { method: 'PATCH' });
  },
};
