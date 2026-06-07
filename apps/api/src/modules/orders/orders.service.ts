import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ColorMode, PaperSize, TransactionReason, type OrderPriceResult } from '@printslot/shared';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CLOUDINARY_PROVIDER } from '../../config/cloudinary.config';
import { PrismaService } from '../../prisma/prisma.service';
import { SlotsService } from '../slots/slots.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { PreviewPriceDto } from './dto/preview-price.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import { parsePageRange } from './utils/pageRange';
import { OrdersGateway } from './orders.gateway';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: SlotsService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    @Inject(CLOUDINARY_PROVIDER)
    private readonly cloudinary: any,
    @Inject(forwardRef(() => OrdersGateway))
    private readonly ordersGateway: OrdersGateway,
  ) {}

  /**
   * Main atomic order creation logic.
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<any> {
    // 1. Load shop details
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
    });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }
    if (shop.status !== 'ACTIVE') {
      throw new BadRequestException('Shop is not currently accepting orders.');
    }

    // 2. Load customer details for notifications
    const customer = await this.prisma.user.findUnique({
      where: { id: customerId },
      select: { name: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 3. Resolve active slot or validate chosen slot
    let slotId = dto.slotId;
    if (dto.pickupMode === 'QUEUE') {
      const activeSlot = await this.slotsService.getActiveSlot(dto.shopId);
      if (!activeSlot) {
        throw new BadRequestException('No active slot — Print Now unavailable');
      }
      slotId = activeSlot.id;
    } else {
      if (!slotId) {
        throw new BadRequestException('slotId is required when pickupMode is SLOT');
      }
      const slot = await this.slotsService.getSlotById(slotId);
      if (slot.shopId !== dto.shopId) {
        throw new BadRequestException('Slot does not belong to this shop');
      }

      // Verify date within today -> today + 3 days (BST)
      const bstOffsetMs = 6 * 60 * 60 * 1000;
      const bstNow = new Date(Date.now() + bstOffsetMs);
      const todayStr = bstNow.toISOString().slice(0, 10);
      const bstPlus3 = new Date(bstNow.getTime() + 3 * 24 * 60 * 60 * 1000);
      const maxDateStr = bstPlus3.toISOString().slice(0, 10);

      const slotDateStr = slot.date.slice(0, 10);
      if (slotDateStr < todayStr || slotDateStr > maxDateStr) {
        throw new BadRequestException('Slot date must be within today to 3 days ahead');
      }
      if (!slot.isOpen) {
        throw new BadRequestException('Slot is not open');
      }
      if (slot.currentCount >= slot.maxOrders) {
        throw new HttpException('Slot is full', HttpStatus.CONFLICT);
      }
    }

    // 4. Calculate prices
    const filesForPricing = dto.files.map((f) => ({
      ...f,
      pageRange: f.pageRange || undefined,
    }));
    const pricing = this.calculatePrice(filesForPricing, shop);
    const orderId = randomUUID();

    // 5. Run transactional order placement
    const order = await this.prisma.$transaction(async (tx) => {
      // Generate order number inside transaction
      const result = await tx.$queryRawUnsafe<any[]>('SELECT nextval(\'order_number_seq\')');
      const nextVal = result[0]?.nextval || result[0]?.nextVal;
      const orderNumber = `PS-${Number(nextVal).toString().padStart(5, '0')}`;

      // A. If paymentMethod is WALLET, check balance first to throw early
      if (dto.paymentMethod === 'WALLET') {
        const currentBalance = await this.walletService.getBalance(customerId, tx);
        if (currentBalance < pricing.totalPrice) {
          throw new HttpException('Insufficient balance', HttpStatus.PAYMENT_REQUIRED);
        }
      }

      // B. Increment Slot capacity safely
      const updatedSlot = await tx.shopSlot.update({
        where: { id: slotId },
        data: { currentCount: { increment: 1 } },
      });
      if (updatedSlot.currentCount > updatedSlot.maxOrders) {
        throw new HttpException('Slot capacity exceeded', HttpStatus.CONFLICT);
      }

      // C. Insert Order and OrderFiles
      const createdOrder = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          customerId,
          shopId: dto.shopId,
          pickupMode: dto.pickupMode,
          slotId: slotId!,
          paymentMethod: dto.paymentMethod,
          totalPages: pricing.totalPages,
          colorPages: pricing.colorPages,
          bwPages: pricing.bwPages,
          totalPrice: new Prisma.Decimal(pricing.totalPrice),
          orderFiles: {
            create: dto.files.map((file, idx) => {
              const pricedFile = pricing.files[idx];
              return {
                fileUrl: file.fileUrl,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSize: file.fileSize,
                detectedPages: file.detectedPages,
                colorMode: file.colorMode,
                paperSize: file.paperSize,
                orientation: file.orientation,
                copies: file.copies,
                duplex: file.duplex,
                pageRange: file.pageRange || null,
                resolvedPages: pricedFile.resolvedPages,
                subtotalPrice: new Prisma.Decimal(pricedFile.subtotalPrice),
              };
            }),
          },
        },
        include: {
          orderFiles: true,
        },
      });

      // A. If paymentMethod is WALLET, debit funds atomically
      if (dto.paymentMethod === 'WALLET') {
        await this.walletService.debit(customerId, pricing.totalPrice, orderId, tx);
      }

      return createdOrder;
    });

    // 6. Post-commit notifications
    const shopWithStaff = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: {
        ownerId: true,
        staff: { select: { id: true } },
      },
    });

    const staffAndOwners = [
      { id: shopWithStaff!.ownerId },
      ...(shopWithStaff!.staff || []),
    ];
    const uniqueStaffAndOwners = Array.from(new Set(staffAndOwners.map((s) => s.id)))
      .map((id) => ({ id }));

    // Send customer notification
    process.nextTick(async () => {
      try {
        await this.notificationsService.notifyOrderPlaced(order, { id: customerId });
        await this.notificationsService.notifyNewOrder(order, customer.name, uniqueStaffAndOwners);
      } catch (err) {
        this.logger.error('Failed to dispatch order placement notifications', err);
      }
    });

    // 7. Fire-and-forget Cloudinary move
    dto.files.forEach((file) => {
      process.nextTick(async () => {
        await this.moveCloudinaryFile(file.fileUrl, orderId);
      });
    });

    return {
      ...order,
      totalPrice: Number(order.totalPrice.toString()),
      orderFiles: order.orderFiles.map((f) => ({
        ...f,
        subtotalPrice: Number(f.subtotalPrice.toString()),
      })),
    };
  }

  /**
   * Helper to parse the Cloudinary public_id from the URL and rename it.
   */
  private async moveCloudinaryFile(url: string, orderId: string): Promise<void> {
    try {
      const match = url.match(/printslot\/pending\/(pdf|image|docs)\/[^/]+$/);
      if (!match) return;
      const publicId = match[0];
      const targetPublicId = publicId.replace('printslot/pending', `printslot/orders/${orderId}`);
      await this.cloudinary.uploader.rename(publicId, targetPublicId);
    } catch (err) {
      this.logger.error('Failed to move Cloudinary file', err);
    }
  }

  async previewPrice(dto: PreviewPriceDto): Promise<OrderPriceResult> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: dto.shopId },
      select: {
        status: true,
        colorRate: true,
        bwRate: true,
        a3Surcharge: true,
        duplexDiscount: true,
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.status !== 'ACTIVE') {
      throw new BadRequestException('Shop is not currently accepting orders.');
    }

    return this.calculatePrice(dto.files, shop);
  }

  calculatePrice(
    files: PreviewPriceDto['files'],
    rates: {
      colorRate: any;
      bwRate: any;
      a3Surcharge: any;
      duplexDiscount: any;
    },
  ): OrderPriceResult {
    const colorRate = new Prisma.Decimal(rates.colorRate.toString());
    const bwRate = new Prisma.Decimal(rates.bwRate.toString());
    const a3Surcharge = new Prisma.Decimal(rates.a3Surcharge.toString());
    const duplexDiscount = new Prisma.Decimal(rates.duplexDiscount.toString());

    const pricedFiles = files.map((file) => {
      if (file.detectedPages <= 0) {
        throw new BadRequestException('File has no pages');
      }

      // 1. Resolve pages using pageRange parser
      let resolvedPages: number;
      try {
        const pagesList = parsePageRange(file.pageRange, file.detectedPages);
        resolvedPages = file.pageRange ? pagesList.length : file.detectedPages;
      } catch (e: any) {
        throw new BadRequestException(e.message || 'Invalid page range');
      }

      if (resolvedPages <= 0) {
        throw new BadRequestException('File has no resolved pages');
      }

      const totalPrintedPages = resolvedPages * file.copies;

      // 2. Base rate lookup
      const rate = file.colorMode === ColorMode.COLOR ? colorRate : bwRate;

      // base = resolvedPages × copies × rate
      const base = rate.mul(totalPrintedPages);

      // surcharge = paperSize === 'A3' ? resolvedPages × copies × shop.a3Surcharge : 0
      const surcharge =
        file.paperSize === PaperSize.A3
          ? a3Surcharge.mul(totalPrintedPages)
          : new Prisma.Decimal(0);

      // body = duplex ? base × (1 − shop.duplexDiscount) : base
      const duplexMultiplier = new Prisma.Decimal(1).sub(duplexDiscount);
      const body = file.duplex ? base.mul(duplexMultiplier) : base;

      // subtotal = body + surcharge
      const subtotalDecimal = body.add(surcharge);
      const subtotalPrice = this.roundDecimal(subtotalDecimal);

      const isColor = file.colorMode === ColorMode.COLOR;
      return {
        resolvedPages,
        subtotalPrice,
        colorPages: isColor ? totalPrintedPages : 0,
        bwPages: !isColor ? totalPrintedPages : 0,
      };
    });

    const totalPrice = this.roundDecimal(
      pricedFiles.reduce(
        (sum, file) => sum.add(new Prisma.Decimal(file.subtotalPrice)),
        new Prisma.Decimal(0),
      ),
    );

    const totalPages = pricedFiles.reduce(
      (sum, file) => sum + file.colorPages + file.bwPages,
      0,
    );

    const colorPages = pricedFiles.reduce((sum, file) => sum + file.colorPages, 0);
    const bwPages = pricedFiles.reduce((sum, file) => sum + file.bwPages, 0);

    return {
      files: pricedFiles,
      totalPrice,
      totalPages,
      colorPages,
      bwPages,
    };
  }

  private roundDecimal(decimal: Prisma.Decimal): number {
    return Math.round(decimal.toNumber() * 100) / 100;
  }

  async getOrderWithSlotAndShop(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        slot: true,
        shop: true,
      },
    });
  }

  async computeQueuePosition(orderIdOrOrder: string | any): Promise<number> {
    let order = typeof orderIdOrOrder === 'string'
      ? await this.getOrderWithSlotAndShop(orderIdOrOrder)
      : orderIdOrOrder;

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.slot) {
      order = await this.getOrderWithSlotAndShop(order.id);
    }

    const count = await this.prisma.order.count({
      where: {
        shopId: order.shopId,
        slot: { date: order.slot.date },
        status: { in: ['QUEUED', 'PROCESSING'] },
        createdAt: { lt: order.createdAt },
      },
    });

    return count + 1;
  }

  async computeETA(orderIdOrOrder: string | any): Promise<number> {
    let order = typeof orderIdOrOrder === 'string'
      ? await this.getOrderWithSlotAndShop(orderIdOrOrder)
      : orderIdOrOrder;

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.slot || !order.shop) {
      order = await this.getOrderWithSlotAndShop(order.id);
    }

    const shop = order.shop;

    // 1. Fetch last 20 completed orders that have color pages or bw pages
    const lastDone = await this.prisma.order.findMany({
      where: {
        shopId: shop.id,
        status: { in: ['READY', 'COLLECTED'] },
        OR: [
          { colorPages: { gt: 0 } },
          { bwPages: { gt: 0 } },
        ],
      },
      orderBy: { readyAt: 'desc' },
      take: 20,
    });

    const fallback = Number(shop.defaultProcessingMins) / 10;
    let avgColorRate = fallback;
    let avgBwRate = fallback;

    if (lastDone.length >= 10) {
      let totalColorMins = 0;
      let totalColorPages = 0;
      let totalBwMins = 0;
      let totalBwPages = 0;
      let validOrdersCount = 0;

      for (const o of lastDone) {
        if (!o.readyAt || !o.processingStartedAt) continue;
        const totalPages = o.colorPages + o.bwPages;
        if (totalPages === 0) continue;

        const diffMins = (o.readyAt.getTime() - o.processingStartedAt.getTime()) / 60000;
        validOrdersCount++;

        if (o.colorPages > 0) {
          const colorMins = diffMins * (o.colorPages / totalPages);
          totalColorMins += colorMins;
          totalColorPages += o.colorPages;
        }

        if (o.bwPages > 0) {
          const bwMins = diffMins * (o.bwPages / totalPages);
          totalBwMins += bwMins;
          totalBwPages += o.bwPages;
        }
      }

      if (validOrdersCount >= 10) {
        if (totalColorPages > 0) {
          avgColorRate = totalColorMins / totalColorPages;
        }
        if (totalBwPages > 0) {
          avgBwRate = totalBwMins / totalBwPages;
        }
      }
    }

    // 2. Fetch orders ahead in queue
    const ordersAhead = await this.prisma.order.findMany({
      where: {
        shopId: order.shopId,
        slot: { date: order.slot.date },
        status: { in: ['QUEUED', 'PROCESSING'] },
        createdAt: { lt: order.createdAt },
      },
    });

    // 3. Compute ETA in minutes
    let etaMins = 0;
    for (const o of ordersAhead) {
      etaMins += o.colorPages * avgColorRate + o.bwPages * avgBwRate;
    }
    etaMins += order.colorPages * avgColorRate + order.bwPages * avgBwRate;

    return Math.ceil(etaMins);
  }

  /**
   * Retrieves a paginated list of orders scoped by the user's role.
   */
  async listOrders(
    currentUser: any,
    queryPage?: number | string,
    queryLimit?: number | string,
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number };
  }> {
    const page = Math.max(1, Number(queryPage || 1));
    const limit = Math.min(100, Math.max(1, Number(queryLimit || 20)));

    if (currentUser.role === 'CUSTOMER') {
      const where = { customerId: currentUser.id };
      const total = await this.prisma.order.count({ where });
      const data = await this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          orderFiles: true,
          slot: { include: { template: true } },
          shop: true,
        },
      });
      return { data, pagination: { page, limit, total } };
    }

    if (currentUser.role === 'STAFF' || currentUser.role === 'SHOP_OWNER') {
      if (!currentUser.shopId) {
        throw new ForbiddenException('Staff must belong to a shop.');
      }
      const where = { shopId: currentUser.shopId };
      const allOrders = await this.prisma.order.findMany({
        where,
        include: {
          orderFiles: true,
          slot: { include: { template: true } },
          shop: true,
          customer: true,
        },
      });

      // SLOT first sort: SLOT orders by slot.date ASC then template.startTime ASC,
      // then QUEUE orders by createdAt ASC.
      allOrders.sort((a, b) => {
        if (a.pickupMode === 'SLOT' && b.pickupMode !== 'SLOT') return -1;
        if (a.pickupMode !== 'SLOT' && b.pickupMode === 'SLOT') return 1;

        if (a.pickupMode === 'SLOT' && b.pickupMode === 'SLOT') {
          const dateA = a.slot?.date || '';
          const dateB = b.slot?.date || '';
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;

          const timeA = a.slot?.template?.startTime || '';
          const timeB = b.slot?.template?.startTime || '';
          if (timeA < timeB) return -1;
          if (timeA > timeB) return 1;
        } else {
          // Both are QUEUE
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
        return 0;
      });

      const total = allOrders.length;
      const start = (page - 1) * limit;
      const data = allOrders.slice(start, start + limit);
      return { data, pagination: { page, limit, total } };
    }

    throw new ForbiddenException('Unauthorized role');
  }

  /**
   * Retrieves a single order by ID with scoping and computed fields (queuePosition + etaMins).
   */
  async getOrderById(orderId: string, currentUser: any): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderFiles: true,
        shop: true,
        slot: { include: { template: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Role-based scoping check
    if (currentUser.role === 'CUSTOMER') {
      if (order.customerId !== currentUser.id) {
        throw new ForbiddenException('You do not have permission to view this order');
      }
    } else if (currentUser.role === 'STAFF' || currentUser.role === 'SHOP_OWNER') {
      if (!currentUser.shopId || order.shopId !== currentUser.shopId) {
        throw new ForbiddenException('You do not have permission to view this order');
      }
    } else {
      throw new ForbiddenException('Unauthorized role');
    }

    let queuePosition: number | null = null;
    let etaMins: number | null = null;

    if (order.status === 'QUEUED' || order.status === 'PROCESSING') {
      queuePosition = await this.computeQueuePosition(order);
      etaMins = await this.computeETA(order);
    }

    return {
      ...order,
      queuePosition,
      etaMins,
    };
  }

  /**
   * Cancels an order atomically, refunding the wallet balance and decrementing slot counts if applicable.
   */
  async cancelOrder(orderId: string, currentUser: any): Promise<any> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        shop: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only customer can cancel their own order
    if (order.customerId !== currentUser.id) {
      throw new ForbiddenException('You do not have permission to cancel this order');
    }

    if (order.status !== 'QUEUED' && order.status !== 'SCHEDULED') {
      throw new BadRequestException('Cannot cancel order in this status.');
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: {
          customer: true,
          shop: true,
        },
      });

      if (order.paymentMethod === 'WALLET') {
        await this.walletService.credit(
          order.customerId,
          Number(order.totalPrice),
          TransactionReason.ORDER_REFUND,
          orderId,
          tx,
        );
      }

      if (order.pickupMode === 'SLOT' || order.slotId) {
        await tx.shopSlot.update({
          where: { id: order.slotId },
          data: {
            currentCount: { decrement: 1 },
          },
        });
      }

      return updated;
    });

    // Notify & emit status updates out-of-band/post-commit
    process.nextTick(async () => {
      try {
        const staffAndOwners = await this.prisma.user.findMany({
          where: {
            OR: [
              { shopId: updatedOrder.shopId },
              { id: updatedOrder.shop.ownerId },
            ],
          },
          select: { id: true },
        });

        await this.notificationsService.notifyOrderCancelled(
          { id: updatedOrder.id, orderNumber: updatedOrder.orderNumber },
          { id: updatedOrder.customerId },
          staffAndOwners,
        );
      } catch (err: any) {
        this.logger.error(`Failed to send order cancellation notifications: ${err.message}`, err.stack);
      }

      try {
        await this.ordersGateway.emitStatusChanged(
          updatedOrder.id,
          'CANCELLED',
          updatedOrder.updatedAt,
        );
      } catch (err: any) {
        this.logger.error(`Failed to emit order status change gateway event: ${err.message}`, err.stack);
      }
    });

    return updatedOrder;
  }
}
