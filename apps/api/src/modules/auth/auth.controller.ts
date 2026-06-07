import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterSchema, RegisterDto } from './dto/register.dto';
import { LoginSchema, LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { User, AuthResponse } from '@printslot/shared';

/**
 * AuthController — registration, login, and current user retrieval.
 *
 * Per coding standard:
 * - Controllers route and delegate only. No business logic.
 * - ResponseInterceptor wraps the return value automatically.
 * - ZodValidationPipe validates DTOs — not class-validator.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Public — no auth required.
   * CUSTOMER, STAFF, and SHOP_OWNER can self-register.
   */
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema)) dto: RegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  /**
   * POST /auth/login
   * Public — no auth required.
   */
  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) dto: LoginDto,
  ): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me
   * Authenticated — requires valid JWT.
   * Returns the current user from DB (with fresh role).
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: User): Promise<User> {
    return this.authService.getMe(user.id);
  }
}
