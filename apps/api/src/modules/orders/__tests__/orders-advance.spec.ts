import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { OrderStatus, Role } from '@printslot/shared';
import request from 'supertest';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SlotsService } from '../../slots/slots.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { OrdersGateway } from '../orders.gateway';
import { CLOUDINARY_PROVIDER } from '../../../config/cloudinary.config';
import { OrdersController } from '../orders.controller';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// ── Mocks ────────────────────────────────────────────────────────────────────

const SHOP_ID = 'shop-1';
const ORDER_ID = 'order-1';
const STAFF_USER = { id: 'staff-1', role: 'STAFF', shopId: SHOP_ID };
const OWNER_USER = { id: 'owner-1', role: 'SHOP_OWNER', shopId: SHOP_ID };
const CUSTOMER_USER = { id: 'cust-1', role: 'CUSTOMER', shopId: null };
const OTHER_SHOP_STAFF = { id: 'staff-2', role: 'STAFF', shopId: 'other-shop' };

const baseOrder = (status: string) => ({
  id: ORDER_ID,
  orderNumber: 'PS-00001',
  shopId: SHOP_ID,
  customerId: 'cust-1',
  status,
  customer: { id: 'cust-1', name: 'Customer' },
  updatedAt: new Date('2026-06-01'),
});

const mockPrisma = {
  order: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockSlotsService = {};
const mockWalletService = { debit: jest.fn(), getBalance: jest.fn() };
const mockNotifications = {
  notifyOrderAccepted: jest.fn().mockResolvedValue({}),
  notifyOrderReady: jest.fn().mockResolvedValue({}),
};
const mockGateway = {
  emitStatusChanged: jest.fn().mockResolvedValue(undefined),
};
const mockCloudinary = {};

// ── Service Tests ────────────────────────────────────────────────────────────

describe('OrdersService - advanceStatus', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SlotsService, useValue: mockSlotsService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: OrdersGateway, useValue: mockGateway },
        { provide: CLOUDINARY_PROVIDER, useValue: mockCloudinary },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // Helper to flush nextTick callbacks
  const flushNextTick = () =>
    new Promise<void>((resolve) => process.nextTick(() => setImmediate(resolve)));

  // 1. QUEUED → PROCESSING
  it('1. QUEUED → PROCESSING: status updated, processingStartedAt set', async () => {
    const order = baseOrder('QUEUED');
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce({
      ...order,
      status: 'PROCESSING',
      processingStartedAt: new Date(),
    });

    const result = await service.advanceStatus(
      ORDER_ID,
      { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
      STAFF_USER,
    );

    expect(result.status).toBe('PROCESSING');
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PROCESSING',
          processingStartedAt: expect.any(Date),
        }),
      }),
    );
  });

  // 2. PROCESSING → READY
  it('2. PROCESSING → READY: readyAt set', async () => {
    const order = baseOrder('PROCESSING');
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce({
      ...order,
      status: 'READY',
      readyAt: new Date(),
    });

    const result = await service.advanceStatus(
      ORDER_ID,
      { status: 'READY', expectedCurrentStatus: 'PROCESSING' },
      OWNER_USER,
    );

    expect(result.status).toBe('READY');
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'READY',
          readyAt: expect.any(Date),
        }),
      }),
    );
  });

  // 3. READY → COLLECTED
  it('3. READY → COLLECTED: updates updatedAt only', async () => {
    const order = baseOrder('READY');
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce({
      ...order,
      status: 'COLLECTED',
    });

    const result = await service.advanceStatus(
      ORDER_ID,
      { status: 'COLLECTED', expectedCurrentStatus: 'READY' },
      STAFF_USER,
    );

    expect(result.status).toBe('COLLECTED');
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'COLLECTED' },
      }),
    );
  });

  // 4. QUEUED → READY: 400 (skip step)
  it('4. QUEUED → READY: 400', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder('QUEUED'));

    await expect(
      service.advanceStatus(
        ORDER_ID,
        { status: 'READY', expectedCurrentStatus: 'QUEUED' },
        STAFF_USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // 5. PROCESSING → QUEUED: 400 (backward)
  it('5. PROCESSING → QUEUED: 400 (backward)', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder('PROCESSING'));

    await expect(
      service.advanceStatus(
        ORDER_ID,
        { status: 'QUEUED', expectedCurrentStatus: 'PROCESSING' },
        STAFF_USER,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  // 6. Optimistic lock mismatch: 409
  it('6. Optimistic lock mismatch: 409', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder('PROCESSING'));

    await expect(
      service.advanceStatus(
        ORDER_ID,
        { status: 'READY', expectedCurrentStatus: 'QUEUED' },
        STAFF_USER,
      ),
    ).rejects.toThrow(
      new HttpException('Order status has changed, please refresh.', HttpStatus.CONFLICT),
    );
  });

  // 7. Different shop: 403
  it('7. Different shop: 403', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder('QUEUED'));

    await expect(
      service.advanceStatus(
        ORDER_ID,
        { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
        OTHER_SHOP_STAFF,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 8. CUSTOMER role: 403
  it('8. CUSTOMER role: 403', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(baseOrder('QUEUED'));

    await expect(
      service.advanceStatus(
        ORDER_ID,
        { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
        CUSTOMER_USER,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  // 9. Gateway emit called with correct args
  it('9. Gateway emit called with correct args', async () => {
    const order = baseOrder('QUEUED');
    const updatedOrder = { ...order, status: 'PROCESSING', updatedAt: new Date('2026-06-02') };
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce(updatedOrder);

    await service.advanceStatus(
      ORDER_ID,
      { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
      STAFF_USER,
    );
    await flushNextTick();

    expect(mockGateway.emitStatusChanged).toHaveBeenCalledWith(
      ORDER_ID,
      'PROCESSING',
      updatedOrder.updatedAt,
    );
  });

  // 10. Notification fired for PROCESSING and READY; not for COLLECTED
  it('10a. Notification fired for PROCESSING (ORDER_ACCEPTED)', async () => {
    const order = baseOrder('QUEUED');
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce({ ...order, status: 'PROCESSING' });

    await service.advanceStatus(
      ORDER_ID,
      { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
      STAFF_USER,
    );
    await flushNextTick();

    expect(mockNotifications.notifyOrderAccepted).toHaveBeenCalledWith(
      { id: ORDER_ID, orderNumber: 'PS-00001' },
      { id: 'cust-1' },
    );
    expect(mockNotifications.notifyOrderReady).not.toHaveBeenCalled();
  });

  it('10b. Notification fired for READY (ORDER_READY)', async () => {
    const order = baseOrder('PROCESSING');
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce({ ...order, status: 'READY' });

    await service.advanceStatus(
      ORDER_ID,
      { status: 'READY', expectedCurrentStatus: 'PROCESSING' },
      STAFF_USER,
    );
    await flushNextTick();

    expect(mockNotifications.notifyOrderReady).toHaveBeenCalledWith(
      { id: ORDER_ID, orderNumber: 'PS-00001' },
      { id: 'cust-1' },
    );
    expect(mockNotifications.notifyOrderAccepted).not.toHaveBeenCalled();
  });

  it('10c. No notification fired for COLLECTED', async () => {
    const order = baseOrder('READY');
    mockPrisma.order.findUnique.mockResolvedValueOnce(order);
    mockPrisma.order.update.mockResolvedValueOnce({ ...order, status: 'COLLECTED' });

    await service.advanceStatus(
      ORDER_ID,
      { status: 'COLLECTED', expectedCurrentStatus: 'READY' },
      STAFF_USER,
    );
    await flushNextTick();

    expect(mockNotifications.notifyOrderAccepted).not.toHaveBeenCalled();
    expect(mockNotifications.notifyOrderReady).not.toHaveBeenCalled();
  });

  // 11. Order not found: 404
  it('11. Order not found: 404', async () => {
    mockPrisma.order.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.advanceStatus(
        ORDER_ID,
        { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
        STAFF_USER,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

// ── Controller Tests ─────────────────────────────────────────────────────────

const mockOrdersService = {
  previewPrice: jest.fn(),
  createOrder: jest.fn(),
  listOrders: jest.fn(),
  getOrderById: jest.fn(),
  cancelOrder: jest.fn(),
  advanceStatus: jest.fn(),
};

const userForRole = (role: Role, shopId: string | null = null) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  role,
  shopId,
  language: 'EN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function createApp(role?: Role, shopId: string | null = null) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [OrdersController],
    providers: [
      RolesGuard,
      { provide: OrdersService, useValue: mockOrdersService },
      { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        if (!role) {
          throw new UnauthorizedException();
        }
        context.switchToHttp().getRequest().user = userForRole(role, shopId);
        return true;
      },
    })
    .compile();

  const app = module.createNestApplication();
  await app.init();
  jest.clearAllMocks();
  return app;
}

describe('OrdersController - advanceStatus', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  // 12. PATCH without JWT: 401
  it('12. PATCH /orders/:id/status without JWT → 401', async () => {
    app = await createApp();

    await request(app.getHttpServer())
      .patch('/orders/order-1/status')
      .send({ status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' })
      .expect(401);
  });

  // 13. PATCH with CUSTOMER role: 403
  it('13. PATCH /orders/:id/status with CUSTOMER role → 403', async () => {
    app = await createApp(Role.CUSTOMER);

    await request(app.getHttpServer())
      .patch('/orders/order-1/status')
      .send({ status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' })
      .expect(403);
  });

  // 14. PATCH with body missing expectedCurrentStatus: 400
  it('14. PATCH /orders/:id/status missing expectedCurrentStatus → 400', async () => {
    app = await createApp(Role.STAFF, SHOP_ID);

    await request(app.getHttpServer())
      .patch('/orders/order-1/status')
      .send({ status: 'PROCESSING' })
      .expect(400);
  });

  // 15. PATCH with STAFF role succeeds
  it('15. PATCH /orders/:id/status with STAFF role → calls advanceStatus', async () => {
    app = await createApp(Role.STAFF, SHOP_ID);
    mockOrdersService.advanceStatus.mockResolvedValueOnce({
      id: 'order-1',
      status: 'PROCESSING',
    });

    const res = await request(app.getHttpServer())
      .patch('/orders/order-1/status')
      .send({ status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' })
      .expect(200);

    expect(res.body.data.status).toBe('PROCESSING');
    expect(mockOrdersService.advanceStatus).toHaveBeenCalledWith(
      'order-1',
      { status: 'PROCESSING', expectedCurrentStatus: 'QUEUED' },
      expect.objectContaining({ role: Role.STAFF }),
    );
  });
});
