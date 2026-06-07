import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';

const adminService = {
  getConfig: jest.fn().mockResolvedValue({ LOW_BALANCE_THRESHOLD: '50' }),
  updateConfig: jest.fn().mockResolvedValue({ key: 'LOW_BALANCE_THRESHOLD', value: '100' }),
  getPlatformAnalytics: jest.fn().mockResolvedValue({ totalShops: 5 }),
};

const userForRole = (role: Role) => ({
  id: 'user-1',
  email: 'user@example.com',
  name: 'User',
  role,
});

async function createApp(role?: Role) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [AdminController],
    providers: [
      RolesGuard,
      { provide: AdminService, useValue: adminService },
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

describe('AdminController', () => {
  let app: INestApplication;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /admin/config with PLATFORM_ADMIN succeeds', async () => {
    app = await createApp(Role.PLATFORM_ADMIN);
    const res = await request(app.getHttpServer()).get('/admin/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ LOW_BALANCE_THRESHOLD: '50' });
  });

  it('9. Non-admin → 403 on /admin/*', async () => {
    app = await createApp(Role.CUSTOMER);
    const res = await request(app.getHttpServer()).get('/admin/config');
    expect(res.status).toBe(403);
  });

  it('PATCH /admin/config/:key with PLATFORM_ADMIN succeeds', async () => {
    app = await createApp(Role.PLATFORM_ADMIN);
    const res = await request(app.getHttpServer())
      .patch('/admin/config/LOW_BALANCE_THRESHOLD')
      .send({ value: '100' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ key: 'LOW_BALANCE_THRESHOLD', value: '100' });
  });

  it('GET /admin/analytics with PLATFORM_ADMIN succeeds', async () => {
    app = await createApp(Role.PLATFORM_ADMIN);
    const res = await request(app.getHttpServer()).get('/admin/analytics');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ totalShops: 5 });
  });
});
