import { z } from 'zod';

export const UpdateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    phone: z.string().optional(),
    language: z.enum(['EN', 'BN']).optional(),
  })
  .strict();

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
