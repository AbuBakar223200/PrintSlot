import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const KNOWN_DEFAULTS: Record<string, string> = {
  LOW_BALANCE_THRESHOLD: '50',
  SLOT_DURATION_MINS: '30',
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<Record<string, string>> {
    const rows = await this.prisma.appConfig.findMany();
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  }

  async getOrDefault(key: string): Promise<string> {
    const row = await this.prisma.appConfig.findUnique({ where: { key } });
    if (row) return row.value;
    return KNOWN_DEFAULTS[key] ?? '';
  }

  async updateConfig(key: string, value: string): Promise<{ key: string; value: string }> {
    const row = await this.prisma.appConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { key: row.key, value: row.value };
  }

  async getPlatformAnalytics(): Promise<{
    totalShops: number;
    activeShops: number;
    pendingApprovals: number;
    totalOrders: number;
    totalRevenue: number;
    revenuePerShop: Array<{ shopId: string; name: string; revenue: number; totalOrders: number }>;
  }> {
    const [totalShops, activeShops, pendingApprovals, totalOrders] = await Promise.all([
      this.prisma.shop.count(),
      this.prisma.shop.count({ where: { status: 'ACTIVE' } }),
      this.prisma.shop.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count(),
    ]);

    const revenueAgg = await this.prisma.order.aggregate({
      where: { status: 'COLLECTED' },
      _sum: { totalPrice: true },
    });
    const totalRevenue = revenueAgg._sum.totalPrice
      ? Number(revenueAgg._sum.totalPrice)
      : 0;

    const shopRevenues = await this.prisma.order.groupBy({
      by: ['shopId'],
      where: { status: 'COLLECTED' },
      _sum: { totalPrice: true },
      _count: { id: true },
    });

    const shopIds = shopRevenues.map((s) => s.shopId);
    const shops = shopIds.length > 0
      ? await this.prisma.shop.findMany({
          where: { id: { in: shopIds } },
          select: { id: true, name: true },
        })
      : [];

    const shopMap = new Map(shops.map((s) => [s.id, s.name]));

    const revenuePerShop = shopRevenues
      .map((s) => ({
        shopId: s.shopId,
        name: shopMap.get(s.shopId) ?? 'Unknown',
        revenue: s._sum.totalPrice ? Number(s._sum.totalPrice) : 0,
        totalOrders: s._count.id,
      }))
      .sort((a, b) => a.shopId.localeCompare(b.shopId));

    return {
      totalShops,
      activeShops,
      pendingApprovals,
      totalOrders,
      totalRevenue,
      revenuePerShop,
    };
  }
}
