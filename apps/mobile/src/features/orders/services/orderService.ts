import type {
  CreateOrderInput,
  Order,
  OrderPriceResult,
  PreviewPriceInput,
} from '@printslot/shared';
import { apiFetch } from '@/services/api';

export interface OrderListResult {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const orderService = {
  listOrders(): Promise<OrderListResult> {
    return apiFetch<OrderListResult>('/orders');
  },

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

  /** Fetch a single order by id (`GET /orders/:id`). */
  getOrder(orderId: string): Promise<Order> {
    return apiFetch<Order>(`/orders/${orderId}`);
  },

  /**
   * Cancel an order the customer owns (`PATCH /orders/:id/cancel`). The server
   * permits this only while the order is QUEUED or SCHEDULED and refunds the
   * wallet automatically when the order was paid from the wallet.
   */
  cancelOrder(orderId: string): Promise<Order> {
    return apiFetch<Order>(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
    });
  },
};
