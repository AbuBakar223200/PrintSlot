import type { User } from '@prisma/client';

/**
 * Augment Express Request to include the authenticated user.
 * Attached by JwtAuthGuard + SupabaseJwtStrategy.
 */
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
