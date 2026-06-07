import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Slot, SlotTemplate } from '@printslot/shared';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateSlotTemplateDto } from './dto/create-slot-template.dto';
import type { UpdateSlotTemplateDto } from './dto/update-slot-template.dto';
import type { UpsertShopSlotDto } from './dto/upsert-shop-slot.dto';

interface PrismaSlotTemplateShape {
  id: string;
  startTime: string;
  endTime: string;
  deletedAt: Date | null;
  createdAt: Date;
}

interface PrismaShopSlotShape {
  id: string;
  shopId: string;
  templateId: string;
  date: Date;
  isOpen: boolean;
  maxOrders: number;
  currentCount: number;
  template: PrismaSlotTemplateShape;
}

interface CurrentUserShape {
  id: string;
  shopId?: string | null;
}

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(dto: CreateSlotTemplateDto): Promise<SlotTemplate> {
    this.assertValidWindow(dto.startTime, dto.endTime);

    const template: PrismaSlotTemplateShape = await this.prisma.slotTemplate.create({
      data: {
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });

    return this.mapTemplate(template);
  }

  async listTemplates(): Promise<SlotTemplate[]> {
    const templates: PrismaSlotTemplateShape[] =
      await this.prisma.slotTemplate.findMany({
      where: this.deletedAtFilter(),
      orderBy: { startTime: 'asc' },
    });

    return templates.map((template) => this.mapTemplate(template));
  }

  async updateTemplate(
    templateId: string,
    dto: UpdateSlotTemplateDto,
  ): Promise<SlotTemplate> {
    const existing = await this.findTemplateOrThrow(templateId);
    const startTime = dto.startTime ?? existing.startTime;
    const endTime = dto.endTime ?? existing.endTime;
    this.assertValidWindow(startTime, endTime);

    const template: PrismaSlotTemplateShape = await this.prisma.slotTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.startTime !== undefined && { startTime: dto.startTime }),
        ...(dto.endTime !== undefined && { endTime: dto.endTime }),
      },
    });

    return this.mapTemplate(template);
  }

  async deleteTemplate(templateId: string): Promise<{ success: true }> {
    await this.findTemplateOrThrow(templateId);
    await this.prisma.slotTemplate.update({
      where: { id: templateId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  async upsertShopSlot(
    shopId: string,
    dto: UpsertShopSlotDto,
    currentUser: CurrentUserShape,
  ): Promise<Slot> {
    await this.assertShopOwner(shopId, currentUser);
    await this.findTemplateOrThrow(dto.templateId);

    const date = this.parseDate(dto.date);
    const slot: PrismaShopSlotShape = await this.prisma.shopSlot.upsert({
      where: {
        shopId_templateId_date: {
          shopId,
          templateId: dto.templateId,
          date,
        },
      },
      create: {
        shopId,
        templateId: dto.templateId,
        date,
        isOpen: dto.isOpen,
        maxOrders: dto.maxOrders,
      },
      update: {
        isOpen: dto.isOpen,
        maxOrders: dto.maxOrders,
      },
      include: { template: true },
    });

    return this.mapSlot(slot);
  }

  async getOpenSlots(shopId: string, dateValue: string): Promise<Slot[]> {
    const { gte, lt } = this.dateRange(dateValue);
    const slots: PrismaShopSlotShape[] = await this.prisma.shopSlot.findMany({
      where: {
        shopId,
        date: { gte, lt },
        isOpen: true,
        template: this.deletedAtFilter(),
      },
      include: { template: true },
    });

    return slots
      .filter((slot) => slot.currentCount < slot.maxOrders)
      .sort((a, b) => a.template.startTime.localeCompare(b.template.startTime))
      .map((slot) => this.mapSlot(slot));
  }

  async getActiveSlot(shopId: string): Promise<Slot | null> {
    const { date, time } = this.currentBstParts();
    const { gte, lt } = this.dateRange(date);
    const slots: PrismaShopSlotShape[] = await this.prisma.shopSlot.findMany({
      where: {
        shopId,
        date: { gte, lt },
        isOpen: true,
        template: {
          deletedAt: null,
          startTime: { lte: time },
          endTime: { gt: time },
        },
      },
      include: { template: true },
    });

    const slot = slots
      .filter((candidate) => candidate.currentCount < candidate.maxOrders)
      .sort((a, b) => a.template.startTime.localeCompare(b.template.startTime))[0];

    return slot ? this.mapSlot(slot) : null;
  }

  async getSlotById(slotId: string): Promise<Slot> {
    const slot: PrismaShopSlotShape | null = await this.prisma.shopSlot.findFirst({
      where: {
        id: slotId,
        template: this.deletedAtFilter(),
      },
      include: { template: true },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return this.mapSlot(slot);
  }

  private async assertShopOwner(
    shopId: string,
    currentUser: CurrentUserShape,
  ): Promise<void> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId !== currentUser.id && currentUser.shopId !== shopId) {
      throw new ForbiddenException('You do not own this shop.');
    }
  }

  private async findTemplateOrThrow(
    templateId: string,
  ): Promise<PrismaSlotTemplateShape> {
    const template: PrismaSlotTemplateShape | null =
      await this.prisma.slotTemplate.findFirst({
      where: {
        id: templateId,
        ...this.deletedAtFilter(),
      },
    });

    if (!template) {
      throw new NotFoundException('SlotTemplate not found');
    }

    return template;
  }

  private assertValidWindow(startTime: string, endTime: string): void {
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime.');
    }
  }

  private currentBstParts(): { date: string; time: string } {
    const bstOffsetMs = 6 * 60 * 60 * 1000;
    const bst = new Date(Date.now() + bstOffsetMs);
    const date = bst.toISOString().slice(0, 10);
    const hour = String(bst.getUTCHours()).padStart(2, '0');
    const minute = String(bst.getUTCMinutes()).padStart(2, '0');

    return { date, time: `${hour}:${minute}` };
  }

  private dateRange(dateValue: string): { gte: Date; lt: Date } {
    const gte = this.parseDate(dateValue);
    const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
    return { gte, lt };
  }

  private parseDate(dateValue: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      throw new BadRequestException('date must use YYYY-MM-DD format.');
    }

    const date = new Date(`${dateValue}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateValue) {
      throw new BadRequestException('date must be a valid calendar date.');
    }

    return date;
  }

  private deletedAtFilter(): { deletedAt: null } {
    return { deletedAt: null };
  }

  private mapSlot(slot: PrismaShopSlotShape): Slot {
    return {
      id: slot.id,
      shopId: slot.shopId,
      templateId: slot.templateId,
      date: slot.date.toISOString(),
      isOpen: slot.isOpen,
      maxOrders: slot.maxOrders,
      currentCount: slot.currentCount,
      template: this.mapTemplate(slot.template),
    };
  }

  private mapTemplate(template: PrismaSlotTemplateShape): SlotTemplate {
    return {
      id: template.id,
      startTime: template.startTime,
      endTime: template.endTime,
      deletedAt: template.deletedAt?.toISOString() ?? null,
      createdAt: template.createdAt.toISOString(),
    };
  }
}
