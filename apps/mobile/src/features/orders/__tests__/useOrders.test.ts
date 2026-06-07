import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ColorMode,
  Orientation,
  PaperSize,
  PaymentMethod,
  PickupMode,
  type CreateOrderInput,
  type Order,
  OrderStatus,
} from '@printslot/shared';
import { useCreateOrder, usePreviewPrice } from '../hooks/useOrders';
import { orderService } from '../services/orderService';

jest.mock('../services/orderService', () => ({
  orderService: {
    previewPrice: jest.fn(),
    createOrder: jest.fn(),
  },
}));

const mockPreviewPrice = orderService.previewPrice as jest.Mock;
const mockCreateOrder = orderService.createOrder as jest.Mock;

const createInput: CreateOrderInput = {
  shopId: '11111111-1111-4111-8111-111111111111',
  pickupMode: PickupMode.QUEUE,
  paymentMethod: PaymentMethod.CASH,
  files: [
    {
      fileUrl: 'https://cdn.test/doc.pdf',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      detectedPages: 5,
      colorMode: ColorMode.BW,
      paperSize: PaperSize.A4,
      orientation: Orientation.PORTRAIT,
      copies: 1,
      duplex: false,
      pageRange: null,
    },
  ],
};

const order: Order = {
  id: 'order-1',
  orderNumber: 'PS-00001',
  customerId: 'customer-1',
  shopId: createInput.shopId,
  pickupMode: PickupMode.QUEUE,
  slotId: 'slot-1',
  status: OrderStatus.QUEUED,
  paymentMethod: PaymentMethod.CASH,
  totalPages: 5,
  colorPages: 0,
  bwPages: 5,
  totalPrice: 15,
  processingStartedAt: null,
  readyAt: null,
  cancelledAt: null,
  createdAt: '2026-06-07T00:00:00.000Z',
  updatedAt: '2026-06-07T00:00:00.000Z',
  orderFiles: [],
};

function createClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined as never);
  return client;
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client }, children)
  );
}

beforeEach(() => {
  mockPreviewPrice.mockReset();
  mockCreateOrder.mockReset();
});

describe('order hooks', () => {
  it('usePreviewPrice calls orderService.previewPrice', async () => {
    mockPreviewPrice.mockResolvedValueOnce({ totalPrice: 15, files: [] });
    const client = createClient();
    const { result } = renderHook(() => usePreviewPrice(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ shopId: createInput.shopId, files: [] });
    });

    expect(mockPreviewPrice).toHaveBeenCalledWith({ shopId: createInput.shopId, files: [] });
  });

  it('useCreateOrder invalidates orders and wallet balance on success', async () => {
    mockCreateOrder.mockResolvedValueOnce(order);
    const client = createClient();
    const invalidateSpy = client.invalidateQueries as jest.Mock;
    const { result } = renderHook(() => useCreateOrder(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync(createInput);
    });

    expect(mockCreateOrder).toHaveBeenCalledWith(createInput);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['orders'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['wallet', 'balance'] });
  });

  it('useCreateOrder rethrows service errors', async () => {
    const error = Object.assign(new Error('Insufficient wallet balance'), { statusCode: 402 });
    mockCreateOrder.mockRejectedValueOnce(error);
    const client = createClient();
    const { result } = renderHook(() => useCreateOrder(), { wrapper: wrapper(client) });

    await expect(result.current.mutateAsync(createInput)).rejects.toMatchObject({
      message: 'Insufficient wallet balance',
      statusCode: 402,
    });
  });
});
