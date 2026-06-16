import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ShopStatus,
  type Shop,
  type ShopListResult,
} from '@printslot/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopStatusDto } from './dto/update-shop-status.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

type DecimalLike = number | string | { toString(): string };

interface PrismaShopShape {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  status: string;
  rejectionReason: string | null;
  ownerId: string;
  colorRate: DecimalLike;
  bwRate: DecimalLike;
  a3Surcharge: DecimalLike;
  duplexDiscount: DecimalLike;
  defaultProcessingMins: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ListActiveQuery {
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async createShop(dto: CreateShopDto, ownerId: string): Promise<Shop> {
    const existingShop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    if (existingShop) {
      throw new ConflictException('You already have a shop.');
    }

    try {
      const shop = await this.prisma.shop.create({
        data: {
          name: dto.name,
          address: dto.address,
          phone: dto.phone ?? null,
          ownerId,
          colorRate: dto.colorRate,
          bwRate: dto.bwRate,
          a3Surcharge: dto.a3Surcharge,
          duplexDiscount: dto.duplexDiscount,
        },
      });

      return this.mapToSharedShop(shop);
    } catch (error) {
      if (this.isOwnerUniqueConflict(error)) {
        throw new ConflictException('You already have a shop.');
      }
      throw error;
    }
  }

  async listActive(query: ListActiveQuery = {}): Promise<ShopListResult> {
    const page = this.normalisePositiveInt(query.page, 1);
    const limit = this.normalisePositiveInt(query.limit, 20);
    const search = query.search?.trim();
    const where = {
      status: ShopStatus.ACTIVE,
      ...(search
        ? { name: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shop.count({ where }),
    ]);

    return {
      items: items.map((shop) => this.mapToSharedShop(shop)),
      total,
      page,
      limit,
    };
  }

  async findById(shopId: string): Promise<Shop> {
    const shop = await this.findShopOrThrow(shopId);
    return this.mapToSharedShop(shop);
  }

  /**
   * Resolve the signed-in owner's own shop regardless of status (PENDING,
   * REJECTED, ACTIVE, SUSPENDED). `ownerId` is unique, so there is at most one.
   * Returns `null` when the owner has not created a shop yet.
   */
  async findByOwner(ownerId: string): Promise<Shop | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
    });

    return shop ? this.mapToSharedShop(shop) : null;
  }

  async updateShop(
    shopId: string,
    dto: UpdateShopDto,
    ownerId: string,
  ): Promise<Shop> {
    const shop = await this.findShopOrThrow(shopId);
    this.assertOwner(shop, ownerId);

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.colorRate !== undefined && { colorRate: dto.colorRate }),
        ...(dto.bwRate !== undefined && { bwRate: dto.bwRate }),
        ...(dto.a3Surcharge !== undefined && {
          a3Surcharge: dto.a3Surcharge,
        }),
        ...(dto.duplexDiscount !== undefined && {
          duplexDiscount: dto.duplexDiscount,
        }),
        ...(dto.defaultProcessingMins !== undefined && {
          defaultProcessingMins: dto.defaultProcessingMins,
        }),
      },
    });

    return this.mapToSharedShop(updated);
  }

  async updateStatus(
    shopId: string,
    dto: UpdateShopStatusDto,
  ): Promise<Shop> {
    const shop = await this.findShopOrThrow(shopId);
    const targetStatus = dto.status;

    if (!this.isShopStatus(targetStatus)) {
      throw new BadRequestException('Invalid status transition');
    }

    if (!this.canTransition(shop.status, targetStatus)) {
      throw new BadRequestException('Invalid status transition');
    }

    if (
      targetStatus === ShopStatus.REJECTED &&
      !dto.rejectionReason?.trim()
    ) {
      throw new BadRequestException('rejectionReason required.');
    }

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: targetStatus,
        rejectionReason: this.rejectionReasonFor(targetStatus, dto),
      },
    });

    if (targetStatus === ShopStatus.ACTIVE && shop.status === ShopStatus.PENDING) {
      // TODO(Slice 23): NotificationsService.notifyShopApproved(shop, ownerId)
    }
    if (targetStatus === ShopStatus.REJECTED) {
      // TODO(Slice 23): NotificationsService.notifyShopRejected(shop, ownerId)
    }
    if (targetStatus === ShopStatus.SUSPENDED) {
      // TODO(Slice 23): NotificationsService.notifyShopSuspended(shop, ownerId)
    }

    return this.mapToSharedShop(updated);
  }

  async resubmit(shopId: string, ownerId: string): Promise<Shop> {
    const shop = await this.findShopOrThrow(shopId);
    this.assertOwner(shop, ownerId);

    if (shop.status === ShopStatus.SUSPENDED) {
      throw new BadRequestException(
        'Cannot resubmit from suspended state - admin reinstatement required.',
      );
    }

    if (shop.status !== ShopStatus.REJECTED) {
      throw new BadRequestException('Shop is not rejected.');
    }

    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        status: ShopStatus.PENDING,
        rejectionReason: null,
      },
    });

    return this.mapToSharedShop(updated);
  }

  async getAnalytics(shopId: string, ownerId: string, dateStr?: string): Promise<{
    date: string;
    totalOrders: number;
    revenue: number;
    byStatus: Record<string, number>;
    avgProcessingMins: number | null;
  }> {
    const shop = await this.findShopOrThrow(shopId);
    this.assertOwner(shop, ownerId);

    const bstOffsetMs = 6 * 60 * 60 * 1000;
    let dateForQuery: string;
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateForQuery = dateStr;
    } else {
      const bstNow = new Date(Date.now() + bstOffsetMs);
      dateForQuery = bstNow.toISOString().slice(0, 10);
    }

    const startUtc = new Date(`${dateForQuery}T00:00:00+06:00`);
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        shopId,
        createdAt: { gte: startUtc, lt: endUtc },
      },
      select: {
        status: true,
        totalPrice: true,
        processingStartedAt: true,
        readyAt: true,
      },
    });

    const totalOrders = orders.length;

    let revenue = 0;
    const byStatus: Record<string, number> = {};
    let processingMinsSum = 0;
    let collectedWithTimesCount = 0;

    for (const order of orders) {
      byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;

      if (order.status === 'COLLECTED') {
        revenue += Number(order.totalPrice);

        if (order.processingStartedAt && order.readyAt) {
          const diffMins =
            (order.readyAt.getTime() - order.processingStartedAt.getTime()) / 60000;
          processingMinsSum += diffMins;
          collectedWithTimesCount++;
        }
      }
    }

    const avgProcessingMins =
      collectedWithTimesCount > 0
        ? Math.round(processingMinsSum / collectedWithTimesCount)
        : null;

    return {
      date: dateForQuery,
      totalOrders,
      revenue: Math.round(revenue * 100) / 100,
      byStatus,
      avgProcessingMins,
    };
  }

  private async findShopOrThrow(shopId: string): Promise<PrismaShopShape> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    return shop;
  }

  private assertOwner(shop: PrismaShopShape, ownerId: string): void {
    if (shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this shop.');
    }
  }

  private canTransition(from: string, to: ShopStatus): boolean {
    const transitions: Record<ShopStatus, ShopStatus[]> = {
      [ShopStatus.PENDING]: [ShopStatus.ACTIVE, ShopStatus.REJECTED],
      [ShopStatus.ACTIVE]: [ShopStatus.SUSPENDED],
      [ShopStatus.SUSPENDED]: [ShopStatus.ACTIVE, ShopStatus.REJECTED],
      [ShopStatus.REJECTED]: [],
    };

    if (!this.isShopStatus(from)) {
      return false;
    }

    return transitions[from].includes(to);
  }

  private rejectionReasonFor(
    status: ShopStatus,
    dto: UpdateShopStatusDto,
  ): string | null {
    if (status === ShopStatus.REJECTED) {
      return dto.rejectionReason?.trim() ?? null;
    }

    if (status === ShopStatus.SUSPENDED) {
      return dto.rejectionReason?.trim() ?? null;
    }

    return null;
  }

  private isShopStatus(value: unknown): value is ShopStatus {
    return Object.values(ShopStatus).includes(value as ShopStatus);
  }

  private mapToSharedShop(prismaShop: PrismaShopShape): Shop {
    return {
      id: prismaShop.id,
      name: prismaShop.name,
      address: prismaShop.address,
      phone: prismaShop.phone,
      status: prismaShop.status as ShopStatus,
      rejectionReason: prismaShop.rejectionReason,
      ownerId: prismaShop.ownerId,
      colorRate: this.toCurrencyNumber(prismaShop.colorRate),
      bwRate: this.toCurrencyNumber(prismaShop.bwRate),
      a3Surcharge: this.toCurrencyNumber(prismaShop.a3Surcharge),
      duplexDiscount: this.toCurrencyNumber(prismaShop.duplexDiscount),
      defaultProcessingMins: prismaShop.defaultProcessingMins,
      createdAt: prismaShop.createdAt.toISOString(),
      updatedAt: prismaShop.updatedAt.toISOString(),
    };
  }

  private toCurrencyNumber(value: DecimalLike): number {
    return Math.round(Number(value.toString()) * 100) / 100;
  }

  private normalisePositiveInt(value: number | undefined, fallback: number) {
    if (!value || !Number.isInteger(value) || value < 1) {
      return fallback;
    }

    return value;
  }

  private isOwnerUniqueConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
