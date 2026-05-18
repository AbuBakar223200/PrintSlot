import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * JWT payload shape from Supabase Auth tokens.
 */
interface JwtPayload {
  sub: string;
  email: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * Supabase JWT strategy for Passport.
 *
 * Validates the JWT signature against JWT_SECRET,
 * then queries the DB for the full User row.
 *
 * Per ADR-002: role is read from DB on every request,
 * NOT from JWT claims. This ensures role changes
 * (promote, demote, suspend) take effect immediately.
 */
@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Called after JWT signature is verified.
   * Returns the full User row from DB — attached to request.user.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
