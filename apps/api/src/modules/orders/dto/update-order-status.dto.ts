import { z } from 'zod';
import { OrderStatus } from '@printslot/shared';

export const UpdateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
  expectedCurrentStatus: z.nativeEnum(OrderStatus),
}).strict();

export type UpdateOrderStatusDto = z.infer<typeof UpdateOrderStatusSchema>;
