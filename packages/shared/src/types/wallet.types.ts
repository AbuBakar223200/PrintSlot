import type { TransactionType, TransactionReason } from '../constants/roles';

export interface WalletBalance {
  balance: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  reason: TransactionReason;
  orderId: string | null;
  createdAt: string;
}

export interface WalletTransactionsResult {
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
}
