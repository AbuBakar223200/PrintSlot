import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, HttpStatus, HttpException } from '@nestjs/common';
import request from 'supertest';

jest.mock('pdf-parse', () => jest.fn());
import { UploadController } from '../upload.controller';
import { UploadService } from '../upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ResponseInterceptor } from '../../../common/interceptors/response.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Role } from '@printslot/shared';

const mockCustomerUser = {
  id: 'cust-123',
  email: 'customer@test.com',
  name: 'Test Customer',
  role: Role.CUSTOMER,
  shopId: null,
  language: 'EN',
};

const mockStaffUser = {
  id: 'staff-123',
  email: 'staff@test.com',
  name: 'Test Staff',
  role: Role.STAFF,
  shopId: 'shop-456',
  language: 'EN',
};

const mockUploadService = {
  uploadFile: jest.fn().mockResolvedValue({
    fileUrl: 'https://cloudinary.com/pending/test.pdf',
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    fileSize: 1024,
    detectedPages: 3,
  }),
};

describe('UploadController', () => {
  let app: INestApplication;
  let activeUser: any = mockCustomerUser;
  let activeGuardCanActivate = jest.fn().mockReturnValue(true);

  beforeEach(async () => {
    activeUser = mockCustomerUser;
    activeGuardCanActivate.mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
        { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          if (!activeGuardCanActivate()) {
            throw new UnauthorizedException();
          }
          context.switchToHttp().getRequest().user = activeUser;
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  it('6. Upload without JWT → 401', async () => {
    activeGuardCanActivate.mockReturnValueOnce(false);

    const res = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', Buffer.from('mock-pdf'), 'test.pdf');

    expect(res.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('7. Upload with STAFF role → 403 (only CUSTOMER)', async () => {
    activeUser = mockStaffUser;

    const res = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', Buffer.from('mock-pdf'), 'test.pdf');

    expect(res.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('8. Upload with unsupported MIME → 415', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', Buffer.from('mock-exe'), 'test.exe');

    expect(res.status).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
  });

  it('9. Upload over 20 MB → 413 (Multer-handled)', async () => {
    // Generate a buffer slightly larger than 20MB
    const largeBuffer = Buffer.alloc(20 * 1024 * 1024 + 1);

    const res = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', largeBuffer, 'large-file.pdf');

    expect(res.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
  });

  it('10. Response shape matches UploadedFile', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', Buffer.from('mock-pdf'), 'test.pdf');

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body).toMatchObject({
      data: {
        fileUrl: 'https://cloudinary.com/pending/test.pdf',
        fileName: 'test.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        detectedPages: 3,
      },
      message: 'ok',
      statusCode: HttpStatus.CREATED,
    });
  });

  it('Upload with empty filename or missing file field → 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/upload'); // No file attached

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });
});
