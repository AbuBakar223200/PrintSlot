import { z } from 'zod';

export const AssignStaffSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
}).strict();

export type AssignStaffDto = z.infer<typeof AssignStaffSchema>;
