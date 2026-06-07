import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SlotsService } from '../../slots/slots.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CLOUDINARY_PROVIDER } from '../../../config/cloudinary.config';
import { OrdersGateway } from '../orders.gateway';

describe('OrdersService - Queue Position & ETA Algorithm', () => {
  let service: OrdersService;
  let prismaMock: any;

  const mockShop = {
    id: 'shop-1',
    name: 'Campus Print',
    status: 'ACTIVE',
    colorRate: new Prisma.Decimal(10),
    bwRate: new Prisma.Decimal(3),
    a3Surcharge: new Prisma.Decimal(5),
    duplexDiscount: new Prisma.Decimal(0.2),
    defaultProcessingMins: 15,
  };

  const mockSlot = {
    id: 'slot-1',
    date: new Date('2026-06-01'),
  };

  const mockTargetOrder = {
    id: 'order-target',
    shopId: 'shop-1',
    slotId: 'slot-1',
    colorPages: 2,
    bwPages: 5,
    createdAt: new Date('2026-06-01T12:00:00Z'),
    slot: mockSlot,
    shop: mockShop,
  };

  beforeEach(async () => {
    prismaMock = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SlotsService, useValue: {} },
        { provide: WalletService, useValue: {} },
        { provide: NotificationsService, useValue: {} },
        { provide: CLOUDINARY_PROVIDER, useValue: {} },
        { provide: OrdersGateway, useValue: {} },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('computeQueuePosition', () => {
    it('should compute correct position (count of earlier orders + 1)', async () => {
      // 3 earlier orders
      prismaMock.order.count.mockResolvedValue(3);

      const position = await service.computeQueuePosition(mockTargetOrder);

      expect(position).toBe(4);
      expect(prismaMock.order.count).toHaveBeenCalledWith({
        where: {
          shopId: mockTargetOrder.shopId,
          slot: { date: mockTargetOrder.slot.date },
          status: { in: ['QUEUED', 'PROCESSING'] },
          createdAt: { lt: mockTargetOrder.createdAt },
        },
      });
    });
  });

  describe('computeETA', () => {
    it('1. With >= 10 completed orders: ETA uses calculated rate', async () => {
      // Create 10 historical orders
      // For colorRate: (colorMins / colorPages)
      // For bwRate: (bwMins / bwPages)
      // Say each order took 10 minutes, had 2 colorPages and 2 bwPages.
      // totalPages = 4. diffMins = 10.
      // colorMins = 10 * (2/4) = 5 mins.
      // bwMins = 10 * (2/4) = 5 mins.
      // colorPages = 2, bwPages = 2.
      // Rate = 5 / 2 = 2.5 mins per page.
      const historicalOrders = Array.from({ length: 10 }).map((_, idx) => ({
        id: `h-order-${idx}`,
        colorPages: 2,
        bwPages: 2,
        processingStartedAt: new Date('2026-06-01T10:00:00Z'),
        readyAt: new Date('2026-06-01T10:10:00Z'), // 10 mins duration
      }));

      prismaMock.order.findMany
        .mockResolvedValueOnce(historicalOrders) // first call: completed orders
        .mockResolvedValueOnce([]); // second call: ordersAhead (zero)

      // Target order has 2 colorPages and 5 bwPages
      // expected ETA = (2 * 2.5) + (5 * 2.5) = 5 + 12.5 = 17.5 mins -> rounded to 18
      const eta = await service.computeETA(mockTargetOrder);

      expect(eta).toBe(18);
    });

    it('2. With < 10 completed: fallback defaultProcessingMins / 10 per page', async () => {
      // Only 5 completed orders
      const historicalOrders = Array.from({ length: 5 }).map((_, idx) => ({
        id: `h-order-${idx}`,
        colorPages: 2,
        bwPages: 2,
        processingStartedAt: new Date('2026-06-01T10:00:00Z'),
        readyAt: new Date('2026-06-01T10:10:00Z'),
      }));

      prismaMock.order.findMany
        .mockResolvedValueOnce(historicalOrders)
        .mockResolvedValueOnce([]); // zero ordersAhead

      // shop.defaultProcessingMins = 15. Fallback rate = 1.5 mins per page.
      // Target order: 2 color, 5 bw -> total 7 pages.
      // expected ETA = 7 * 1.5 = 10.5 -> rounded to 11
      const eta = await service.computeETA(mockTargetOrder);

      expect(eta).toBe(11);
    });

    it('3. With zero ordersAhead: ETA = own pages * rate', async () => {
      prismaMock.order.findMany
        .mockResolvedValueOnce([]) // completed orders (under 10, fallback 1.5)
        .mockResolvedValueOnce([]); // zero ordersAhead

      // Target order: 2 color, 5 bw -> total 7 pages.
      // Fallback rate = 1.5 mins per page.
      // expected ETA = 7 * 1.5 = 10.5 -> rounded to 11
      const eta = await service.computeETA(mockTargetOrder);

      expect(eta).toBe(11);
    });

    it('4. Order with colorPages = 0, bwPages = 10: only bwRate contributes', async () => {
      prismaMock.order.findMany
        .mockResolvedValueOnce([]) // completed orders (under 10, fallback 1.5)
        .mockResolvedValueOnce([]); // zero ordersAhead

      const targetOrder = {
        ...mockTargetOrder,
        colorPages: 0,
        bwPages: 10,
      };

      // expected ETA = 10 * 1.5 = 15 mins
      const eta = await service.computeETA(targetOrder);

      expect(eta).toBe(15);
    });

    it('5. With ordersAhead in queue: ETA sums ordersAhead + own order', async () => {
      const orderAhead = {
        id: 'order-ahead',
        colorPages: 4,
        bwPages: 2,
        createdAt: new Date('2026-06-01T11:50:00Z'),
      };

      prismaMock.order.findMany
        .mockResolvedValueOnce([]) // completed orders (under 10, fallback 1.5)
        .mockResolvedValueOnce([orderAhead]); // ordersAhead

      // Fallback rate = 1.5 mins per page.
      // orderAhead: 4 color, 2 bw -> 6 pages * 1.5 = 9 mins
      // targetOrder: 2 color, 5 bw -> 7 pages * 1.5 = 10.5 mins
      // expected ETA = 9 + 10.5 = 19.5 -> rounded to 20
      const eta = await service.computeETA(mockTargetOrder);

      expect(eta).toBe(20);
    });
  });
});
