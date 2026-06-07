import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiFetch } from '@/services/api';
import { walletService } from '../services/walletService';
import { useWalletBalance } from '../hooks/useWallet';

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
  it('fetches GET /wallet/balance', async () => {
    mockApiFetch.mockResolvedValueOnce({ balance: 250 });

    await expect(walletService.getBalance()).resolves.toEqual({ balance: 250 });

    expect(mockApiFetch).toHaveBeenCalledWith('/wallet/balance');
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
});
