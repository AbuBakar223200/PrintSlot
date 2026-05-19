import { z } from 'zod';

export const CreateShopSchema = z.object({
  name: z.string().trim().min(1),
  address: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
  colorRate: z.number().positive(),
  bwRate: z.number().positive(),
  a3Surcharge: z.number().min(0),
  duplexDiscount: z.number().min(0).max(1),
}).strict();

export type CreateShopDto = z.infer<typeof CreateShopSchema>;
