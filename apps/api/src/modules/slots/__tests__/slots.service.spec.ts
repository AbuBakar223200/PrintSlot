import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SlotsService } from '../slots.service';

const template = {
  id: '11111111-1111-4111-8111-111111111111',
  startTime: '09:00',
  endTime: '09:30',
  deletedAt: null,
  createdAt: new Date('2026-05-18T00:00:00.000Z'),
};

const slot = {
  id: '22222222-2222-4222-8222-222222222222',
  shopId: 'shop-1',
  templateId: template.id,
  date: new Date('2026-05-20T00:00:00.000Z'),
  isOpen: true,
  maxOrders: 5,
  currentCount: 2,
  template,
};

const mockPrisma = {
  slotTemplate: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  shopSlot: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  shop: {
    findUnique: jest.fn(),
  },
};

describe('SlotsService', () => {
  let service: SlotsService;

  beforeEach(() => {
    service = new SlotsService(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('createTemplate inserts a valid time window', async () => {
    mockPrisma.slotTemplate.create.mockResolvedValue(template);

    const result = await service.createTemplate({
      startTime: '09:00',
      endTime: '09:30',
    });

    expect(mockPrisma.slotTemplate.create).toHaveBeenCalledWith({
      data: { startTime: '09:00', endTime: '09:30' },
    });
    expect(result.startTime).toBe('09:00');
  });

  it('createTemplate rejects an endTime before startTime', async () => {
    await expect(
      service.createTemplate({ startTime: '12:00', endTime: '11:00' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deleteTemplate soft deletes and never hard deletes', async () => {
    mockPrisma.slotTemplate.findFirst.mockResolvedValue(template);
    mockPrisma.slotTemplate.update.mockResolvedValue({
      ...template,
      deletedAt: new Date('2026-05-20T00:00:00.000Z'),
    });

    await expect(service.deleteTemplate(template.id)).resolves.toEqual({
      success: true,
    });
    expect(mockPrisma.slotTemplate.update).toHaveBeenCalledWith({
      where: { id: template.id },
      data: { deletedAt: expect.any(Date) },
    });
    expect('delete' in mockPrisma.slotTemplate).toBe(false);
  });

  it('listTemplates excludes soft-deleted templates', async () => {
    mockPrisma.slotTemplate.findMany.mockResolvedValue([template]);

    const result = await service.listTemplates();

    expect(mockPrisma.slotTemplate.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      orderBy: { startTime: 'asc' },
    });
    expect(result).toHaveLength(1);
  });

  it('upsertShopSlot creates or updates without changing currentCount', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({ ownerId: 'owner-1' });
    mockPrisma.slotTemplate.findFirst.mockResolvedValue(template);
    mockPrisma.shopSlot.upsert.mockResolvedValue(slot);

    const result = await service.upsertShopSlot(
      'shop-1',
      {
        templateId: template.id,
        date: '2026-05-20',
        isOpen: true,
        maxOrders: 5,
      },
      { id: 'owner-1' },
    );

    expect(mockPrisma.shopSlot.upsert).toHaveBeenCalledWith({
      where: {
        shopId_templateId_date: {
          shopId: 'shop-1',
          templateId: template.id,
          date: new Date('2026-05-20T00:00:00.000Z'),
        },
      },
      create: {
        shopId: 'shop-1',
        templateId: template.id,
        date: new Date('2026-05-20T00:00:00.000Z'),
        isOpen: true,
        maxOrders: 5,
      },
      update: {
        isOpen: true,
        maxOrders: 5,
      },
      include: { template: true },
    });
    expect(result.currentCount).toBe(2);
  });

  it('upsertShopSlot rejects a shop not owned by the current user', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({ ownerId: 'owner-2' });

    await expect(
      service.upsertShopSlot(
        'shop-1',
        {
          templateId: template.id,
          date: '2026-05-20',
          isOpen: true,
          maxOrders: 5,
        },
        { id: 'owner-1' },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('getOpenSlots returns open, non-full slots for the date', async () => {
    mockPrisma.shopSlot.findMany.mockResolvedValue([
      slot,
      { ...slot, id: 'full-slot', currentCount: 5, maxOrders: 5 },
    ]);

    const result = await service.getOpenSlots('shop-1', '2026-05-20');

    expect(mockPrisma.shopSlot.findMany).toHaveBeenCalledWith({
      where: {
        shopId: 'shop-1',
        date: {
          gte: new Date('2026-05-20T00:00:00.000Z'),
          lt: new Date('2026-05-21T00:00:00.000Z'),
        },
        isOpen: true,
        template: { deletedAt: null },
      },
      include: { template: true },
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(slot.id);
  });

  it('getActiveSlot returns the BST matching slot with capacity', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-20T03:10:00.000Z'));
    mockPrisma.shopSlot.findMany.mockResolvedValue([slot]);

    const result = await service.getActiveSlot('shop-1');

    expect(mockPrisma.shopSlot.findMany).toHaveBeenCalledWith({
      where: {
        shopId: 'shop-1',
        date: {
          gte: new Date('2026-05-20T00:00:00.000Z'),
          lt: new Date('2026-05-21T00:00:00.000Z'),
        },
        isOpen: true,
        template: {
          deletedAt: null,
          startTime: { lte: '09:10' },
          endTime: { gt: '09:10' },
        },
      },
      include: { template: true },
    });
    expect(result?.id).toBe(slot.id);
  });

  it('getActiveSlot returns null when no slot is open', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-20T03:10:00.000Z'));
    mockPrisma.shopSlot.findMany.mockResolvedValue([]);

    await expect(service.getActiveSlot('shop-1')).resolves.toBeNull();
  });

  it('getActiveSlot returns null when the matching slot is full', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-20T03:10:00.000Z'));
    mockPrisma.shopSlot.findMany.mockResolvedValue([
      { ...slot, currentCount: 5, maxOrders: 5 },
    ]);

    await expect(service.getActiveSlot('shop-1')).resolves.toBeNull();
  });

  it('getActiveSlot excludes closed slots from the active-slot query', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-20T03:10:00.000Z'));
    mockPrisma.shopSlot.findMany.mockResolvedValue([]);

    await expect(service.getActiveSlot('shop-1')).resolves.toBeNull();
    expect(mockPrisma.shopSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isOpen: true,
        }),
      }),
    );
  });

  it('getActiveSlot uses an exclusive endTime boundary', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-20T03:30:00.000Z'));
    mockPrisma.shopSlot.findMany.mockResolvedValue([]);

    await service.getActiveSlot('shop-1');

    expect(mockPrisma.shopSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          template: expect.objectContaining({
            endTime: { gt: '09:30' },
          }),
        }),
      }),
    );
  });

  it('getSlotById throws when no non-deleted slot exists', async () => {
    mockPrisma.shopSlot.findFirst.mockResolvedValue(null);

    await expect(service.getSlotById('missing-slot')).rejects.toThrow(
      NotFoundException,
    );
  });
});
