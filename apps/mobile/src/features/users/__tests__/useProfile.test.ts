// useAuthStore transitively imports expo-secure-store via zustand persist;
// mock it before any import resolves the store.
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateProfile } from '../hooks/useProfile';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { usersApi } from '../services/usersApi';

jest.mock('../services/usersApi', () => ({
  usersApi: {
    updateProfile: jest.fn(),
  },
}));

const mockUpdateProfile = usersApi.updateProfile as jest.Mock;

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

function createTestClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: 0, gcTime: Infinity },
      mutations: { retry: 0, gcTime: Infinity },
    },
  });
  jest.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined as never);
  return client;
}

beforeEach(() => {
  mockUpdateProfile.mockReset();
  useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false, isHydrated: true });
});

describe('useUpdateProfile', () => {
  it('fires PATCH /users/me via usersApi.updateProfile', async () => {
    mockUpdateProfile.mockResolvedValueOnce({ id: 'u1', name: 'Jane' });
    const client = createTestClient();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Jane' });
    });

    expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Jane' });
  });

  it('calls authStore.updateUser with the returned user on success', async () => {
    mockUpdateProfile.mockResolvedValueOnce({ id: 'u1', name: 'Jane' });
    const client = createTestClient();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Jane' });
    });

    await waitFor(() => {
      expect(useAuthStore.getState().user).toMatchObject({ id: 'u1', name: 'Jane' });
    });
  });

  it('invalidates the [auth, me] query on success', async () => {
    mockUpdateProfile.mockResolvedValueOnce({ id: 'u1', name: 'Jane' });
    const client = createTestClient();
    const invalidateSpy = client.invalidateQueries as jest.Mock;
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper(client) });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Jane' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] });
  });

  it('exposes error and leaves authStore.user unchanged on API failure', async () => {
    const startingUser = { id: 'u1', name: 'Old', email: 'a@a', phone: null, role: 'CUSTOMER', shopId: null, language: 'EN', createdAt: '', updatedAt: '' };
    useAuthStore.setState({ user: startingUser as never, isAuthenticated: true });
    mockUpdateProfile.mockRejectedValueOnce(new Error('Boom'));

    const client = createTestClient();
    const { result } = renderHook(() => useUpdateProfile(), { wrapper: wrapper(client) });

    await act(async () => {
      try { await result.current.mutateAsync({ name: 'Jane' }); } catch { /* expected */ }
    });

    expect(useAuthStore.getState().user).toEqual(startingUser);
    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });
  });
});
