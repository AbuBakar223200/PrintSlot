import type { Slot } from '@printslot/shared';
import { apiFetch } from '@/services/api';

function openSlotsPath(shopId: string, date: string): string {
  const params = new URLSearchParams({ date });
  return `/shops/${shopId}/slots?${params.toString()}`;
}

export const slotsApi = {
  getOpenSlots(shopId: string, date: string): Promise<Slot[]> {
    return apiFetch<Slot[]>(openSlotsPath(shopId, date));
  },
};
