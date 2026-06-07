import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import type { User, UserDevice } from '@printslot/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(dto: UpdateUserDto, userId: string): Promise<User> {
    const hasFields = Object.keys(dto).length > 0;

    if (!hasFields) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });
      return this.mapToSharedUser(user);
    }

    const phone =
      dto.phone !== undefined ? dto.phone.trim() || null : undefined;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(phone !== undefined && { phone }),
        ...(dto.language !== undefined && { language: dto.language }),
      },
    });

    return this.mapToSharedUser(updated);
  }

  async registerDevice(
    dto: RegisterDeviceDto,
    userId: string,
  ): Promise<Pick<UserDevice, 'id' | 'deviceId' | 'updatedAt'>> {
    const device = await this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      update: { token: dto.token },
      create: { userId, token: dto.token, deviceId: dto.deviceId },
    });

    return {
      id: device.id,
      deviceId: device.deviceId,
      updatedAt: device.updatedAt.toISOString(),
    };
  }

  async removeDevice(
    deviceId: string,
    userId: string,
  ): Promise<{ success: true }> {
    const device = await this.prisma.userDevice.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
    });

    if (!device) {
      throw new NotFoundException(`Device not found`);
    }

    await this.prisma.userDevice.delete({
      where: { userId_deviceId: { userId, deviceId } },
    });

    return { success: true };
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
