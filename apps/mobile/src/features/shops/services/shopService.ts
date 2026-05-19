import type { Shop, ShopListResult } from '@printslot/shared';
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
};
