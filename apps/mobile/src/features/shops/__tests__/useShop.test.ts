import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShopStatus, type Shop, type ShopSlot } from '@printslot/shared';
import { apiFetch } from '@/services/api';
import { shopService } from '../services/shopService';
import { useShop, useActiveSlot } from '../hooks/useShop';

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;

const shop: Shop = {
  id: 'shop-1',
  name: 'Library Print',
  address: 'Campus gate',
  phone: '01700000000',
  status: ShopStatus.ACTIVE,
  rejectionReason: null,
  ownerId: 'owner-1',
  colorRate: 10,
  bwRate: 3,
  a3Surcharge: 5,
  duplexDiscount: 0.8,
  defaultProcessingMins: 15,
  createdAt: '2026-05-19T00:00:00.000Z',
  updatedAt: '2026-05-19T00:00:00.000Z',
};

const slot: ShopSlot = {
  id: 'slot-1',
  shopId: 'shop-1',
  templateId: 'tmpl-1',
  date: '2026-05-20',
  isOpen: true,
  maxOrders: 10,
  currentCount: 2,
};

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client }, children)
  );
}

beforeEach(() => {
  mockApiFetch.mockReset();
});

describe('shopService.getShop', () => {
  it('calls GET /shops/:id', async () => {
    mockApiFetch.mockResolvedValueOnce(shop);

    await expect(shopService.getShop('shop-1')).resolves.toEqual(shop);

    expect(mockApiFetch).toHaveBeenCalledWith('/shops/shop-1');
  });
});

describe('shopService.getActiveSlot', () => {
  it('calls GET /shops/:id/slots/active', async () => {
    mockApiFetch.mockResolvedValueOnce(slot);

    await expect(shopService.getActiveSlot('shop-1')).resolves.toEqual(slot);

    expect(mockApiFetch).toHaveBeenCalledWith('/shops/shop-1/slots/active');
  });

  it('returns null when the endpoint errors (404/500) instead of throwing', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Not Found'));

    await expect(shopService.getActiveSlot('shop-1')).resolves.toBeNull();
  });
});

describe('useShop / useActiveSlot', () => {
  it('useShop fetches the shop and keys by shopId', async () => {
    mockApiFetch.mockResolvedValueOnce(shop);
    const client = createClient();

    const { result } = renderHook(() => useShop('shop-1'), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(result.current.data).toEqual(shop);
    });
    expect(client.getQueryCache().find({ queryKey: ['shops', 'shop-1'] })).toBeDefined();
  });

  it('useActiveSlot is keyed separately from the shop query', async () => {
    mockApiFetch.mockResolvedValueOnce(slot);
    const client = createClient();

    const { result } = renderHook(() => useActiveSlot('shop-1'), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(result.current.data).toEqual(slot);
    });
    expect(
      client.getQueryCache().find({ queryKey: ['shops', 'shop-1', 'active-slot'] }),
    ).toBeDefined();
    expect(mockApiFetch).toHaveBeenCalledWith('/shops/shop-1/slots/active');
  });
});
