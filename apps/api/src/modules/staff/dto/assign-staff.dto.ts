import { z } from 'zod';

export const AssignStaffSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
}).strict();

export type AssignStaffDto = z.infer<typeof AssignStaffSchema>;
