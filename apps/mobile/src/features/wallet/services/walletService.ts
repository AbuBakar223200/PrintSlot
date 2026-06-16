import type { WalletBalance, WalletTransactionsResult } from '@printslot/shared';
import { apiFetch } from '@/services/api';

export const walletService = {
  getBalance(): Promise<WalletBalance> {
    return apiFetch<WalletBalance>('/wallet');
  },

  getTransactions(): Promise<WalletTransactionsResult> {
    return apiFetch<WalletTransactionsResult>('/wallet/transactions');
  },
};
