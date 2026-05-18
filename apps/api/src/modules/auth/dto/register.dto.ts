import { z } from 'zod';

/**
 * Zod schema for POST /auth/register.
 *
 * Only CUSTOMER and SHOP_OWNER can self-register.
 * STAFF is promoted by Shop Owner. PLATFORM_ADMIN is seeded.
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'SHOP_OWNER'], {
    errorMap: () => ({ message: 'Role must be CUSTOMER or SHOP_OWNER' }),
  }),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
