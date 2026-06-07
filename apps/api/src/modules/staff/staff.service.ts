import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { User } from '@printslot/shared';

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async assertOwnership(shopId: string, ownerId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this shop');
    }
    return shop;
  }

  async assignStaff(
    shopId: string,
    targetUserId: string,
    currentUserId: string,
  ): Promise<User> {
    const shop = await this.assertOwnership(shopId, currentUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role !== 'CUSTOMER') {
      throw new BadRequestException('Only customers can be promoted to staff.');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: 'STAFF',
        shopId,
      },
    });

    // Notify user about their staff promotion
    try {
      await this.notificationsService.notifyStaffAssigned(targetUserId, shop.name);
    } catch (err) {
      // In production, we don't block the transaction/action if notification dispatch fails,
      // but let's make sure it is logged or handled.
    }

    return this.mapToSharedUser(updated);
  }

  async removeStaff(
    shopId: string,
    targetUserId: string,
    currentUserId: string,
  ): Promise<User> {
    await this.assertOwnership(shopId, currentUserId);

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.role !== 'STAFF' || targetUser.shopId !== shopId) {
      throw new NotFoundException('User is not a staff member of this shop');
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        role: 'CUSTOMER',
        shopId: null,
      },
    });

    return this.mapToSharedUser(updated);
  }

  async listStaff(shopId: string, currentUserId: string): Promise<User[]> {
    await this.assertOwnership(shopId, currentUserId);

    const staffUsers = await this.prisma.user.findMany({
      where: {
        role: 'STAFF',
        shopId,
      },
      orderBy: { name: 'asc' },
    });

    return staffUsers.map((u) => this.mapToSharedUser(u));
  }

  private mapToSharedUser(prismaUser: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    shopId: string | null;
    language: string;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      phone: prismaUser.phone,
      role: prismaUser.role as User['role'],
      shopId: prismaUser.shopId,
      language: prismaUser.language as User['language'],
      createdAt: prismaUser.createdAt.toISOString(),
      updatedAt: prismaUser.updatedAt.toISOString(),
    };
  }
}
