import { useQuery } from '@tanstack/react-query';
import { walletService } from '@/features/wallet/services/walletService';

export function useWalletBalance() {
  return useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => walletService.getBalance(),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
