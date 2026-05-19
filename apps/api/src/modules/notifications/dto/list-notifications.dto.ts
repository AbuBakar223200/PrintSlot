import { z } from 'zod';

export const ListNotificationsSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().min(1).max(100)),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

export type ListNotificationsDto = z.infer<typeof ListNotificationsSchema>;
