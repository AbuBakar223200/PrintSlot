import { z } from 'zod';
import { CreateShopSchema } from './create-shop.dto';

export const UpdateShopSchema = CreateShopSchema.extend({
  defaultProcessingMins: z.number().int().positive(),
}).partial().strict();

export type UpdateShopDto = z.infer<typeof UpdateShopSchema>;
