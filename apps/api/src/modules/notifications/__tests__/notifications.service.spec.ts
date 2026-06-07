import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: NotificationType.ORDER_PLACED,
  title: 'Order placed',
  body: 'Your order ORD-001 has been placed.',
  read: false,
  orderId: 'order-1',
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const mockDevices = [
  { id: 'dev-1', userId: 'user-1', token: 'ExpoToken[aaa]', deviceId: 'D1', updatedAt: new Date() },
  { id: 'dev-2', userId: 'user-1', token: 'ExpoToken[bbb]', deviceId: 'D2', updatedAt: new Date() },
  { id: 'dev-3', userId: 'user-1', token: 'ExpoToken[ccc]', deviceId: 'D3', updatedAt: new Date() },
];

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  userDevice: {
    findMany: jest.fn(),
    delete: jest.fn(),
  },
};

// ─── Mock Expo SDK ───────────────────────────────────────────────────────────

// sendPushNotificationsAsync is on the Expo prototype — mock at module level
jest.mock('expo-server-sdk', () => {
  const mockSend = jest.fn();
  return {
    Expo: jest.fn().mockImplementation(() => ({
      sendPushNotificationsAsync: mockSend,
    })),
    __mockSend: mockSend,
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockSend: mockSendPush } = require('expo-server-sdk') as {
  __mockSend: jest.Mock;
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  // ─── send core ─────────────────────────────────────────────────────────────

  describe('send', () => {
    it('creates DB row even when user has no devices', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.userDevice.findMany.mockResolvedValue([]);

      const result = await service.send({
        userId: 'user-1',
        type: NotificationType.ORDER_PLACED,
        title: 'Order placed',
        body: 'Your order ORD-001 has been placed.',
        orderId: 'order-1',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
      expect(mockSendPush).not.toHaveBeenCalled();
      expect(result.id).toBe('notif-1');
    });

    it('sends 3 Expo messages when user has 3 devices', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.userDevice.findMany.mockResolvedValue(mockDevices);
      mockSendPush.mockResolvedValue([
        { status: 'ok', id: 't1' },
        { status: 'ok', id: 't2' },
        { status: 'ok', id: 't3' },
      ]);

      await service.send({
        userId: 'user-1',
        type: NotificationType.ORDER_PLACED,
        title: 'Order placed',
        body: 'Your order ORD-001 has been placed.',
        orderId: 'order-1',
      });

      expect(mockSendPush).toHaveBeenCalledTimes(1);
      const [messages] = mockSendPush.mock.calls[0] as [unknown[]];
      expect(messages).toHaveLength(3);
      expect((messages[0] as { to: string }).to).toBe('ExpoToken[aaa]');
    });

    it('deletes UserDevice when ticket returns DeviceNotRegistered', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.userDevice.findMany.mockResolvedValue(mockDevices);
      mockPrisma.userDevice.delete.mockResolvedValue({});
      mockSendPush.mockResolvedValue([
        { status: 'ok', id: 't1' },
        {
          status: 'error',
          message: 'Device not registered',
          details: { error: 'DeviceNotRegistered' },
        },
        { status: 'ok', id: 't3' },
      ]);

      await service.send({
        userId: 'user-1',
        type: NotificationType.ORDER_PLACED,
        title: 'Order placed',
        body: 'body',
      });

      // Only device at index 1 (dev-2) should be deleted
      expect(mockPrisma.userDevice.delete).toHaveBeenCalledTimes(1);
      expect(mockPrisma.userDevice.delete).toHaveBeenCalledWith({
        where: { id: 'dev-2' },
      });
    });

    it('DB row saved even when Expo SDK throws', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);
      mockPrisma.userDevice.findMany.mockResolvedValue(mockDevices);
      mockSendPush.mockRejectedValue(new Error('Expo network error'));

      // Must NOT throw
      const result = await service.send({
        userId: 'user-1',
        type: NotificationType.ORDER_PLACED,
        title: 'Order placed',
        body: 'body',
      });

      expect(result.id).toBe('notif-1');
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  // ─── 12 helpers ─────────────────────────────────────────────────────────────

  describe('event helpers produce correct NotificationType in DB', () => {
    const order = { id: 'order-1', orderNumber: 'ORD-001' };
    const customer = { id: 'user-1' };
    const shop = { id: 'shop-1', name: 'PrintHub' };

    beforeEach(() => {
      mockPrisma.notification.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'n', ...data, read: false, createdAt: new Date() }),
      );
      mockPrisma.userDevice.findMany.mockResolvedValue([]);
    });

    it.each([
      ['notifyOrderPlaced', () => service.notifyOrderPlaced(order, customer), NotificationType.ORDER_PLACED],
      ['notifyOrderAccepted', () => service.notifyOrderAccepted(order, customer), NotificationType.ORDER_ACCEPTED],
      ['notifyOrderReady', () => service.notifyOrderReady(order, customer), NotificationType.ORDER_READY],
      ['notifyWalletTopup', () => service.notifyWalletTopup('user-1', 500), NotificationType.WALLET_TOPUP],
      ['notifyWalletDeducted', () => service.notifyWalletDeducted('user-1', 200, 'order-1', 'ORD-001'), NotificationType.WALLET_DEDUCTED],
      ['notifyShopApproved', () => service.notifyShopApproved(shop, 'user-1'), NotificationType.SHOP_APPROVED],
      ['notifyShopRejected', () => service.notifyShopRejected(shop, 'user-1', 'Bad docs'), NotificationType.SHOP_REJECTED],
      ['notifyShopSuspended', () => service.notifyShopSuspended(shop, 'user-1'), NotificationType.SHOP_SUSPENDED],
      ['notifyStaffAssigned', () => service.notifyStaffAssigned('user-1', 'PrintHub'), NotificationType.STAFF_ASSIGNED],
      ['notifyLowBalance', () => service.notifyLowBalance('user-1', 50), NotificationType.LOW_BALANCE],
    ])('%s sets correct type', async (_name, callHelper, expectedType) => {
      await callHelper();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ type: expectedType }) }),
      );
    });

    it('notifyOrderCancelled fans out to customer + all staff', async () => {
      const staff = [{ id: 'staff-1' }, { id: 'staff-2' }];
      await service.notifyOrderCancelled(order, customer, staff);
      // 3 recipients: customer + 2 staff
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(3);
      const types = mockPrisma.notification.create.mock.calls.map(
        ([{ data }]: [{ data: { type: NotificationType } }]) => data.type,
      );
      expect(types).toEqual([
        NotificationType.ORDER_CANCELLED,
        NotificationType.ORDER_CANCELLED,
        NotificationType.ORDER_CANCELLED,
      ]);
    });

    it('notifyNewOrder fans out to all staff/owners only', async () => {
      const staff = [{ id: 'staff-1' }, { id: 'owner-1' }];
      await service.notifyNewOrder(order, 'Alice', staff);
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(2);
      const types = mockPrisma.notification.create.mock.calls.map(
        ([{ data }]: [{ data: { type: NotificationType } }]) => data.type,
      );
      expect(types).toEqual([NotificationType.NEW_ORDER, NotificationType.NEW_ORDER]);
    });
  });

  // ─── list / mark-read ───────────────────────────────────────────────────────

  describe('listForUser', () => {
    it('scopes results to current user only', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotification]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.listForUser('user-1', 1, 20, false);

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('returns empty data array when no notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      const result = await service.listForUser('user-1', 1, 20, false);
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('markRead', () => {
    it('throws ForbiddenException when notification belongs to different user', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        ...mockNotification,
        userId: 'other-user',
      });

      await expect(service.markRead('notif-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when notification not found', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markRead('notif-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAllRead', () => {
    it("marks all current user's unread notifications as read", async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllRead('user-1');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', read: false },
        data: { read: true },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
