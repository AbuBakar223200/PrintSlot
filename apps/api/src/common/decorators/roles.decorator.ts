import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles() — sets allowed roles metadata for RolesGuard.
 *
 * Usage:
 * ```
 * @Roles(Role.CUSTOMER)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * create(@CurrentUser() user: User) { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
