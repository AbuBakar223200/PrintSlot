import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { StaffController } from '../staff.controller';
import { StaffService } from '../staff.service';

const mockStaffService = {
  assignStaff: jest.fn(),
  removeStaff: jest.fn(),
  listStaff: jest.fn(),
};

const mockStaffResult = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'c@test.com',
  name: 'Promoted',
  phone: null,
  role: 'STAFF',
  shopId: 'shop-1',
  language: 'EN',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const userForRole = (role: Role | undefined, id = 'owner-1') => ({
  id,
  email: 'owner@test.com',
  name: 'Shop Owner',
  phone: null,
  role: role ?? Role.CUSTOMER,
  shopId: null,
  language: 'EN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function createApp(role?: Role) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [StaffController],
    providers: [
      RolesGuard,
      { provide: StaffService, useValue: mockStaffService },
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

describe('StaffController', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  // ── POST /shops/:id/staff ─────────────────────────────────────────────────

  it('POST /shops/:id/staff with SHOP_OWNER assigns staff by email', async () => {
    app = await createApp(Role.SHOP_OWNER);
    mockStaffService.assignStaff.mockResolvedValueOnce(mockStaffResult);

    const res = await request(app.getHttpServer())
      .post('/shops/shop-1/staff')
      .send({ email: 'customer@test.com' })
      .expect(201);

    expect(res.body.data.role).toBe('STAFF');
    expect(mockStaffService.assignStaff).toHaveBeenCalledWith(
      'shop-1',
      'customer@test.com',
      'owner-1',
    );
  });

  it('POST /shops/:id/staff with a malformed email → 400', async () => {
    app = await createApp(Role.SHOP_OWNER);

    await request(app.getHttpServer())
      .post('/shops/shop-1/staff')
      .send({ email: 'not-an-email' })
      .expect(400);
  });

  it('POST /shops/:id/staff without SHOP_OWNER role → 403', async () => {
    app = await createApp(Role.CUSTOMER);

    await request(app.getHttpServer())
      .post('/shops/shop-1/staff')
      .send({ email: 'customer@test.com' })
      .expect(403);
  });

  it('POST /shops/:id/staff without JWT → 401', async () => {
    app = await createApp();

    await request(app.getHttpServer())
      .post('/shops/shop-1/staff')
      .send({ email: 'customer@test.com' })
      .expect(401);
  });

  // ── DELETE /shops/:id/staff/:userId ────────────────────────────────────────

  it('DELETE /shops/:id/staff/:userId with SHOP_OWNER removes staff', async () => {
    app = await createApp(Role.SHOP_OWNER);
    const demotedResult = { ...mockStaffResult, role: 'CUSTOMER', shopId: null };
    mockStaffService.removeStaff.mockResolvedValueOnce(demotedResult);

    const res = await request(app.getHttpServer())
      .delete('/shops/shop-1/staff/11111111-1111-4111-8111-111111111111')
      .expect(200);

    expect(res.body.data.role).toBe('CUSTOMER');
    expect(mockStaffService.removeStaff).toHaveBeenCalledWith(
      'shop-1',
      '11111111-1111-4111-8111-111111111111',
      'owner-1',
    );
  });

  it('DELETE /shops/:id/staff/:userId without SHOP_OWNER role → 403', async () => {
    app = await createApp(Role.CUSTOMER);

    await request(app.getHttpServer())
      .delete('/shops/shop-1/staff/11111111-1111-4111-8111-111111111111')
      .expect(403);
  });

  // ── GET /shops/:id/staff ──────────────────────────────────────────────────

  it('GET /shops/:id/staff returns User[] in the response envelope', async () => {
    app = await createApp(Role.SHOP_OWNER);
    mockStaffService.listStaff.mockResolvedValueOnce([mockStaffResult]);

    const res = await request(app.getHttpServer())
      .get('/shops/shop-1/staff')
      .expect(200);

    expect(res.body.data).toEqual([mockStaffResult]);
    expect(mockStaffService.listStaff).toHaveBeenCalledWith('shop-1', 'owner-1');
  });

  it('GET /shops/:id/staff without SHOP_OWNER role → 403', async () => {
    app = await createApp(Role.CUSTOMER);

    await request(app.getHttpServer())
      .get('/shops/shop-1/staff')
      .expect(403);
  });
});
