import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
  });
}

export function useUnreadCount() {
  const query = useNotifications();
  return query.data?.data.filter((item) => !item.read).length ?? 0;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
