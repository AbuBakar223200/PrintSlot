import { NotificationType } from '@printslot/shared';
import { apiFetch } from '@/services/api';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  orderId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResult {
  data: NotificationItem[];
  total: number;
  page: number;
  limit: number;
}

export const notificationService = {
  list(): Promise<NotificationsResult> {
    return apiFetch<NotificationsResult>('/notifications?page=1&limit=50');
  },

  markRead(id: string): Promise<NotificationItem> {
    return apiFetch<NotificationItem>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllRead(): Promise<{ success: true }> {
    return apiFetch<{ success: true }>('/notifications/read-all', {
      method: 'PATCH',
    });
  },
};
