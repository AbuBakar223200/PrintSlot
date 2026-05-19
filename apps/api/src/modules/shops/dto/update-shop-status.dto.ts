import { z } from 'zod';
import { ShopStatus } from '@printslot/shared';

export const UpdateShopStatusSchema = z.object({
  status: z.nativeEnum(ShopStatus),
  rejectionReason: z.string().trim().min(1).optional(),
}).strict();

export type UpdateShopStatusDto = z.infer<typeof UpdateShopStatusSchema>;
