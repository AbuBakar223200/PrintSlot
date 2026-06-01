import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrdersGateway } from '../orders.gateway';
import { PrismaService } from '../../../prisma/prisma.service';

describe('OrdersGateway', () => {
  let gateway: OrdersGateway;
  let prismaMock: any;
  let configServiceMock: any;
  let supabaseAuthMock: any;

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
    };

    configServiceMock = {
      getOrThrow: jest.fn().mockImplementation((key: string) => {
        if (key === 'SUPABASE_URL') return 'https://xqbanevjcecxxzsjflue.supabase.co';
        if (key === 'SUPABASE_ANON_KEY') return 'mock-anon-key';
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersGateway,
        { provide: PrismaService, useValue: prismaMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    gateway = module.get<OrdersGateway>(OrdersGateway);

    // Mock supabase auth client
    supabaseAuthMock = {
      getUser: jest.fn(),
    };
    (gateway as any).supabase = {
      auth: supabaseAuthMock,
    };
  });

  describe('handleConnection', () => {
    it('6. Connection with invalid JWT: disconnected', async () => {
      const mockSocket = {
        handshake: {
          auth: {
            token: 'invalid-token',
          },
        },
        disconnect: jest.fn(),
        data: {},
      } as any;

      supabaseAuthMock.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Invalid token'),
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(mockSocket.data.userId).toBeUndefined();
    });

    it('Connection with valid JWT: stores user details on socket', async () => {
      const mockSocket = {
        handshake: {
          auth: {
            token: 'valid-token',
          },
        },
        disconnect: jest.fn(),
        data: {},
      } as any;

      supabaseAuthMock.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        role: 'CUSTOMER',
      });

      await gateway.handleConnection(mockSocket);

      expect(mockSocket.disconnect).not.toHaveBeenCalled();
      expect(mockSocket.data.userId).toBe('user-1');
      expect(mockSocket.data.user.role).toBe('CUSTOMER');
    });
  });

  describe('handleJoin', () => {
    it('7. Join own order: socket added to room', async () => {
      const mockSocket = {
        data: {
          userId: 'user-1',
          user: { id: 'user-1', role: 'CUSTOMER' },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-123',
        customerId: 'user-1',
        shopId: 'shop-1',
      });

      await gateway.handleJoin(mockSocket, { orderId: 'order-123' });

      expect(mockSocket.join).toHaveBeenCalledWith('order:order-123');
      expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.any(String));
    });

    it("8. Join other's order as Customer: not added and emits error", async () => {
      const mockSocket = {
        data: {
          userId: 'customer-hacker',
          user: { id: 'customer-hacker', role: 'CUSTOMER' },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-123',
        customerId: 'legit-customer',
        shopId: 'shop-1',
      });

      await gateway.handleJoin(mockSocket, { orderId: 'order-123' });

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'error',
        'Unauthorized to join this order room',
      );
    });

    it('Join shop order as Staff of the same shop: authorized and added to room', async () => {
      const mockSocket = {
        data: {
          userId: 'staff-1',
          user: { id: 'staff-1', role: 'STAFF', shopId: 'shop-1' },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-123',
        customerId: 'customer-1',
        shopId: 'shop-1',
      });

      await gateway.handleJoin(mockSocket, { orderId: 'order-123' });

      expect(mockSocket.join).toHaveBeenCalledWith('order:order-123');
    });

    it('Join shop order as Platform Admin: authorized and added to room', async () => {
      const mockSocket = {
        data: {
          userId: 'admin-1',
          user: { id: 'admin-1', role: 'PLATFORM_ADMIN' },
        },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      prismaMock.order.findUnique.mockResolvedValue({
        id: 'order-123',
        customerId: 'customer-1',
        shopId: 'shop-1',
      });

      await gateway.handleJoin(mockSocket, { orderId: 'order-123' });

      expect(mockSocket.join).toHaveBeenCalledWith('order:order-123');
    });
  });

  describe('handleLeave', () => {
    it('leaves the correct room', () => {
      const mockSocket = {
        leave: jest.fn(),
      } as any;

      gateway.handleLeave(mockSocket, { orderId: 'order-123' });

      expect(mockSocket.leave).toHaveBeenCalledWith('order:order-123');
    });
  });

  describe('Broadcasting events', () => {
    let mockServer: any;
    let mockTo: any;

    beforeEach(() => {
      mockTo = {
        emit: jest.fn(),
      };
      mockServer = {
        to: jest.fn().mockReturnValue(mockTo),
      };
      gateway.server = mockServer;
    });

    it('9. emitStatusChanged broadcasts to correct room only', () => {
      const updatedAt = new Date();
      gateway.emitStatusChanged('order-123', 'PROCESSING', updatedAt);

      expect(mockServer.to).toHaveBeenCalledWith('order:order-123');
      expect(mockTo.emit).toHaveBeenCalledWith('order:status_changed', {
        orderId: 'order-123',
        status: 'PROCESSING',
        updatedAt: updatedAt.toISOString(),
      });
    });

    it('emitQueueUpdated broadcasts to correct room with position and eta', () => {
      gateway.emitQueueUpdated('order-123', 4, 15);

      expect(mockServer.to).toHaveBeenCalledWith('order:order-123');
      expect(mockTo.emit).toHaveBeenCalledWith('order:queue_updated', {
        orderId: 'order-123',
        position: 4,
        etaMins: 15,
      });
    });
  });
});
