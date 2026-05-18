import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseJwtStrategy } from './strategies/supabase-jwt.strategy';

/**
 * AuthModule — wires auth controller, service, and JWT strategy.
 *
 * PrismaService and ConfigService are global — no need to import.
 */
@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [AuthController],
  providers: [AuthService, SupabaseJwtStrategy],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
