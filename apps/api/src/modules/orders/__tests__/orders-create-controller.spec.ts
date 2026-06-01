import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, ColorMode, PaperSize, Orientation, PickupMode, PaymentMethod } from '@printslot/shared';
import request from 'supertest';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { OrdersController } from '../orders.controller';
import { OrdersService } from '../orders.service';

const mockOrder = {
  id: 'order-123',
  orderNumber: 'PS-00042',
  customerId: 'user-123',
  shopId: '11111111-1111-4111-8111-111111111111',
  pickupMode: PickupMode.QUEUE,
  slotId: '22222222-2222-4222-8222-222222222222',
  paymentMethod: PaymentMethod.WALLET,
  totalPages: 5,
  colorPages: 5,
  bwPages: 0,
  totalPrice: 50,
  orderFiles: [],
};

const mockOrdersService = {
  createOrder: jest.fn().mockResolvedValue(mockOrder),
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

describe('OrdersController - createOrder Flow', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  const validPayload = {
    shopId: '11111111-1111-4111-8111-111111111111',
    pickupMode: PickupMode.QUEUE,
    paymentMethod: PaymentMethod.WALLET,
    files: [
      {
        fileUrl: 'https://res.cloudinary.com/demo/raw/upload/printslot/pending/pdf/doc1.pdf',
        fileName: 'doc1.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        detectedPages: 5,
        colorMode: ColorMode.COLOR,
        paperSize: PaperSize.A4,
        orientation: Orientation.PORTRAIT,
        copies: 1,
        duplex: false,
      },
    ],
  };

  it('10. Without JWT → 401', async () => {
    app = await createApp();

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(validPayload);

    expect(res.status).toBe(401);
  });

  it('11. With STAFF role → 403', async () => {
    app = await createApp(Role.STAFF);

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(validPayload);

    expect(res.status).toBe(403);
  });

  it('12. Request with totalPrice in body → 400', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({
        ...validPayload,
        totalPrice: 50,
      });

    expect(res.status).toBe(400);
  });

  it('13. Request with 11 files → 400', async () => {
    app = await createApp(Role.CUSTOMER);

    const files = Array(11).fill(validPayload.files[0]);

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send({
        ...validPayload,
        files,
      });

    expect(res.status).toBe(400);
  });

  it('14. Response envelope { data, message, statusCode }', async () => {
    app = await createApp(Role.CUSTOMER);

    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      statusCode: 201,
      message: 'ok',
      data: mockOrder,
    });
    expect(mockOrdersService.createOrder).toHaveBeenCalledWith('user-123', validPayload);
  });
});
