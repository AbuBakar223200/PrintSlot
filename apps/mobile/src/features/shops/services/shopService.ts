import type { Shop, ShopListResult, ShopSlot } from '@printslot/shared';
import { apiFetch } from '@/services/api';

function shopsPath(search?: string) {
  if (!search) {
    return '/shops';
  }

  const params = new URLSearchParams({ search });
  return `/shops?${params.toString()}`;
}

export const shopService = {
  async listShops(search?: string): Promise<Shop[]> {
    const result = await apiFetch<ShopListResult>(shopsPath(search));
    return result.items;
  },

  async getShop(id: string): Promise<Shop> {
    return apiFetch<Shop>(`/shops/${id}`);
  },

  async getActiveSlot(shopId: string): Promise<ShopSlot | null> {
    try {
      return await apiFetch<ShopSlot | null>(`/shops/${shopId}/slots/active`);
    } catch {
      // Active-slot availability must never block the screen.
      return null;
    }
  },
};
