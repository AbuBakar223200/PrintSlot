import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  role: 'CUSTOMER',
  shopId: null,
  language: 'EN',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-02T00:00:00Z'),
};

const mockPrisma = {
  user: {
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  userDevice: {
    upsert: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('returns updated user with new name', async () => {
      const updated = { ...mockUser, name: 'Jane' };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile({ name: 'Jane' }, 'user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Jane' },
      });
      expect(result.name).toBe('Jane');
    });

    it('updates language only; other fields unchanged', async () => {
      const updated = { ...mockUser, language: 'BN' };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile({ language: 'BN' }, 'user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { language: 'BN' },
      });
      expect(result.language).toBe('BN');
    });

    it('returns current user without DB write when body is empty', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);

      const result = await service.updateProfile({}, 'user-1');

      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result.id).toBe('user-1');
    });

    it('returns shared User shape with ISO date strings', async () => {
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, name: 'Bob' });

      const result = await service.updateProfile({ name: 'Bob' }, 'user-1');

      expect(typeof result.createdAt).toBe('string');
      expect(typeof result.updatedAt).toBe('string');
      expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
    });

    it('trims phone whitespace and saves null for empty string', async () => {
      const updated = { ...mockUser, phone: null };
      mockPrisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile({ phone: '  ' }, 'user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { phone: null },
      });
      expect(result.phone).toBeNull();
    });
  });

  describe('registerDevice', () => {
    it('creates a new UserDevice row when none exists', async () => {
      const now = new Date();
      const mockDevice = {
        id: 'dev-1',
        userId: 'user-1',
        token: 'ExpoToken[abc]',
        deviceId: 'D1',
        updatedAt: now,
      };
      mockPrisma.userDevice.upsert.mockResolvedValue(mockDevice);

      const result = await service.registerDevice(
        { token: 'ExpoToken[abc]', deviceId: 'D1' },
        'user-1',
      );

      expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith({
        where: { userId_deviceId: { userId: 'user-1', deviceId: 'D1' } },
        update: { token: 'ExpoToken[abc]' },
        create: { userId: 'user-1', token: 'ExpoToken[abc]', deviceId: 'D1' },
      });
      expect(result.id).toBe('dev-1');
      expect(result.deviceId).toBe('D1');
      expect(typeof result.updatedAt).toBe('string');
    });

    it('updates token when row with that deviceId already exists for this user', async () => {
      const now = new Date();
      const mockDevice = {
        id: 'dev-1',
        userId: 'user-1',
        token: 'new-token',
        deviceId: 'D1',
        updatedAt: now,
      };
      mockPrisma.userDevice.upsert.mockResolvedValue(mockDevice);

      const result = await service.registerDevice(
        { token: 'new-token', deviceId: 'D1' },
        'user-1',
      );

      expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith({
        where: { userId_deviceId: { userId: 'user-1', deviceId: 'D1' } },
        update: { token: 'new-token' },
        create: { userId: 'user-1', token: 'new-token', deviceId: 'D1' },
      });
      expect(result.deviceId).toBe('D1');
    });
  });
});
