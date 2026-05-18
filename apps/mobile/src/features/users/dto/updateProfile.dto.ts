import { z } from 'zod';

/**
 * Client-side validation for profile update input.
 *
 * Medium strictness: matches the server-side .strict() shape from
 * Slice 02 enough to fail fast on the device. This is a UX safeguard,
 * not a security boundary — Prisma's parameterized queries are the
 * actual defense against injection, and the server has its own
 * .strict() Zod schema that remains the authoritative validation.
 *
 * No `language` field — deferred to Slice 33 (i18n).
 */
export const UpdateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
    phone: z
      .string()
      .trim()
      .max(20, 'Phone is too long')
      .optional()
      .or(z.literal('').transform(() => undefined)),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
