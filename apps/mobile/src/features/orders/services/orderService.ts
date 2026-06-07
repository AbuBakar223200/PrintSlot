import type {
  CreateOrderInput,
  Order,
  OrderPriceResult,
  PreviewPriceInput,
} from '@printslot/shared';
import { apiFetch } from '@/services/api';

export const orderService = {
  previewPrice(input: PreviewPriceInput): Promise<OrderPriceResult> {
    return apiFetch<OrderPriceResult>('/orders/preview-price', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  createOrder(input: CreateOrderInput): Promise<Order> {
    return apiFetch<Order>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
};
