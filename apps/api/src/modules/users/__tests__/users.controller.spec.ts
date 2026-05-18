import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  role: 'CUSTOMER',
  shopId: null,
  language: 'EN',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
};

const mockUsersService = {
  updateProfile: jest.fn().mockResolvedValue(mockUser),
  registerDevice: jest.fn().mockResolvedValue({
    id: 'dev-1',
    deviceId: 'D1',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }),
  removeDevice: jest.fn().mockResolvedValue({ success: true }),
};

describe('UsersController', () => {
  let app: INestApplication;

  describe('with authenticated guard', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: (context: any) => {
            context.switchToHttp().getRequest().user = mockUser;
            return true;
          },
        })
        .compile();

      app = module.createNestApplication();
      await app.init();
      jest.clearAllMocks();
      mockUsersService.updateProfile.mockResolvedValue(mockUser);
      mockUsersService.registerDevice.mockResolvedValue({
        id: 'dev-1',
        deviceId: 'D1',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });
      mockUsersService.removeDevice.mockResolvedValue({ success: true });
    });

    afterEach(async () => {
      await app.close();
    });

    it('PATCH /users/me with valid body returns response envelope', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ name: 'Jane' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: expect.objectContaining({ name: 'Test User' }),
        message: 'ok',
        statusCode: 200,
      });
    });

    it('PATCH /users/me with invalid language returns 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ language: 'INVALID' });

      expect(res.status).toBe(400);
    });

    it('PATCH /users/me/device without deviceId returns 400', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/device')
        .send({ token: 'ExpoToken[abc]' });

      expect(res.status).toBe(400);
    });

    it('PATCH /users/me/device with valid body returns response envelope', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/device')
        .send({ token: 'ExpoToken[abc]', deviceId: 'D1' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: expect.objectContaining({ deviceId: 'D1' }),
        message: 'ok',
        statusCode: 200,
      });
    });

    it('DELETE /users/me/device/:deviceId returns { success: true } envelope', async () => {
      const res = await request(app.getHttpServer()).delete('/users/me/device/D1');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        data: { success: true },
        message: 'ok',
        statusCode: 200,
      });
    });

    it('DELETE /users/me/device/:deviceId returns 404 when device not found', async () => {
      mockUsersService.removeDevice.mockRejectedValueOnce(new NotFoundException('Device not found'));

      const res = await request(app.getHttpServer()).delete('/users/me/device/no-such-device');

      expect(res.status).toBe(404);
    });
  });

  describe('without authentication', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [UsersController],
        providers: [
          { provide: UsersService, useValue: mockUsersService },
          { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => { throw new UnauthorizedException(); } })
        .compile();

      app = module.createNestApplication();
      await app.init();
    });

    afterEach(async () => {
      await app.close();
    });

    it('PATCH /users/me without JWT returns 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me')
        .send({ name: 'Jane' });

      expect(res.status).toBe(401);
    });

    it('PATCH /users/me/device without JWT returns 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/device')
        .send({ token: 'tok', deviceId: 'D1' });

      expect(res.status).toBe(401);
    });

    it('DELETE /users/me/device/:deviceId without JWT returns 401', async () => {
      const res = await request(app.getHttpServer()).delete('/users/me/device/D1');

      expect(res.status).toBe(401);
    });
  });
});
