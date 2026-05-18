import {
  Injectable,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { User as SharedUser, AuthResponse } from '@printslot/shared';

/**
 * AuthService — handles registration, login, and user retrieval.
 *
 * Architecture:
 * 1. Supabase Auth handles password hashing + JWT issuance
 * 2. NestJS creates a mirror User row in our DB (source of truth for role)
 * 3. JWT from Supabase is returned to client
 * 4. On subsequent requests, JwtAuthGuard validates JWT,
 *    strategy reads role from our DB (not JWT claims)
 */
@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  /**
   * Register a new user.
   *
   * 1. Create Supabase Auth user (handles password hashing)
   * 2. Create mirror User row in our DB
   * 3. Return user + access token
   *
   * Only CUSTOMER and SHOP_OWNER can self-register.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Block STAFF and PLATFORM_ADMIN registration
    if (dto.role !== 'CUSTOMER' && dto.role !== 'SHOP_OWNER') {
      throw new BadRequestException(
        'Only CUSTOMER and SHOP_OWNER roles can self-register',
      );
    }

    // Check for existing user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new HttpException('Email already registered', HttpStatus.CONFLICT);
    }

    // Create Supabase Auth user
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      throw new HttpException(
        authError?.message ?? 'Failed to create auth user',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create mirror User row in our DB
    const user = await this.prisma.user.create({
      data: {
        id: authData.user.id,
        email: dto.email,
        name: dto.name,
        phone: dto.phone ?? null,
        role: dto.role,
      },
    });

    // Sign in to get access token
    const { data: signInData, error: signInError } =
      await this.supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (signInError || !signInData.session) {
      throw new HttpException(
        'Registration succeeded but sign-in failed. Please log in.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      user: this.mapToSharedUser(user),
      accessToken: signInData.session.access_token,
    };
  }

  /**
   * Log in an existing user.
   *
   * 1. Authenticate with Supabase Auth
   * 2. Fetch user from our DB (source of truth for role)
   * 3. Return user + access token
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    // Authenticate with Supabase
    const { data: signInData, error: signInError } =
      await this.supabase.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (signInError || !signInData.session) {
      throw new HttpException(
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Fetch user from our DB
    const user = await this.prisma.user.findUnique({
      where: { id: signInData.user.id },
    });

    if (!user) {
      throw new HttpException(
        'User account not found. Please register.',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      user: this.mapToSharedUser(user),
      accessToken: signInData.session.access_token,
    };
  }

  /**
   * Get current authenticated user.
   * Called after JwtAuthGuard validates the token.
   */
  async getMe(userId: string): Promise<SharedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return this.mapToSharedUser(user);
  }

  /**
   * Map Prisma User model → shared User type.
   *
   * Per ADR-008: @prisma/client types never leave the API boundary.
   * API services always map to shared types before returning.
   */
  private mapToSharedUser(prismaUser: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    shopId: string | null;
    language: string;
    createdAt: Date;
    updatedAt: Date;
  }): SharedUser {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      phone: prismaUser.phone,
      role: prismaUser.role as SharedUser['role'],
      shopId: prismaUser.shopId,
      language: prismaUser.language as SharedUser['language'],
      createdAt: prismaUser.createdAt.toISOString(),
      updatedAt: prismaUser.updatedAt.toISOString(),
    };
  }
}
