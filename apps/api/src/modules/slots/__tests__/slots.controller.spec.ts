import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SlotsController } from '../slots.controller';
import { SlotsService } from '../slots.service';

const template = {
  id: '11111111-1111-4111-8111-111111111111',
  startTime: '09:00',
  endTime: '09:30',
  deletedAt: null,
  createdAt: '2026-05-18T00:00:00.000Z',
};

const slot = {
  id: '22222222-2222-4222-8222-222222222222',
  shopId: 'shop-1',
  templateId: template.id,
  date: '2026-05-20T00:00:00.000Z',
  isOpen: true,
  maxOrders: 5,
  currentCount: 2,
  template,
};

const slotsService = {
  createTemplate: jest.fn().mockResolvedValue(template),
  listTemplates: jest.fn().mockResolvedValue([template]),
  updateTemplate: jest.fn().mockResolvedValue(template),
  deleteTemplate: jest.fn().mockResolvedValue({ success: true }),
  upsertShopSlot: jest.fn().mockResolvedValue(slot),
  getOpenSlots: jest.fn().mockResolvedValue([slot]),
  getActiveSlot: jest.fn().mockResolvedValue(null),
};

const userForRole = (role: Role) => ({
  id: role === Role.SHOP_OWNER ? 'owner-1' : 'user-1',
  email: 'user@example.com',
  name: 'User',
  phone: null,
  role,
  shopId: null,
  language: 'EN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function createApp(role?: Role): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [SlotsController],
    providers: [
      RolesGuard,
      { provide: SlotsService, useValue: slotsService },
      { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        if (!role) {
          throw new UnauthorizedException();
        }
        context.switchToHttp().getRequest().user = userForRole(role);
        return true;
      },
    })
    .compile();

  const app = module.createNestApplication();
  await app.init();
  jest.clearAllMocks();
  return app;
}

describe('SlotsController', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('POST /slots/templates without PLATFORM_ADMIN returns 403', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/slots/templates')
      .send({ startTime: '09:00', endTime: '09:30' });

    expect(res.status).toBe(403);
  });

  it('POST /shops/:id/slots for a shop not owned by the user returns 403', async () => {
    app = await createApp(Role.SHOP_OWNER);
    slotsService.upsertShopSlot.mockRejectedValueOnce(
      new ForbiddenException('You do not own this shop.'),
    );

    const res = await request(app.getHttpServer())
      .post('/shops/shop-2/slots')
      .send({
        templateId: template.id,
        date: '2026-05-20',
        isOpen: true,
        maxOrders: 5,
      });

    expect(res.status).toBe(403);
  });

  it('GET /shops/:id/slots/active works without JWT', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer()).get(
      '/shops/shop-1/slots/active',
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('DELETE /slots/templates/:id returns success for PLATFORM_ADMIN', async () => {
    app = await createApp(Role.PLATFORM_ADMIN);

    const res = await request(app.getHttpServer()).delete(
      `/slots/templates/${template.id}`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ success: true });
    expect(slotsService.deleteTemplate).toHaveBeenCalledWith(template.id);
  });

  it('GET /shops/:id/slots requires a valid date query', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer()).get('/shops/shop-1/slots');

    expect(res.status).toBe(400);
  });
});
