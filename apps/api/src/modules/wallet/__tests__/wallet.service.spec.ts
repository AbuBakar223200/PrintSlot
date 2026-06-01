import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { TransactionReason, TransactionType } from '@printslot/shared';
import { Prisma } from '@prisma/client';
import { WalletService } from '../wallet.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

const mockPrisma = {
  walletTransaction: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  appConfig: {
    findUnique: jest.fn(),
  },
};

const mockNotifications = {
  notifyWalletTopup: jest.fn().mockResolvedValue({}),
  notifyWalletDeducted: jest.fn().mockResolvedValue({}),
  notifyLowBalance: jest.fn().mockResolvedValue({}),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  describe('getBalance', () => {
    it('1. getBalance with no transactions returns 0', async () => {
      mockPrisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: null } }); // debits

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(0);
      expect(mockPrisma.walletTransaction.aggregate).toHaveBeenCalledTimes(2);
    });

    it('2. getBalance after CREDIT 100 → 100', async () => {
      mockPrisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(100) } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: null } }); // debits

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(100);
    });

    it('3. getBalance after CREDIT 100 + DEBIT 30 → 70', async () => {
      mockPrisma.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(100) } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(30) } }); // debits

      const balance = await service.getBalance('user-1');

      expect(balance).toBe(70);
    });
  });

  describe('debit', () => {
    const txMock = {
      walletTransaction: {
        aggregate: jest.fn(),
        create: jest.fn(),
      },
      order: {
        findUnique: jest.fn().mockResolvedValue({ orderNumber: 'ORD123' }),
      },
      appConfig: {
        findUnique: jest.fn().mockResolvedValue({ value: '50' }),
      },
    } as any;

    it('4. debit with insufficient balance throws 402', async () => {
      txMock.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(50) } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(20) } }); // debits => balance 30

      await expect(service.debit('user-1', 40, 'order-1', txMock)).rejects.toThrow(
        new HttpException('Insufficient balance', 402),
      );

      expect(txMock.walletTransaction.create).not.toHaveBeenCalled();
    });

    it('5. debit inserts a DEBIT row with correct reason', async () => {
      txMock.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(100) } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: null } }); // debits

      await service.debit('user-1', 40, 'order-1', txMock);

      expect(txMock.walletTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: TransactionType.DEBIT,
          amount: new Prisma.Decimal(40),
          reason: TransactionReason.ORDER_PAYMENT,
          orderId: 'order-1',
        },
      });
    });

    it('9. LOW_BALANCE notification fires when post-debit balance < threshold', async () => {
      txMock.walletTransaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(100) } }) // credits
        .mockResolvedValueOnce({ _sum: { amount: new Prisma.Decimal(20) } }); // debits => balance 80

      txMock.appConfig.findUnique.mockResolvedValueOnce({ value: '50' }); // threshold

      await service.debit('user-1', 40, 'order-1', txMock); // new balance = 40 (< 50)

      // Allow tick event handlers to fire
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockNotifications.notifyWalletDeducted).toHaveBeenCalledWith(
        'user-1',
        40,
        'order-1',
        'ORD123',
      );
      expect(mockNotifications.notifyLowBalance).toHaveBeenCalledWith('user-1', 40);
    });
  });

  describe('credit', () => {
    it('6. credit with TOPUP_ADMIN inserts CREDIT and triggers WALLET_TOPUP', async () => {
      await service.credit('user-1', 500, TransactionReason.TOPUP_ADMIN);

      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: TransactionType.CREDIT,
          amount: new Prisma.Decimal(500),
          reason: TransactionReason.TOPUP_ADMIN,
          orderId: null,
        },
      });

      await new Promise((resolve) => process.nextTick(resolve));
      expect(mockNotifications.notifyWalletTopup).toHaveBeenCalledWith('user-1', 500);
    });

    it('7. credit with ORDER_REFUND inserts CREDIT without auto-notification', async () => {
      await service.credit('user-1', 200, TransactionReason.ORDER_REFUND, 'order-123');

      expect(mockPrisma.walletTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: TransactionType.CREDIT,
          amount: new Prisma.Decimal(200),
          reason: TransactionReason.ORDER_REFUND,
          orderId: 'order-123',
        },
      });

      await new Promise((resolve) => process.nextTick(resolve));
      // Wallet top-up should not trigger since it is order refund
      expect(mockNotifications.notifyWalletTopup).not.toHaveBeenCalled();
    });
  });

  describe('adminTopup', () => {
    it('8. adminTopup validators and error checks', async () => {
      // Validator boundaries
      await expect(service.adminTopup('admin-1', 'user-1', 5)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.adminTopup('admin-1', 'user-1', 15000)).rejects.toThrow(
        BadRequestException,
      );

      // Nonexistent recipient
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      await expect(service.adminTopup('admin-1', 'user-no-exist', 100)).rejects.toThrow(
        NotFoundException,
      );

      // Valid case
      const createdTx = {
        id: 'tx-1',
        userId: 'user-1',
        type: 'CREDIT',
        amount: new Prisma.Decimal(100),
        reason: 'TOPUP_ADMIN',
        orderId: null,
        createdAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1' });
      mockPrisma.walletTransaction.findFirst.mockResolvedValueOnce(createdTx);

      const result = await service.adminTopup('admin-1', 'user-1', 100);
      expect(result.id).toBe('tx-1');
      expect(result.amount).toBe(100);
    });
  });
});
