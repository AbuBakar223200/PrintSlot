import { z } from 'zod';

export const ShopSlotDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date');

export const UpsertShopSlotSchema = z
  .object({
    templateId: z.string().uuid(),
    date: ShopSlotDateSchema,
    isOpen: z.boolean(),
    maxOrders: z.number().int().min(0),
  })
  .strict();

export type UpsertShopSlotDto = z.infer<typeof UpsertShopSlotSchema>;
