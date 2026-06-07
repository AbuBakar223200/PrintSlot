import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WalletController } from '../wallet.controller';
import { WalletService } from '../wallet.service';

const mockWalletService = {
  getBalance: jest.fn().mockResolvedValue(150),
  getTransactions: jest.fn().mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  }),
  adminTopup: jest.fn().mockResolvedValue({
    id: 'tx-1',
    userId: 'user-1',
    type: 'CREDIT',
    amount: 100,
    reason: 'TOPUP_ADMIN',
    orderId: null,
    createdAt: new Date().toISOString(),
  }),
};

const userForRole = (role: Role) => ({
  id: 'user-123',
  email: 'user@example.com',
  name: 'User Name',
  phone: null,
  role,
  shopId: null,
  language: 'EN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function createApp(role?: Role) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [WalletController],
    providers: [
      RolesGuard,
      { provide: WalletService, useValue: mockWalletService },
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

describe('WalletController', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('10. GET /wallet without JWT → 401', async () => {
    app = await createApp(); // No role => anonymous

    const res = await request(app.getHttpServer()).get('/wallet');

    expect(res.status).toBe(401);
  });

  it('11. POST /wallet/topup as CUSTOMER → 403', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/wallet/topup')
      .send({
        userId: '11111111-1111-4111-8111-111111111111',
        amount: 500,
      });

    expect(res.status).toBe(403);
  });

  it('12. POST /wallet/topup with invalid amount → 400', async () => {
    app = await createApp(Role.PLATFORM_ADMIN);

    const res = await request(app.getHttpServer())
      .post('/wallet/topup')
      .send({
        userId: '11111111-1111-4111-8111-111111111111',
        amount: 5, // Under minimum 10 BDT
      });

    expect(res.status).toBe(400);
  });

  it('13. GET /wallet/transactions paginated correctly', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .get('/wallet/transactions')
      .query({ page: '2', limit: '10' });

    expect(res.status).toBe(200);
    expect(mockWalletService.getTransactions).toHaveBeenCalledWith('user-123', 2, 10);
    expect(res.body.data).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    });
  });

  it('14. POST /wallet/topup/gateway → 501', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/wallet/topup/gateway')
      .send();

    expect(res.status).toBe(501);
  });
});
