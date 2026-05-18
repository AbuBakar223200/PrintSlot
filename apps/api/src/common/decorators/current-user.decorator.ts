import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 *
 * Usage:
 * ```
 * @Get()
 * getMe(@CurrentUser() user: User) { return user; }
 * ```
 *
 * Per coding standard: never use @Req() req directly.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
