import { z } from 'zod';
import {
  REGISTERABLE_ROLES,
  REGISTER_NAME_MAX_LENGTH,
  REGISTER_PASSWORD_MIN_LENGTH,
} from '@printslot/shared';

/**
 * Zod schema for POST /auth/register.
 *
 * Only CUSTOMER and SHOP_OWNER can self-register.
 * STAFF is promoted by Shop Owner. PLATFORM_ADMIN is seeded.
 */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(
      REGISTER_PASSWORD_MIN_LENGTH,
      `Password must be at least ${REGISTER_PASSWORD_MIN_LENGTH} characters`,
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(REGISTER_NAME_MAX_LENGTH, 'Name too long'),
  phone: z.string().optional(),
  role: z.enum(REGISTERABLE_ROLES, {
    errorMap: () => ({ message: 'Role must be CUSTOMER or SHOP_OWNER' }),
  }),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
