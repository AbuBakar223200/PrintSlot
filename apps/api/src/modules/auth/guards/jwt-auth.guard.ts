import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects routes requiring authentication.
 *
 * Usage:
 * ```
 * @UseGuards(JwtAuthGuard)
 * @Get()
 * getMe(@CurrentUser() user: User) { ... }
 * ```
 *
 * Returns 401 on missing or expired JWT.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
