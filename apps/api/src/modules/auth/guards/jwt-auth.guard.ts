import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * JwtAuthGuard protects routes requiring a Supabase access token.
 *
 * The token is validated by Supabase Auth, then the mirrored DB user is
 * loaded so role changes take effect without waiting for a new JWT.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly supabase: SupabaseClient;

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.supabase = createClient(
      configService.getOrThrow<string>('SUPABASE_URL'),
      configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractBearerToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException();
    }

    const { data, error } = await this.supabase.auth.getUser(token);
    if (error || !data.user?.id) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: data.user.id },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = user;
    return true;
  }

  private extractBearerToken(authorization: unknown): string | undefined {
    if (typeof authorization !== 'string') return undefined;

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) return undefined;

    return token;
  }
}
