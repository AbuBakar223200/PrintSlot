import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TransactionReason,
  TransactionType,
  type WalletTransaction,
  type WalletTransactionsResult,
} from '@printslot/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Calculates the current active wallet balance by aggregating CREDIT minus DEBIT transactions.
   */
  async getBalance(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || this.prisma;

    const credits = await client.walletTransaction.aggregate({
      where: { userId, type: TransactionType.CREDIT },
      _sum: { amount: true },
    });

    const debits = await client.walletTransaction.aggregate({
      where: { userId, type: TransactionType.DEBIT },
      _sum: { amount: true },
    });

    const creditSum = credits._sum.amount ? Number(credits._sum.amount.toString()) : 0;
    const debitSum = debits._sum.amount ? Number(debits._sum.amount.toString()) : 0;

    return Math.round((creditSum - debitSum) * 100) / 100;
  }

  /**
   * Returns a paginated transaction history for the user, ordered descending by creation date.
   */
  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<WalletTransactionsResult> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({
        where: { userId },
      }),
    ]);

    return {
      data: transactions.map((t) => this.mapToSharedTransaction(t)),
      total,
      page,
      limit,
    };
  }

  /**
   * Debits a user's wallet inside a transaction. Checks for insufficient funds.
   */
  async debit(
    userId: string,
    amount: number,
    orderId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    if (!tx) {
      throw new Error('debit must be called inside a prisma transaction');
    }

    const currentBalance = await this.getBalance(userId, tx);
    if (currentBalance < amount) {
      throw new HttpException('Insufficient balance', HttpStatus.PAYMENT_REQUIRED);
    }

    await tx.walletTransaction.create({
      data: {
        userId,
        type: TransactionType.DEBIT,
        amount: new Prisma.Decimal(amount),
        reason: TransactionReason.ORDER_PAYMENT,
        orderId,
      },
    });

    // ─── Dispatch post-commit notifications ──────────────────────────────────
    // Fetch order number for the notification body
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });
    const orderNumber = order?.orderNumber || 'Unknown';

    const threshold = await this.getLowBalanceThreshold(tx);
    const newBalance = Math.round((currentBalance - amount) * 100) / 100;

    // Fire notifications out-of-band to ensure transactional speed
    process.nextTick(async () => {
      try {
        await this.notificationsService.notifyWalletDeducted(
          userId,
          amount,
          orderId,
          orderNumber,
        );

        if (newBalance < threshold) {
          await this.notificationsService.notifyLowBalance(userId, newBalance);
        }
      } catch (err) {
        // Notification failure is non-fatal
      }
    });
  }

  /**
   * Credits a user's wallet. Supports optional transactional client.
   */
  async credit(
    userId: string,
    amount: number,
    reason: TransactionReason,
    orderId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;

    await client.walletTransaction.create({
      data: {
        userId,
        type: TransactionType.CREDIT,
        amount: new Prisma.Decimal(amount),
        reason,
        orderId: orderId || null,
      },
    });

    if (reason === TransactionReason.TOPUP_ADMIN) {
      process.nextTick(async () => {
        try {
          await this.notificationsService.notifyWalletTopup(userId, amount);
        } catch (err) {
          // Non-fatal
        }
      });
    }
  }

  /**
   * Allows shop owners or platform admins to top up a user's wallet.
   */
  async adminTopup(
    actorUserId: string,
    recipientUserId: string,
    amount: number,
  ): Promise<WalletTransaction> {
    if (amount < 10 || amount > 10000) {
      throw new BadRequestException('Top-up amount must be between 10 and 10000 BDT');
    }

    const recipientExists = await this.prisma.user.findUnique({
      where: { id: recipientUserId },
    });
    if (!recipientExists) {
      throw new NotFoundException('Recipient not found');
    }

    // Call credit to add funds
    await this.credit(recipientUserId, amount, TransactionReason.TOPUP_ADMIN);

    // Retrieve and return the created transaction
    const latestTx = await this.prisma.walletTransaction.findFirst({
      where: { userId: recipientUserId, reason: TransactionReason.TOPUP_ADMIN },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestTx) {
      throw new Error('Transaction creation failed');
    }

    return this.mapToSharedTransaction(latestTx);
  }

  /**
   * Resolves the low balance threshold value from configuration.
   */
  private async getLowBalanceThreshold(tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx || this.prisma;
    try {
      const config = await client.appConfig.findUnique({
        where: { key: 'LOW_BALANCE_THRESHOLD' },
      });
      return config ? Number(config.value) : 50;
    } catch {
      return 50;
    }
  }

  /**
   * Helper mapper to convert database WalletTransaction to shared type shape
   */
  private mapToSharedTransaction(t: any): WalletTransaction {
    return {
      id: t.id,
      userId: t.userId,
      type: t.type as TransactionType,
      amount: Number(t.amount.toString()),
      reason: t.reason as TransactionReason,
      orderId: t.orderId || null,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
