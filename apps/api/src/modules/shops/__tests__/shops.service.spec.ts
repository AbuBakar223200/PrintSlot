import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ShopStatus } from '@printslot/shared';
import { PrismaService } from '../../../prisma/prisma.service';
import { ShopsService } from '../shops.service';

const baseShop = {
  id: 'shop-1',
  name: 'Library Print',
  address: 'Campus Gate',
  phone: null,
  status: ShopStatus.PENDING,
  rejectionReason: null,
  ownerId: 'owner-1',
  colorRate: '10.50',
  bwRate: '3.25',
  a3Surcharge: '5.00',
  duplexDiscount: '0.20',
  defaultProcessingMins: 15,
  createdAt: new Date('2026-05-18T10:00:00Z'),
  updatedAt: new Date('2026-05-18T11:00:00Z'),
};

const mockPrisma = {
  shop: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
};

describe('ShopsService', () => {
  let service: ShopsService;

  beforeEach(() => {
    service = new ShopsService(mockPrisma as unknown as PrismaService);
    jest.clearAllMocks();
  });

  it('createShop returns new Shop with PENDING status and ownerId', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue(null);
    mockPrisma.shop.create.mockResolvedValue(baseShop);

    const result = await service.createShop(
      {
        name: 'Library Print',
        address: 'Campus Gate',
        colorRate: 10.5,
        bwRate: 3.25,
        a3Surcharge: 5,
        duplexDiscount: 0.2,
      },
      'owner-1',
    );

    expect(mockPrisma.shop.create).toHaveBeenCalledWith({
      data: {
        name: 'Library Print',
        address: 'Campus Gate',
        phone: null,
        ownerId: 'owner-1',
        colorRate: 10.5,
        bwRate: 3.25,
        a3Surcharge: 5,
        duplexDiscount: 0.2,
      },
    });
    expect(result.status).toBe(ShopStatus.PENDING);
    expect(result.ownerId).toBe('owner-1');
  });

  it('createShop throws 409 when owner already has shop', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue(baseShop);

    await expect(
      service.createShop(
        {
          name: 'Second Shop',
          address: 'Campus Gate',
          colorRate: 10,
          bwRate: 3,
          a3Surcharge: 5,
          duplexDiscount: 0.2,
        },
        'owner-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('findByOwner returns the mapped shop regardless of status', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);

    const result = await service.findByOwner('owner-1');

    expect(mockPrisma.shop.findUnique).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
    });
    expect(result?.id).toBe('shop-1');
    expect(result?.status).toBe(ShopStatus.PENDING);
  });

  it('findByOwner returns null when the owner has no shop', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(null);

    const result = await service.findByOwner('owner-1');

    expect(result).toBeNull();
  });

  it('updateShop succeeds for owner and throws 403 for another owner', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
    mockPrisma.shop.update.mockResolvedValueOnce({
      ...baseShop,
      name: 'Updated Print',
    });

    const result = await service.updateShop(
      'shop-1',
      { name: 'Updated Print' },
      'owner-1',
    );

    expect(result.name).toBe('Updated Print');

    mockPrisma.shop.findUnique.mockResolvedValueOnce({
      ...baseShop,
      ownerId: 'owner-2',
    });

    await expect(
      service.updateShop('shop-1', { name: 'Blocked' }, 'owner-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('updateStatus enforces status transition matrix and rejection reason', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
    mockPrisma.shop.update.mockResolvedValueOnce({
      ...baseShop,
      status: ShopStatus.ACTIVE,
    });

    const active = await service.updateStatus('shop-1', {
      status: ShopStatus.ACTIVE,
    });
    expect(active.status).toBe(ShopStatus.ACTIVE);

    mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
    await expect(
      service.updateStatus('shop-1', {
        status: 'COLLECTED' as never,
      }),
    ).rejects.toThrow(BadRequestException);

    mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
    await expect(
      service.updateStatus('shop-1', {
        status: ShopStatus.REJECTED,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('resubmit from REJECTED returns PENDING and clears rejectionReason', async () => {
    const rejectedShop = {
      ...baseShop,
      status: ShopStatus.REJECTED,
      rejectionReason: 'Missing trade license',
    };
    mockPrisma.shop.findUnique.mockResolvedValue(rejectedShop);
    mockPrisma.shop.update.mockResolvedValue({
      ...rejectedShop,
      status: ShopStatus.PENDING,
      rejectionReason: null,
    });

    const result = await service.resubmit('shop-1', 'owner-1');

    expect(result.status).toBe(ShopStatus.PENDING);
    expect(result.rejectionReason).toBeNull();
  });

  it('resubmit from SUSPENDED throws 400', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue({
      ...baseShop,
      status: ShopStatus.SUSPENDED,
    });

    await expect(service.resubmit('shop-1', 'owner-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('listActive returns only ACTIVE shops', async () => {
    mockPrisma.shop.findMany.mockResolvedValue([
      { ...baseShop, status: ShopStatus.ACTIVE },
    ]);
    mockPrisma.shop.count.mockResolvedValue(1);

    const result = await service.listActive();

    expect(mockPrisma.shop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ShopStatus.ACTIVE },
      }),
    );
    expect(result.items).toHaveLength(1);
  });

  it('listActive search filters by name case-insensitively', async () => {
    mockPrisma.shop.findMany.mockResolvedValue([
      { ...baseShop, status: ShopStatus.ACTIVE },
    ]);
    mockPrisma.shop.count.mockResolvedValue(1);

    await service.listActive({ search: 'lib' });

    expect(mockPrisma.shop.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ShopStatus.ACTIVE,
          name: { contains: 'lib', mode: 'insensitive' },
        },
      }),
    );
  });

  it('maps Prisma Decimal-like rates to JS numbers', async () => {
    mockPrisma.shop.findUnique.mockResolvedValue(baseShop);

    const result = await service.findById('shop-1');

    expect(result.colorRate).toBe(10.5);
    expect(result.bwRate).toBe(3.25);
    expect(typeof result.colorRate).toBe('number');
  });

  describe('getAnalytics', () => {
    it("10. Owner querying other shop's analytics → 403", async () => {
      mockPrisma.shop.findUnique.mockResolvedValueOnce({
        ...baseShop,
        ownerId: 'owner-2',
      });

      await expect(
        service.getAnalytics('shop-1', 'owner-1', '2026-06-07'),
      ).rejects.toThrow(ForbiddenException);
    });

    it("6. Owner's analytics for today returns correct counts/revenue", async () => {
      mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
      // Mock two orders for the date: one COLLECTED (totalPrice 100), one CANCELLED (totalPrice 50)
      mockPrisma.order.findMany.mockResolvedValueOnce([
        {
          status: 'COLLECTED',
          totalPrice: '100.00',
          processingStartedAt: new Date('2026-06-07T10:00:00Z'),
          readyAt: new Date('2026-06-07T10:20:00Z'),
        },
        {
          status: 'CANCELLED',
          totalPrice: '50.00',
          processingStartedAt: null,
          readyAt: null,
        },
      ]);

      const result = await service.getAnalytics('shop-1', 'owner-1', '2026-06-07');
      expect(result.date).toBe('2026-06-07');
      expect(result.totalOrders).toBe(2);
      expect(result.revenue).toBe(100); // only COLLECTED
    });

    it('7. byStatus has correct counts per OrderStatus', async () => {
      mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
      mockPrisma.order.findMany.mockResolvedValueOnce([
        {
          status: 'COLLECTED',
          totalPrice: '100.00',
          processingStartedAt: null,
          readyAt: null,
        },
        {
          status: 'QUEUED',
          totalPrice: '20.00',
          processingStartedAt: null,
          readyAt: null,
        },
        {
          status: 'QUEUED',
          totalPrice: '30.00',
          processingStartedAt: null,
          readyAt: null,
        },
      ]);

      const result = await service.getAnalytics('shop-1', 'owner-1', '2026-06-07');
      expect(result.byStatus).toEqual({
        COLLECTED: 1,
        QUEUED: 2,
      });
    });

    it('8. avgProcessingMins computed correctly', async () => {
      mockPrisma.shop.findUnique.mockResolvedValueOnce(baseShop);
      mockPrisma.order.findMany.mockResolvedValueOnce([
        {
          status: 'COLLECTED',
          totalPrice: '100.00',
          processingStartedAt: new Date('2026-06-07T10:00:00Z'),
          readyAt: new Date('2026-06-07T10:20:00Z'), // 20 mins
        },
        {
          status: 'COLLECTED',
          totalPrice: '100.00',
          processingStartedAt: new Date('2026-06-07T11:00:00Z'),
          readyAt: new Date('2026-06-07T11:40:00Z'), // 40 mins
        },
      ]);

      const result = await service.getAnalytics('shop-1', 'owner-1', '2026-06-07');
      expect(result.avgProcessingMins).toBe(30); // (20 + 40) / 2 = 30
    });
  });
});
