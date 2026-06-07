import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ namespace: '/orders', cors: { origin: '*' } })
export class OrdersGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.supabase = createClient(
      configService.getOrThrow<string>('SUPABASE_URL'),
      configService.getOrThrow<string>('SUPABASE_ANON_KEY'),
    );
  }

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token;
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const { data, error } = await this.supabase.auth.getUser(token);
      if (error || !data.user?.id) {
        client.disconnect(true);
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: data.user.id },
      });

      if (!user) {
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      client.data.user = user;
    } catch (err) {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Sockets are automatically removed from rooms on disconnect
  }

  @SubscribeMessage('order:join')
  async handleJoin(client: Socket, payload: { orderId: string }) {
    if (!payload || !payload.orderId) {
      client.emit('error', 'Missing orderId');
      return;
    }

    const { userId, user } = client.data;
    if (!userId || !user) {
      client.disconnect(true);
      return;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { customerId: true, shopId: true },
    });

    if (!order) {
      client.emit('error', 'Order not found');
      return;
    }

    const isCustomer = user.role === 'CUSTOMER';
    const isStaffOrOwner = user.role === 'STAFF' || user.role === 'SHOP_OWNER';
    const isOwnerOfOrder = order.customerId === userId;
    const isShopStaffOfOrder = isStaffOrOwner && order.shopId === user.shopId;
    const isPlatformAdmin = user.role === 'PLATFORM_ADMIN';

    if (isOwnerOfOrder || isShopStaffOfOrder || isPlatformAdmin) {
      client.join(`order:${payload.orderId}`);
    } else {
      client.emit('error', 'Unauthorized to join this order room');
    }
  }

  @SubscribeMessage('order:leave')
  handleLeave(client: Socket, payload: { orderId: string }) {
    if (payload && payload.orderId) {
      client.leave(`order:${payload.orderId}`);
    }
  }

  emitStatusChanged(orderId: string, status: string, updatedAt: Date | string): void {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('order:status_changed', {
        orderId,
        status,
        updatedAt: typeof updatedAt === 'string' ? updatedAt : updatedAt.toISOString(),
      });
    }
  }

  emitQueueUpdated(orderId: string, position: number, etaMins: number): void {
    if (this.server) {
      this.server.to(`order:${orderId}`).emit('order:queue_updated', {
        orderId,
        position,
        etaMins,
      });
    }
  }
}
