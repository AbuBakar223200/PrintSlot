import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { ColorMode, PaperSize, Orientation, PickupMode, PaymentMethod } from '@printslot/shared';
import { Prisma } from '@prisma/client';
import { OrdersService } from '../orders.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { SlotsService } from '../../slots/slots.service';
import { WalletService } from '../../wallet/wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CLOUDINARY_PROVIDER } from '../../../config/cloudinary.config';

const mockShop = {
  id: 'shop-1',
  name: 'Campus Print',
  status: 'ACTIVE',
  colorRate: new Prisma.Decimal(10),
  bwRate: new Prisma.Decimal(3),
  a3Surcharge: new Prisma.Decimal(5),
  duplexDiscount: new Prisma.Decimal(0.2),
};

const mockCustomer = {
  id: 'customer-1',
  name: 'Alice Cooper',
};

const mockSlot = {
  id: 'slot-1',
  shopId: 'shop-1',
  templateId: 'template-1',
  date: new Date().toISOString(),
  isOpen: true,
  maxOrders: 20,
  currentCount: 5,
};

const mockPrisma = {
  shop: {
    findUnique: jest.fn().mockResolvedValue(mockShop),
  },
  user: {
    findUnique: jest.fn().mockResolvedValue(mockCustomer),
  },
  $transaction: jest.fn(),
};

const mockSlotsService = {
  getActiveSlot: jest.fn(),
  getSlotById: jest.fn(),
};

const mockWalletService = {
  debit: jest.fn(),
};

const mockNotifications = {
  notifyOrderPlaced: jest.fn().mockResolvedValue({}),
  notifyNewOrder: jest.fn().mockResolvedValue({}),
};

import { OrdersGateway } from '../orders.gateway';

const mockCloudinary = {
  uploader: {
    rename: jest.fn().mockResolvedValue({}),
  },
};

const mockOrdersGateway = {
  emitStatusChanged: jest.fn(),
  emitQueueUpdated: jest.fn(),
};

describe('OrdersService - createOrder Flow', () => {
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

  const txMock = {
    $queryRawUnsafe: jest.fn().mockResolvedValue([{ nextval: 42 }]),
    shopSlot: {
      update: jest.fn().mockResolvedValue(mockSlot),
    },
    order: {
      create: jest.fn(),
    },
  } as any;

  const validDto = {
    shopId: 'shop-1',
    pickupMode: PickupMode.QUEUE,
    paymentMethod: PaymentMethod.WALLET,
    files: [
      {
        fileUrl: 'https://res.cloudinary.com/demo/raw/upload/printslot/pending/pdf/doc1.pdf',
        fileName: 'doc1.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        detectedPages: 5,
        colorMode: ColorMode.COLOR,
        paperSize: PaperSize.A4,
        orientation: Orientation.PORTRAIT,
        copies: 1,
        duplex: false,
      },
    ],
  };

  it('1. QUEUE order with active slot, WALLET payment, sufficient balance → Order created, slot count incremented, debit row inserted, notifications fired', async () => {
    mockSlotsService.getActiveSlot.mockResolvedValueOnce(mockSlot);
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(txMock));

    const createdOrderMock = {
      id: 'order-123',
      orderNumber: 'PS-00042',
      customerId: 'customer-1',
      shopId: 'shop-1',
      pickupMode: PickupMode.QUEUE,
      slotId: 'slot-1',
      paymentMethod: PaymentMethod.WALLET,
      totalPages: 5,
      colorPages: 5,
      bwPages: 0,
      totalPrice: new Prisma.Decimal(50),
      orderFiles: [
        {
          id: 'file-123',
          fileUrl: validDto.files[0].fileUrl,
          fileName: validDto.files[0].fileName,
          subtotalPrice: new Prisma.Decimal(50),
        },
      ],
    };
    txMock.order.create.mockResolvedValueOnce(createdOrderMock);

    const result = await service.createOrder('customer-1', validDto);

    // Verify 100% correct aggregation output
    expect(result.orderNumber).toBe('PS-00042');
    expect(result.totalPrice).toBe(50);
    expect(result.orderFiles[0].subtotalPrice).toBe(50);

    // Verify wallet debit called inside transaction
    expect(mockWalletService.debit).toHaveBeenCalledWith('customer-1', 50, expect.any(String), txMock);

    // Verify slot capacity incremented in transaction
    expect(txMock.shopSlot.update).toHaveBeenCalledWith({
      where: { id: 'slot-1' },
      data: { currentCount: { increment: 1 } },
    });

    // Verify notifications fanned out post-commit
    await new Promise((resolve) => process.nextTick(resolve));
    expect(mockNotifications.notifyOrderPlaced).toHaveBeenCalledWith(createdOrderMock, { id: 'customer-1' });
    expect(mockNotifications.notifyNewOrder).toHaveBeenCalledWith(createdOrderMock, 'Alice Cooper', expect.any(Array));

    // Verify Cloudinary file renaming triggered
    expect(mockCloudinary.uploader.rename).toHaveBeenCalledWith(
      'printslot/pending/pdf/doc1.pdf',
      expect.stringContaining('printslot/orders/'),
    );
  });

  it('2. QUEUE order with no active slot → throws 400', async () => {
    mockSlotsService.getActiveSlot.mockResolvedValueOnce(null);

    await expect(service.createOrder('customer-1', validDto)).rejects.toThrow(
      new BadRequestException('No active slot — Print Now unavailable'),
    );
  });

  it('3. SLOT order with slot 4 days ahead → throws 400', async () => {
    const farAheadSlot = {
      ...mockSlot,
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    };
    mockSlotsService.getSlotById.mockResolvedValueOnce(farAheadSlot);

    const slotDto = {
      ...validDto,
      pickupMode: PickupMode.SLOT,
      slotId: 'slot-1',
    };

    await expect(service.createOrder('customer-1', slotDto)).rejects.toThrow(
      new BadRequestException('Slot date must be within today to 3 days ahead'),
    );
  });

  it('4. SLOT order with full slot → throws 409', async () => {
    const fullSlot = {
      ...mockSlot,
      currentCount: 20,
      maxOrders: 20,
    };
    mockSlotsService.getSlotById.mockResolvedValueOnce(fullSlot);

    const slotDto = {
      ...validDto,
      pickupMode: PickupMode.SLOT,
      slotId: 'slot-1',
    };

    await expect(service.createOrder('customer-1', slotDto)).rejects.toThrow(
      new HttpException('Slot is full', HttpStatus.CONFLICT),
    );
  });

  it('5. WALLET order with insufficient balance → throws 402; no Order, no debit row, no slot increment', async () => {
    mockSlotsService.getActiveSlot.mockResolvedValueOnce(mockSlot);
    mockWalletService.debit.mockRejectedValueOnce(new HttpException('Insufficient balance', 402));

    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(txMock));

    await expect(service.createOrder('customer-1', validDto)).rejects.toThrow(
      new HttpException('Insufficient balance', 402),
    );

    expect(txMock.order.create).not.toHaveBeenCalled();
  });

  it('6. CASH order → Order created without debit row', async () => {
    mockSlotsService.getActiveSlot.mockResolvedValueOnce(mockSlot);
    mockPrisma.$transaction.mockImplementationOnce(async (cb) => cb(txMock));

    const cashDto = {
      ...validDto,
      paymentMethod: PaymentMethod.CASH,
    };

    const createdOrderMock = {
      id: 'order-123',
      orderNumber: 'PS-00042',
      customerId: 'customer-1',
      shopId: 'shop-1',
      pickupMode: PickupMode.QUEUE,
      slotId: 'slot-1',
      paymentMethod: PaymentMethod.CASH,
      totalPages: 5,
      colorPages: 5,
      bwPages: 0,
      totalPrice: new Prisma.Decimal(50),
      orderFiles: [],
    };
    txMock.order.create.mockResolvedValueOnce(createdOrderMock);

    await service.createOrder('customer-1', cashDto);

    // Verify wallet debit NOT called
    expect(mockWalletService.debit).not.toHaveBeenCalled();
  });
});
