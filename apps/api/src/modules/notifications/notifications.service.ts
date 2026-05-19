import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, type Notification } from '@prisma/client';

// Singleton Expo client — expensive to instantiate, hoist to module scope
const expo = new Expo();

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Core send ──────────────────────────────────────────────────────────────

  /**
   * Always creates the DB Notification row first, then fans push to every
   * registered UserDevice for that user. Push failure is non-fatal.
   * Stale DeviceNotRegistered tokens are auto-deleted.
   */
  async send(opts: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    orderId?: string;
  }): Promise<Notification> {
    // 1. ALWAYS create DB row first — push outcome must not affect this
    const notification = await this.prisma.notification.create({
      data: {
        userId: opts.userId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        orderId: opts.orderId ?? null,
      },
    });

    // 2. Fetch all registered devices for this user
    const devices = await this.prisma.userDevice.findMany({
      where: { userId: opts.userId },
    });

    if (devices.length === 0) return notification;

    // 3. Build Expo messages
    const messages = devices.map((d) => ({
      to: d.token,
      title: opts.title,
      body: opts.body,
      data: { orderId: opts.orderId, type: opts.type },
    }));

    // 4. Send via Expo SDK — wrap entire block so push never bubbles
    try {
      const tickets = await expo.sendPushNotificationsAsync(messages);

      // 5. Inspect tickets; delete stale DeviceNotRegistered tokens
      const deletePromises: Promise<unknown>[] = [];
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (
          ticket.status === 'error' &&
          ticket.details?.error === 'DeviceNotRegistered'
        ) {
          deletePromises.push(
            this.prisma.userDevice.delete({ where: { id: devices[i].id } }),
          );
        }
      }
      await Promise.all(deletePromises);
    } catch (err) {
      // Push failure is non-fatal — DB row already saved
      this.logger.warn('Push dispatch failed', err);
    }

    return notification;
  }

  // ─── 12 event helpers ───────────────────────────────────────────────────────

  notifyOrderPlaced(
    order: { id: string; orderNumber: string },
    customer: { id: string },
  ) {
    return this.send({
      userId: customer.id,
      type: NotificationType.ORDER_PLACED,
      title: 'Order placed',
      body: `Your order ${order.orderNumber} has been placed.`,
      orderId: order.id,
    });
  }

  notifyOrderAccepted(
    order: { id: string; orderNumber: string },
    customer: { id: string },
  ) {
    return this.send({
      userId: customer.id,
      type: NotificationType.ORDER_ACCEPTED,
      title: 'Order in progress',
      body: `Your order ${order.orderNumber} is now being processed.`,
      orderId: order.id,
    });
  }

  notifyOrderReady(
    order: { id: string; orderNumber: string },
    customer: { id: string },
  ) {
    return this.send({
      userId: customer.id,
      type: NotificationType.ORDER_READY,
      title: 'Order ready',
      body: `Your order ${order.orderNumber} is ready for pickup.`,
      orderId: order.id,
    });
  }

  async notifyOrderCancelled(
    order: { id: string; orderNumber: string },
    customer: { id: string },
    staffAndOwners: { id: string }[],
  ) {
    // Fan-out: customer + all staff/owners concurrently
    const recipients = [customer, ...staffAndOwners];
    await Promise.all(
      recipients.map((r) =>
        this.send({
          userId: r.id,
          type: NotificationType.ORDER_CANCELLED,
          title: 'Order cancelled',
          body: `Order ${order.orderNumber} has been cancelled.`,
          orderId: order.id,
        }),
      ),
    );
  }

  async notifyNewOrder(
    order: { id: string; orderNumber: string },
    customerName: string,
    staffAndOwners: { id: string }[],
  ) {
    await Promise.all(
      staffAndOwners.map((r) =>
        this.send({
          userId: r.id,
          type: NotificationType.NEW_ORDER,
          title: 'New order',
          body: `New order ${order.orderNumber} from ${customerName}.`,
          orderId: order.id,
        }),
      ),
    );
  }

  notifyWalletTopup(userId: string, amount: number | string) {
    return this.send({
      userId,
      type: NotificationType.WALLET_TOPUP,
      title: 'Wallet topped up',
      body: `৳${amount} added to your Wallet.`,
    });
  }

  notifyWalletDeducted(
    userId: string,
    amount: number | string,
    orderId: string,
    orderNumber: string,
  ) {
    return this.send({
      userId,
      type: NotificationType.WALLET_DEDUCTED,
      title: 'Payment processed',
      body: `৳${amount} deducted for order ${orderNumber}.`,
      orderId,
    });
  }

  notifyShopApproved(shop: { id: string; name: string }, ownerId: string) {
    return this.send({
      userId: ownerId,
      type: NotificationType.SHOP_APPROVED,
      title: 'Shop approved',
      body: `Your shop ${shop.name} is now active.`,
    });
  }

  notifyShopRejected(
    shop: { id: string; name: string },
    ownerId: string,
    reason: string,
  ) {
    return this.send({
      userId: ownerId,
      type: NotificationType.SHOP_REJECTED,
      title: 'Shop rejected',
      body: `Your shop application was rejected: ${reason}.`,
    });
  }

  notifyShopSuspended(shop: { id: string; name: string }, ownerId: string) {
    return this.send({
      userId: ownerId,
      type: NotificationType.SHOP_SUSPENDED,
      title: 'Shop suspended',
      body: `Your shop has been suspended.`,
    });
  }

  notifyStaffAssigned(userId: string, shopName: string) {
    return this.send({
      userId,
      type: NotificationType.STAFF_ASSIGNED,
      title: `Welcome to ${shopName}`,
      body: `You have been added as staff at ${shopName}.`,
    });
  }

  notifyLowBalance(userId: string, balance: number | string) {
    return this.send({
      userId,
      type: NotificationType.LOW_BALANCE,
      title: 'Low Wallet balance',
      body: `Your Wallet balance is ৳${balance}. Please top up.`,
    });
  }

  // ─── In-app list endpoints ───────────────────────────────────────────────────

  async listForUser(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean,
  ) {
    const where = {
      userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new ForbiddenException(
        'Notification not found or does not belong to you',
      );
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }
}
