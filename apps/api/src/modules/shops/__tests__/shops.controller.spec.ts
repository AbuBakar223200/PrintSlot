import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, ShopStatus } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ShopsController } from '../shops.controller';
import { ShopsService } from '../shops.service';

const shop = {
  id: 'shop-1',
  name: 'Library Print',
  address: 'Campus Gate',
  phone: null,
  status: ShopStatus.ACTIVE,
  rejectionReason: null,
  ownerId: 'owner-1',
  colorRate: 10,
  bwRate: 3,
  a3Surcharge: 5,
  duplexDiscount: 0.2,
  defaultProcessingMins: 15,
  createdAt: '2026-05-18T10:00:00.000Z',
  updatedAt: '2026-05-18T11:00:00.000Z',
};

const shopsService = {
  createShop: jest.fn().mockResolvedValue(shop),
  listActive: jest.fn().mockResolvedValue({
    items: [shop],
    total: 1,
    page: 1,
    limit: 20,
  }),
  findById: jest.fn().mockResolvedValue(shop),
  findByOwner: jest.fn().mockResolvedValue(shop),
  updateShop: jest.fn().mockResolvedValue(shop),
  updateStatus: jest.fn().mockResolvedValue(shop),
  resubmit: jest.fn().mockResolvedValue(shop),
  getAnalytics: jest.fn().mockResolvedValue({}),
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

async function createApp(role?: Role) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [ShopsController],
    providers: [
      RolesGuard,
      { provide: ShopsService, useValue: shopsService },
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

describe('ShopsController', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('POST /shops without SHOP_OWNER role returns 403', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer()).post('/shops').send({
      name: 'Library Print',
      address: 'Campus Gate',
      colorRate: 10,
      bwRate: 3,
      a3Surcharge: 5,
      duplexDiscount: 0.2,
    });

    expect(res.status).toBe(403);
  });

  it('PATCH /shops/:id/status without PLATFORM_ADMIN role returns 403', async () => {
    app = await createApp(Role.SHOP_OWNER);

    const res = await request(app.getHttpServer())
      .patch('/shops/shop-1/status')
      .send({ status: ShopStatus.SUSPENDED });

    expect(res.status).toBe(403);
  });

  it('GET /shops does not require JWT', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer()).get('/shops');

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
  });

  it('POST /shops with extra body field rejects with 400', async () => {
    app = await createApp(Role.SHOP_OWNER);

    const res = await request(app.getHttpServer()).post('/shops').send({
      name: 'Library Print',
      address: 'Campus Gate',
      colorRate: 10,
      bwRate: 3,
      a3Surcharge: 5,
      duplexDiscount: 0.2,
      ownerId: 'evil',
    });

    expect(res.status).toBe(400);
  });

  it('GET /shops/mine with SHOP_OWNER returns the owner shop', async () => {
    app = await createApp(Role.SHOP_OWNER);

    const res = await request(app.getHttpServer()).get('/shops/mine');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('shop-1');
    expect(shopsService.findByOwner).toHaveBeenCalledWith('owner-1');
  });

  it('GET /shops/mine returns null when the owner has no shop', async () => {
    app = await createApp(Role.SHOP_OWNER);
    shopsService.findByOwner.mockResolvedValueOnce(null);

    const res = await request(app.getHttpServer()).get('/shops/mine');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('GET /shops/mine with non-SHOP_OWNER returns 403', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer()).get('/shops/mine');

    expect(res.status).toBe(403);
  });

  it('GET /shops/:id/analytics with SHOP_OWNER succeeds', async () => {
    app = await createApp(Role.SHOP_OWNER);
    const res = await request(app.getHttpServer()).get('/shops/shop-1/analytics?date=2026-06-07');
    expect(res.status).toBe(200);
    expect(shopsService.getAnalytics).toHaveBeenCalledWith('shop-1', 'owner-1', '2026-06-07');
  });

  it('GET /shops/:id/analytics with non-SHOP_OWNER returns 403', async () => {
    app = await createApp(Role.CUSTOMER);
    const res = await request(app.getHttpServer()).get('/shops/shop-1/analytics');
    expect(res.status).toBe(403);
  });
});
