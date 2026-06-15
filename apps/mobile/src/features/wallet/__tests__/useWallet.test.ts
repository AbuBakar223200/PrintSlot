import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { walletService } from '../services/walletService';
import { useWalletBalance, useWalletTransactions } from '../hooks/useWallet';

jest.mock('@/services/api', () => ({
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;

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

describe('walletService', () => {
  it('fetches GET /wallet', async () => {
    mockApiFetch.mockResolvedValueOnce({ balance: 250 });

    await expect(walletService.getBalance()).resolves.toEqual({ balance: 250 });

    expect(mockApiFetch).toHaveBeenCalledWith('/wallet');
  });

  it('fetches GET /wallet/transactions', async () => {
    const result = { data: [], total: 0, page: 1, limit: 20 };
    mockApiFetch.mockResolvedValueOnce(result);

    await expect(walletService.getTransactions()).resolves.toEqual(result);

    expect(mockApiFetch).toHaveBeenCalledWith('/wallet/transactions');
  });
});

describe('useWalletBalance', () => {
  it('keys wallet balance separately and returns balance data', async () => {
    mockApiFetch.mockResolvedValueOnce({ balance: 250 });
    const client = createClient();
    const { result } = renderHook(() => useWalletBalance(), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(result.current.data).toEqual({ balance: 250 });
    });
    expect(client.getQueryCache().find({ queryKey: ['wallet', 'balance'] })).toBeDefined();
  });

  it('keys wallet transactions separately', async () => {
    mockApiFetch.mockResolvedValueOnce({ data: [], total: 0, page: 1, limit: 20 });
    const client = createClient();
    const { result } = renderHook(() => useWalletTransactions(), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(result.current.data).toEqual({ data: [], total: 0, page: 1, limit: 20 });
    });
    expect(client.getQueryCache().find({ queryKey: ['wallet', 'transactions'] })).toBeDefined();
  });
});
