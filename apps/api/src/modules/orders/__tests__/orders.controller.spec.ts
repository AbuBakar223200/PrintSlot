import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, ColorMode, PaperSize } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';

const previewResult = {
  files: [
    {
      resolvedPages: 3,
      subtotalPrice: 48,
      colorPages: 6,
      bwPages: 0,
    },
  ],
  totalPrice: 48,
  totalPages: 6,
  colorPages: 6,
  bwPages: 0,
};

const mockOrdersService = {
  previewPrice: jest.fn().mockResolvedValue(previewResult),
};

const userForRole = (role: Role) => ({
  id: 'user-123',
  email: 'customer@example.com',
  name: 'Customer User',
  phone: null,
  role,
  shopId: null,
  language: 'EN',
  createdAt: new Date(),
  updatedAt: new Date(),
});

async function createApp(role?: Role) {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [OrdersController],
    providers: [
      RolesGuard,
      { provide: OrdersService, useValue: mockOrdersService },
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

describe('OrdersController (Preview Price)', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('8. POST /orders/preview-price without JWT → 401', async () => {
    app = await createApp(); // No role provided => simulates anonymous request

    const res = await request(app.getHttpServer())
      .post('/orders/preview-price')
      .send({
        shopId: '11111111-1111-4111-8111-111111111111',
        files: [
          {
            detectedPages: 5,
            colorMode: ColorMode.COLOR,
            paperSize: PaperSize.A4,
            copies: 1,
            duplex: false,
          },
        ],
      });

    expect(res.status).toBe(401);
  });

  it('9. POST /orders/preview-price with STAFF role → 403', async () => {
    app = await createApp(Role.STAFF);

    const res = await request(app.getHttpServer())
      .post('/orders/preview-price')
      .send({
        shopId: '11111111-1111-4111-8111-111111111111',
        files: [
          {
            detectedPages: 5,
            colorMode: ColorMode.COLOR,
            paperSize: PaperSize.A4,
            copies: 1,
            duplex: false,
          },
        ],
      });

    expect(res.status).toBe(403);
  });

  it('12. Valid request with CUSTOMER role returns { files: [...], totalPrice }', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/orders/preview-price')
      .send({
        shopId: '11111111-1111-4111-8111-111111111111',
        files: [
          {
            detectedPages: 5,
            colorMode: ColorMode.COLOR,
            paperSize: PaperSize.A4,
            copies: 1,
            duplex: false,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual(previewResult);
  });

  it('13. Server rejects totalPrice in body (Zod .strict()) → 400', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/orders/preview-price')
      .send({
        shopId: '11111111-1111-4111-8111-111111111111',
        totalPrice: 100, // Leaked client-supplied calculated field
        files: [
          {
            detectedPages: 5,
            colorMode: ColorMode.COLOR,
            paperSize: PaperSize.A4,
            copies: 1,
            duplex: false,
          },
        ],
      });

    expect(res.status).toBe(400);
  });
});
