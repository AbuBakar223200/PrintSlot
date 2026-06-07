import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { StaffService } from '../staff.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

const mockPrisma = {
  shop: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
};

const mockNotifications = {
  notifyStaffAssigned: jest.fn().mockResolvedValue({}),
};

const OWNER_ID = 'owner-1';
const SHOP_ID = 'shop-1';
const CUSTOMER_ID = 'customer-1';
const STAFF_USER_ID = 'staff-1';

const mockShop = {
  id: SHOP_ID,
  ownerId: OWNER_ID,
  name: 'Campus Print Hub',
};

const mockCustomerUser = {
  id: CUSTOMER_ID,
  email: 'customer@test.com',
  name: 'Test Customer',
  phone: null,
  role: 'CUSTOMER',
  shopId: null,
  language: 'EN',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockStaffUser = {
  id: STAFF_USER_ID,
  email: 'staff@test.com',
  name: 'Test Staff',
  phone: null,
  role: 'STAFF',
  shopId: SHOP_ID,
  language: 'EN',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockOwnerUser = {
  id: OWNER_ID,
  email: 'owner@test.com',
  name: 'Test Owner',
  phone: null,
  role: 'SHOP_OWNER',
  shopId: null,
  language: 'EN',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('StaffService', () => {
  let service: StaffService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    jest.clearAllMocks();
  });

  // ── assignStaff ─────────────────────────────────────────────────────────────

  it('1. assignStaff promotes CUSTOMER → STAFF and sets shopId', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...mockCustomerUser,
      role: 'STAFF',
      shopId: SHOP_ID,
      updatedAt: new Date('2026-01-02'),
    });

    const result = await service.assignStaff(SHOP_ID, CUSTOMER_ID, OWNER_ID);

    expect(result.role).toBe('STAFF');
    expect(result.shopId).toBe(SHOP_ID);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: CUSTOMER_ID },
      data: { role: 'STAFF', shopId: SHOP_ID },
    });
  });

  it('2. assignStaff rejects when target is STAFF: 400', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockStaffUser);

    await expect(
      service.assignStaff(SHOP_ID, STAFF_USER_ID, OWNER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('3. assignStaff rejects when target is SHOP_OWNER: 400', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockOwnerUser);

    await expect(
      service.assignStaff(SHOP_ID, OWNER_ID, OWNER_ID),
    ).rejects.toThrow(BadRequestException);
  });

  it('4. assignStaff for non-owner: 403', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);

    await expect(
      service.assignStaff(SHOP_ID, CUSTOMER_ID, 'not-the-owner'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. assignStaff for non-existent user: 404', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.assignStaff(SHOP_ID, 'unknown-user', OWNER_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('6. assignStaff for non-existent shop: 404', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.assignStaff('bad-shop-id', CUSTOMER_ID, OWNER_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('7. STAFF_ASSIGNED notification fired on promotion', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockCustomerUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...mockCustomerUser,
      role: 'STAFF',
      shopId: SHOP_ID,
    });

    await service.assignStaff(SHOP_ID, CUSTOMER_ID, OWNER_ID);

    expect(mockNotifications.notifyStaffAssigned).toHaveBeenCalledWith(
      CUSTOMER_ID,
      mockShop.name,
    );
  });

  // ── removeStaff ─────────────────────────────────────────────────────────────

  it('8. removeStaff reverts STAFF → CUSTOMER and clears shopId', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce(mockStaffUser);
    mockPrisma.user.update.mockResolvedValueOnce({
      ...mockStaffUser,
      role: 'CUSTOMER',
      shopId: null,
    });

    const result = await service.removeStaff(SHOP_ID, STAFF_USER_ID, OWNER_ID);

    expect(result.role).toBe('CUSTOMER');
    expect(result.shopId).toBeNull();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: STAFF_USER_ID },
      data: { role: 'CUSTOMER', shopId: null },
    });
  });

  it('9. removeStaff for user not in this shop: 404', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      ...mockStaffUser,
      shopId: 'different-shop',
    });

    await expect(
      service.removeStaff(SHOP_ID, STAFF_USER_ID, OWNER_ID),
    ).rejects.toThrow(NotFoundException);
  });

  it('10. removeStaff for non-owner: 403', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);

    await expect(
      service.removeStaff(SHOP_ID, STAFF_USER_ID, 'not-the-owner'),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── listStaff ───────────────────────────────────────────────────────────────

  it('11. listStaff returns only this shop\'s STAFF', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);
    mockPrisma.user.findMany.mockResolvedValueOnce([mockStaffUser]);

    const result = await service.listStaff(SHOP_ID, OWNER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('STAFF');
    expect(result[0].shopId).toBe(SHOP_ID);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'STAFF', shopId: SHOP_ID },
      orderBy: { name: 'asc' },
    });
  });

  it('12. listStaff for non-owner: 403', async () => {
    mockPrisma.shop.findUnique.mockResolvedValueOnce(mockShop);

    await expect(
      service.listStaff(SHOP_ID, 'not-the-owner'),
    ).rejects.toThrow(ForbiddenException);
  });
});
