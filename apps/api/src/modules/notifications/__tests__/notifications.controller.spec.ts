import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { NotificationsController } from '../notifications.controller';
import { NotificationsService } from '../notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'CUSTOMER',
};

const mockNotification = {
  id: 'notif-1',
  userId: 'user-1',
  type: 'ORDER_PLACED',
  title: 'Order placed',
  body: 'Your order ORD-001 has been placed.',
  read: false,
  orderId: 'order-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockNotificationsService = {
  listForUser: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildModule(guardActive: boolean) {
  return Test.createTestingModule({
    controllers: [NotificationsController],
    providers: [
      { provide: NotificationsService, useValue: mockNotificationsService },
      { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: Parameters<typeof JwtAuthGuard.prototype.canActivate>[0]) => {
        if (!guardActive) throw new UnauthorizedException();
        context.switchToHttp().getRequest().user = mockUser;
        return true;
      },
    })
    .compile();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NotificationsController', () => {
  let app: INestApplication;

  describe('authenticated', () => {
    beforeEach(async () => {
      const module: TestingModule = await buildModule(true);
      app = module.createNestApplication();
      await app.init();
      jest.clearAllMocks();
    });

    afterEach(async () => {
      await app.close();
    });

    // GET /notifications — scoped to current user only
    it('GET /notifications returns list scoped to current user', async () => {
      mockNotificationsService.listForUser.mockResolvedValue({
        data: [mockNotification],
        total: 1,
        page: 1,
        limit: 20,
      });

      const res = await request(app.getHttpServer()).get('/notifications');

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        data: [expect.objectContaining({ userId: 'user-1' })],
        total: 1,
      });
      expect(mockNotificationsService.listForUser).toHaveBeenCalledWith(
        'user-1',
        expect.any(Number),
        expect.any(Number),
        expect.any(Boolean),
      );
    });

    it('GET /notifications?unreadOnly=true passes flag to service', async () => {
      mockNotificationsService.listForUser.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      await request(app.getHttpServer()).get('/notifications?unreadOnly=true');

      expect(mockNotificationsService.listForUser).toHaveBeenCalledWith(
        'user-1',
        expect.any(Number),
        expect.any(Number),
        true,
      );
    });

    // PATCH /:id/read — 403 for another user's notification
    it("PATCH /notifications/:id/read returns 403 for another user's notification", async () => {
      mockNotificationsService.markRead.mockRejectedValue(
        new ForbiddenException('Notification not found or does not belong to you'),
      );

      const res = await request(app.getHttpServer()).patch('/notifications/notif-99/read');

      expect(res.status).toBe(403);
    });

    it('PATCH /notifications/:id/read marks own notification as read', async () => {
      mockNotificationsService.markRead.mockResolvedValue({ ...mockNotification, read: true });

      const res = await request(app.getHttpServer()).patch('/notifications/notif-1/read');

      expect(res.status).toBe(200);
      expect(mockNotificationsService.markRead).toHaveBeenCalledWith('notif-1', 'user-1');
    });

    // PATCH /read-all
    it('PATCH /notifications/read-all marks all current user notifications as read', async () => {
      mockNotificationsService.markAllRead.mockResolvedValue({ success: true });

      const res = await request(app.getHttpServer()).patch('/notifications/read-all');

      expect(res.status).toBe(200);
      expect(mockNotificationsService.markAllRead).toHaveBeenCalledWith('user-1');
      expect(res.body.data).toEqual({ success: true });
    });
  });

  describe('unauthenticated', () => {
    beforeEach(async () => {
      const module: TestingModule = await buildModule(false);
      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('GET /notifications without JWT returns 401', async () => {
      const res = await request(app.getHttpServer()).get('/notifications');
      expect(res.status).toBe(401);
    });

    it('PATCH /notifications/:id/read without JWT returns 401', async () => {
      const res = await request(app.getHttpServer()).patch('/notifications/notif-1/read');
      expect(res.status).toBe(401);
    });

    it('PATCH /notifications/read-all without JWT returns 401', async () => {
      const res = await request(app.getHttpServer()).patch('/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });
});
