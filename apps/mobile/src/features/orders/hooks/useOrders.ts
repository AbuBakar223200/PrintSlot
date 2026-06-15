import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateOrderInput, PreviewPriceInput } from '@printslot/shared';
import { orderService } from '@/features/orders/services/orderService';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => orderService.listOrders(),
  });
}

export function usePreviewPrice() {
  return useMutation({
    mutationFn: (input: PreviewPriceInput) => orderService.previewPrice(input),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => orderService.createOrder(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet', 'balance'] }),
      ]);
    },
  });
}
