import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShopStatus, type Shop } from '@printslot/shared';
import { apiFetch } from '@/services/api';
import { shopService } from '../services/shopService';
import { useShops } from '../hooks/useShops';

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;

const shop: Shop = {
  id: 'shop-1',
  name: 'Library Print',
  address: 'Campus gate',
  phone: null,
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

describe('shopService.listShops', () => {
  it('calls GET /shops with no query string when search is empty', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [shop], total: 1, page: 1, limit: 20 });

    await expect(shopService.listShops()).resolves.toEqual([shop]);

    expect(mockApiFetch).toHaveBeenCalledWith('/shops');
  });

  it('calls GET /shops?search=lib when search is provided', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [shop], total: 1, page: 1, limit: 20 });

    await expect(shopService.listShops('lib')).resolves.toEqual([shop]);

    expect(mockApiFetch).toHaveBeenCalledWith('/shops?search=lib');
  });
});

describe('useShops', () => {
  it('uses a query key scoped by search term', async () => {
    mockApiFetch.mockResolvedValueOnce({ items: [shop], total: 1, page: 1, limit: 20 });
    const client = createClient();

    const { result } = renderHook(() => useShops('lib'), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(result.current.data).toEqual([shop]);
    });
    expect(client.getQueryCache().find({ queryKey: ['shops', 'lib'] })).toBeDefined();
  });
});
