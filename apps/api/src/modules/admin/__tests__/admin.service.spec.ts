import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockPrisma = {
  appConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  shop: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  order: {
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('1. getConfig returns all AppConfig rows as object', async () => {
    mockPrisma.appConfig.findMany.mockResolvedValueOnce([
      { key: 'LOW_BALANCE_THRESHOLD', value: '50' },
      { key: 'SLOT_DURATION_MINS', value: '30' },
    ]);

    const result = await service.getConfig();
    expect(result).toEqual({
      LOW_BALANCE_THRESHOLD: '50',
      SLOT_DURATION_MINS: '30',
    });
  });

  it("2. updateConfig('LOW_BALANCE_THRESHOLD', '100') upserts", async () => {
    mockPrisma.appConfig.upsert.mockResolvedValueOnce({
      key: 'LOW_BALANCE_THRESHOLD',
      value: '100',
    });

    const result = await service.updateConfig('LOW_BALANCE_THRESHOLD', '100');
    expect(result).toEqual({
      key: 'LOW_BALANCE_THRESHOLD',
      value: '100',
    });
    expect(mockPrisma.appConfig.upsert).toHaveBeenCalledWith({
      where: { key: 'LOW_BALANCE_THRESHOLD' },
      update: { value: '100' },
      create: { key: 'LOW_BALANCE_THRESHOLD', value: '100' },
    });
  });

  it('3. getPlatformAnalytics sums revenue from COLLECTED only', async () => {
    mockPrisma.shop.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3).mockResolvedValueOnce(1);
    mockPrisma.order.count.mockResolvedValueOnce(50);
    mockPrisma.order.aggregate.mockResolvedValueOnce({
      _sum: { totalPrice: new Prisma.Decimal('1500.50') },
    });
    mockPrisma.order.groupBy.mockResolvedValueOnce([
      { shopId: 'shop-b', _sum: { totalPrice: new Prisma.Decimal('600') }, _count: { id: 20 } },
      { shopId: 'shop-a', _sum: { totalPrice: new Prisma.Decimal('900.50') }, _count: { id: 30 } },
    ]);
    mockPrisma.shop.findMany.mockResolvedValueOnce([
      { id: 'shop-a', name: 'Alpha Shop' },
      { id: 'shop-b', name: 'Beta Shop' },
    ]);

    const result = await service.getPlatformAnalytics();
    expect(result.totalRevenue).toBe(1500.50);
    expect(result.totalShops).toBe(5);
    expect(result.activeShops).toBe(3);
    expect(result.pendingApprovals).toBe(1);
    expect(result.totalOrders).toBe(50);
  });

  it('4. getPlatformAnalytics excludes cancelled orders from revenue but counts in totalOrders', async () => {
    mockPrisma.shop.count.mockResolvedValue(2);
    mockPrisma.order.count.mockResolvedValueOnce(10); // total 10 orders
    mockPrisma.order.aggregate.mockResolvedValueOnce({
      _sum: { totalPrice: new Prisma.Decimal('250') }, // revenue from COLLECTED only
    });
    mockPrisma.order.groupBy.mockResolvedValueOnce([
      { shopId: 'shop-1', _sum: { totalPrice: new Prisma.Decimal('250') }, _count: { id: 5 } },
    ]);
    mockPrisma.shop.findMany.mockResolvedValueOnce([
      { id: 'shop-1', name: 'Alpha Shop' },
    ]);

    const result = await service.getPlatformAnalytics();
    expect(result.totalOrders).toBe(10);
    expect(result.totalRevenue).toBe(250);
  });

  it('5. revenuePerShop returns sorted by shopId', async () => {
    mockPrisma.shop.count.mockResolvedValue(3);
    mockPrisma.order.count.mockResolvedValue(10);
    mockPrisma.order.aggregate.mockResolvedValue({
      _sum: { totalPrice: new Prisma.Decimal('500') },
    });
    mockPrisma.order.groupBy.mockResolvedValueOnce([
      { shopId: 'shop-z', _sum: { totalPrice: new Prisma.Decimal('100') }, _count: { id: 2 } },
      { shopId: 'shop-a', _sum: { totalPrice: new Prisma.Decimal('400') }, _count: { id: 8 } },
    ]);
    mockPrisma.shop.findMany.mockResolvedValueOnce([
      { id: 'shop-a', name: 'Shop A' },
      { id: 'shop-z', name: 'Shop Z' },
    ]);

    const result = await service.getPlatformAnalytics();
    expect(result.revenuePerShop).toHaveLength(2);
    expect(result.revenuePerShop[0].shopId).toBe('shop-a');
    expect(result.revenuePerShop[1].shopId).toBe('shop-z');
  });
});
