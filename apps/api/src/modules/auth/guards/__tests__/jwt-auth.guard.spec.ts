import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { PrismaService } from '../../../../prisma/prisma.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

const mockCreateClient = jest.mocked(createClient);

describe('JwtAuthGuard', () => {
  const supabase = {
    auth: {
      getUser: jest.fn(),
    },
  };
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  };
  const configService = {
    getOrThrow: jest.fn((key: string) => `${key}-value`),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateClient.mockReturnValue(supabase as never);
  });

  function createContext(authorization?: string): ExecutionContext {
    const request = {
      headers: { authorization },
      user: undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  function createGuard() {
    return new JwtAuthGuard(
      configService as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
  }

  it('validates the Supabase token and attaches the mirrored DB user', async () => {
    const user = { id: 'user-1', email: 'test@example.com', role: 'CUSTOMER' };
    const context = createContext('Bearer valid-token');

    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(createGuard().canActivate(context)).resolves.toBe(true);
    expect(supabase.auth.getUser).toHaveBeenCalledWith('valid-token');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
    expect(context.switchToHttp().getRequest().user).toBe(user);
  });

  it('rejects requests without a bearer token', async () => {
    await expect(createGuard().canActivate(createContext())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });

  it('rejects tokens Supabase Auth does not accept', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('invalid token'),
    });

    await expect(
      createGuard().canActivate(createContext('Bearer invalid-token')),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects valid Supabase users without a mirrored DB row', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'missing-user' } },
      error: null,
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      createGuard().canActivate(createContext('Bearer valid-token')),
    ).rejects.toThrow(UnauthorizedException);
  });
});
