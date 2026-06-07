import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SlotsService } from '../../slots/slots.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CLOUDINARY_PROVIDER } from '../../../config/cloudinary.config';
import { OrdersGateway } from '../orders.gateway';

const mockPrisma = {
  shop: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  order: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  shopSlot: { update: jest.fn() },
  $transaction: jest.fn(),
};

const mockSlotsService = { getActiveSlot: jest.fn(), getSlotById: jest.fn() };
const mockWalletService = { debit: jest.fn(), credit: jest.fn() };
const mockNotifications = {
  notifyOrderPlaced: jest.fn(),
  notifyNewOrder: jest.fn(),
  notifyOrderCancelled: jest.fn(),
};
const mockCloudinary = { uploader: { rename: jest.fn() } };
const mockOrdersGateway = { emitStatusChanged: jest.fn(), emitQueueUpdated: jest.fn() };

const customerUser = { id: 'cust-1', role: 'CUSTOMER', shopId: null };
const staffUser = { id: 'staff-1', role: 'STAFF', shopId: 'shop-1' };
const staffNoShop = { id: 'staff-2', role: 'STAFF', shopId: null };

const baseOrder = {
  id: 'order-1',
  orderNumber: 'ORD-001',
  customerId: 'cust-1',
  shopId: 'shop-1',
  pickupMode: 'QUEUE',
  slotId: 'slot-1',
  status: 'QUEUED',
  paymentMethod: 'WALLET',
  totalPages: 10,
  colorPages: 5,
  bwPages: 5,
  totalPrice: new Prisma.Decimal(100),
  processingStartedAt: null,
  readyAt: null,
  cancelledAt: null,
  createdAt: new Date('2026-06-07T10:00:00Z'),
  updatedAt: new Date('2026-06-07T10:00:00Z'),
  orderFiles: [],
  shop: { id: 'shop-1', name: 'Test Shop', ownerId: 'owner-1', defaultProcessingMins: 15 },
  slot: {
    id: 'slot-1',
    date: '2026-06-07',
    template: { startTime: '09:00' },
  },
};

const slotOrder = {
  ...baseOrder,
  id: 'order-2',
  pickupMode: 'SLOT',
  createdAt: new Date('2026-06-07T11:00:00Z'),
  slot: {
    id: 'slot-2',
    date: '2026-06-07',
    template: { startTime: '10:00' },
  },
};

describe('OrdersService - listOrders & getOrderById', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SlotsService, useValue: mockSlotsService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: CLOUDINARY_PROVIDER, useValue: mockCloudinary },
        { provide: OrdersGateway, useValue: mockOrdersGateway },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // Test 1: CUSTOMER sees only their own orders
  it('1. listOrders as CUSTOMER returns only that customer\'s orders', async () => {
    mockPrisma.order.count.mockResolvedValueOnce(1);
    mockPrisma.order.findMany.mockResolvedValueOnce([baseOrder]);

    const result = await service.listOrders(customerUser);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'cust-1' },
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  // Test 2: STAFF sees only that shop's orders
  it('2. listOrders as STAFF returns only that shop\'s orders', async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([baseOrder]);

    const result = await service.listOrders(staffUser);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { shopId: 'shop-1' },
      }),
    );
    expect(result.data).toHaveLength(1);
  });

  // Test 3: SLOT orders come before QUEUE orders for staff
  it('3. listOrders sort: SLOT before QUEUE (for staff)', async () => {
    mockPrisma.order.findMany.mockResolvedValueOnce([baseOrder, slotOrder]);

    const result = await service.listOrders(staffUser);

    expect(result.data[0].pickupMode).toBe('SLOT');
    expect(result.data[1].pickupMode).toBe('QUEUE');
  });

  // Test 4: getOrderById returns 404 for nonexistent ID
  it('4. getOrderById returns 404 for nonexistent ID', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.getOrderById('nonexistent-id', customerUser),
    ).rejects.toThrow(NotFoundException);
  });

  // Test 5: getOrderById returns 403 for other customer's order
  it('5. getOrderById returns 403 for other customer\'s order', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      customerId: 'cust-other',
    });

    await expect(
      service.getOrderById('order-1', customerUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // Test 6: getOrderById includes queuePosition and etaMins for QUEUED order
  it('6. getOrderById includes queuePosition and etaMins for QUEUED order', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);
    // computeQueuePosition calls
    mockPrisma.order.count.mockResolvedValueOnce(2);
    // computeETA calls
    mockPrisma.order.findMany.mockResolvedValueOnce([]); // lastDone
    mockPrisma.order.findMany.mockResolvedValueOnce([]); // ordersAhead

    const result = await service.getOrderById('order-1', customerUser);

    expect(result.queuePosition).toBeDefined();
    expect(typeof result.queuePosition).toBe('number');
    expect(result.etaMins).toBeDefined();
    expect(typeof result.etaMins).toBe('number');
  });

  // Test 14: GET /orders with no shopId as STAFF → 403
  it('14. STAFF with no shopId throws 403', async () => {
    await expect(
      service.listOrders(staffNoShop),
    ).rejects.toThrow(ForbiddenException);
  });

  // Pagination: clamp limit > 100 to 100
  it('Pagination: clamp limit > 100 to 100', async () => {
    mockPrisma.order.count.mockResolvedValueOnce(0);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);

    const result = await service.listOrders(customerUser, 1, 200);

    expect(result.pagination.limit).toBe(100);
  });

  // Empty page returns data: []
  it('Empty page beyond available returns data: []', async () => {
    mockPrisma.order.count.mockResolvedValueOnce(1);
    mockPrisma.order.findMany.mockResolvedValueOnce([]);

    const result = await service.listOrders(customerUser, 999, 20);

    expect(result.data).toEqual([]);
  });
});
