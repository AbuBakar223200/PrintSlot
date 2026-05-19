import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — singleton database client.
 *
 * Injected into all service classes. Never instantiate PrismaClient directly.
 * Per coding standard: always use `tx` param inside $transaction callbacks.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    super(
      databaseUrl
        ? {
            datasources: {
              db: {
                url: PrismaService.withSupabasePoolerParams(databaseUrl),
              },
            },
          }
        : undefined,
    );
  }

  private static withSupabasePoolerParams(databaseUrl: string): string {
    try {
      const url = new URL(databaseUrl);
      if (!url.hostname.includes('pooler.supabase.com')) return databaseUrl;

      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      if (!url.searchParams.has('connection_limit')) {
        url.searchParams.set('connection_limit', '1');
      }

      return url.toString();
    } catch {
      return databaseUrl;
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
