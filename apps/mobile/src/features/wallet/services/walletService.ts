import type { WalletBalance } from '@printslot/shared';
import { apiFetch } from '@/services/api';

export const walletService = {
  getBalance(): Promise<WalletBalance> {
    return apiFetch<WalletBalance>('/wallet/balance');
  },
};
