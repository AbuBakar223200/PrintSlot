import { z } from 'zod';

/**
 * Zod schema for POST /auth/login.
 */
export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof LoginSchema>;
