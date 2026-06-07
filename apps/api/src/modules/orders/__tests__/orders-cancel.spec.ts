import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionReason } from '@printslot/shared';
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
  notifyOrderCancelled: jest.fn().mockResolvedValue(undefined),
};
const mockCloudinary = { uploader: { rename: jest.fn() } };
const mockOrdersGateway = { emitStatusChanged: jest.fn(), emitQueueUpdated: jest.fn() };

const customerUser = { id: 'cust-1', role: 'CUSTOMER', shopId: null };
const otherCustomer = { id: 'cust-other', role: 'CUSTOMER', shopId: null };
const staffUser = { id: 'staff-1', role: 'STAFF', shopId: 'shop-1' };

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
  customer: { id: 'cust-1', name: 'Test Customer' },
  shop: { id: 'shop-1', name: 'Test Shop', ownerId: 'owner-1', defaultProcessingMins: 15 },
};

describe('OrdersService - cancelOrder', () => {
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

  // Test 7: cancelOrder of QUEUED WALLET order — refund + slot decrement
  it('7. cancelOrder of QUEUED WALLET order: status CANCELLED, refund inserted, slot decremented', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    const txMock = {
      order: {
        update: jest.fn().mockResolvedValue({
          ...baseOrder,
          status: 'CANCELLED',
          cancelledAt: new Date(),
        }),
      },
      shopSlot: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));

    // Stub post-commit notification query
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'staff-1' }]);

    const result = await service.cancelOrder('order-1', customerUser);

    expect(result.status).toBe('CANCELLED');
    expect(txMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'order-1' },
        data: expect.objectContaining({ status: 'CANCELLED' }),
      }),
    );
    expect(mockWalletService.credit).toHaveBeenCalledWith(
      'cust-1',
      100,
      TransactionReason.ORDER_REFUND,
      'order-1',
      txMock,
    );
    expect(txMock.shopSlot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'slot-1' },
        data: { currentCount: { decrement: 1 } },
      }),
    );
  });

  // Test 8: cancelOrder of QUEUED CASH order — no wallet credit, slot still decremented
  it('8. cancelOrder of QUEUED CASH order: status CANCELLED, no wallet row, slot decremented', async () => {
    const cashOrder = { ...baseOrder, paymentMethod: 'CASH' };
    mockPrisma.order.findUnique.mockResolvedValueOnce(cashOrder);

    const txMock = {
      order: {
        update: jest.fn().mockResolvedValue({
          ...cashOrder,
          status: 'CANCELLED',
          cancelledAt: new Date(),
        }),
      },
      shopSlot: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));
    mockPrisma.user.findMany.mockResolvedValueOnce([]);

    const result = await service.cancelOrder('order-1', customerUser);

    expect(result.status).toBe('CANCELLED');
    expect(mockWalletService.credit).not.toHaveBeenCalled();
    expect(txMock.shopSlot.update).toHaveBeenCalled();
  });

  // Test 9: cancelOrder of PROCESSING order → 400
  it('9. cancelOrder of PROCESSING: 400', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: 'PROCESSING',
    });

    await expect(
      service.cancelOrder('order-1', customerUser),
    ).rejects.toThrow(BadRequestException);
  });

  // Test 10: cancelOrder of another customer's order → 403
  it('10. cancelOrder of another customer\'s order: 403', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    await expect(
      service.cancelOrder('order-1', otherCustomer),
    ).rejects.toThrow(ForbiddenException);
  });

  // Already cancelled → 400
  it('cancelOrder of already CANCELLED order: 400', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce({
      ...baseOrder,
      status: 'CANCELLED',
    });

    await expect(
      service.cancelOrder('order-1', customerUser),
    ).rejects.toThrow(BadRequestException);
  });

  // STAFF cannot cancel → 403
  it('STAFF cannot cancel order → 403', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    await expect(
      service.cancelOrder('order-1', staffUser),
    ).rejects.toThrow(ForbiddenException);
  });

  // Order not found → 404
  it('cancelOrder nonexistent order → 404', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.cancelOrder('nonexistent', customerUser),
    ).rejects.toThrow(NotFoundException);
  });

  // Test 11 & 12: Notification + gateway emit after commit
  it('11+12. Notification dispatched and gateway emit fired after commit', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder);

    const txMock = {
      order: {
        update: jest.fn().mockResolvedValue({
          ...baseOrder,
          status: 'CANCELLED',
          cancelledAt: new Date(),
        }),
      },
      shopSlot: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(txMock));
    mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'staff-1' }]);

    await service.cancelOrder('order-1', customerUser);

    // Flush process.nextTick + all microtasks from the async callback
    await new Promise<void>((resolve) => process.nextTick(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));
    // One more tick to let the awaited promises inside nextTick resolve
    await new Promise<void>((resolve) => process.nextTick(resolve));

    expect(mockNotifications.notifyOrderCancelled).toHaveBeenCalledWith(
      { id: 'order-1', orderNumber: 'ORD-001' },
      { id: 'cust-1' },
      [{ id: 'staff-1' }],
    );
    expect(mockOrdersGateway.emitStatusChanged).toHaveBeenCalledWith(
      'order-1',
      'CANCELLED',
      expect.any(Date),
    );
  });
});
