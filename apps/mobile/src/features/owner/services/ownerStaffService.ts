import type { User } from '@printslot/shared';
import { apiFetch } from '@/services/api';

export const ownerStaffService = {
  /** List the shop's staff members (`GET /shops/:id/staff`). */
  listStaff(shopId: string): Promise<User[]> {
    return apiFetch<User[]>(`/shops/${shopId}/staff`);
  },

  /** Promote a customer (by email) to staff at this shop (`POST /shops/:id/staff`). */
  addStaff(shopId: string, email: string): Promise<User> {
    return apiFetch<User>(`/shops/${shopId}/staff`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /** Demote a staff member back to a customer (`DELETE /shops/:id/staff/:userId`). */
  removeStaff(shopId: string, userId: string): Promise<{ success: boolean }> {
    return apiFetch<{ success: boolean }>(`/shops/${shopId}/staff/${userId}`, {
      method: 'DELETE',
    });
  },
};
