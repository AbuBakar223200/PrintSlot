import { z } from 'zod';

export const TopupWalletSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().min(10, 'Top-up amount must be at least 10 BDT').max(10000, 'Top-up amount cannot exceed 10000 BDT'),
}).strict();

export type TopupWalletDto = z.infer<typeof TopupWalletSchema>;
