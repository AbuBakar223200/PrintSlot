import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client with sensible defaults for mobile.
 *
 * - staleTime: 30s — avoid re-fetching on every screen focus
 * - retry: 2 — mobile networks are flaky
 * - gcTime: 5 minutes — keep inactive data in memory briefly
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
