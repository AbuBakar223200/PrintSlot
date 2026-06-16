import type { Shop } from '@printslot/shared';
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

/** Fields required to create/request a shop (docs/05 — `POST /shops`). */
export interface CreateShopInput {
  name: string;
  address: string;
  phone?: string;
  colorRate: number;
  bwRate: number;
  a3Surcharge: number;
  duplexDiscount: number;
}

export const ownerShopService = {
  /**
   * Resolve the signed-in owner's own shop regardless of status (`GET /shops/mine`).
   * Returns `null` when the owner has not created a shop yet — the screen then shows
   * the create/request form. (`ownerId` argument kept for the query key only.)
   */
  getMyShop(_ownerId: string): Promise<Shop | null> {
    return apiFetch<Shop | null>('/shops/mine');
  },

  /** Create and request a new shop — starts PENDING admin approval (`POST /shops`). */
  createShop(input: CreateShopInput): Promise<Shop> {
    return apiFetch<Shop>('/shops', {
      method: 'POST',
      body: JSON.stringify(input),
    });
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
