import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role, type Shop, type ShopListResult } from '@printslot/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateShopDto, CreateShopSchema } from './dto/create-shop.dto';
import {
  UpdateShopStatusDto,
  UpdateShopStatusSchema,
} from './dto/update-shop-status.dto';
import { UpdateShopDto, UpdateShopSchema } from './dto/update-shop.dto';
import { ShopsService } from './shops.service';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SHOP_OWNER)
  createShop(
    @Body(new ZodValidationPipe(CreateShopSchema)) dto: CreateShopDto,
    @CurrentUser() user: { id: string },
  ): Promise<Shop> {
    return this.shopsService.createShop(dto, user.id);
  }

  @Get()
  listActive(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ShopListResult> {
    return this.shopsService.listActive({
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.STAFF, Role.SHOP_OWNER, Role.PLATFORM_ADMIN)
  findById(@Param('id') shopId: string): Promise<Shop> {
    return this.shopsService.findById(shopId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SHOP_OWNER)
  updateShop(
    @Param('id') shopId: string,
    @Body(new ZodValidationPipe(UpdateShopSchema)) dto: UpdateShopDto,
    @CurrentUser() user: { id: string },
  ): Promise<Shop> {
    return this.shopsService.updateShop(shopId, dto, user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PLATFORM_ADMIN)
  updateStatus(
    @Param('id') shopId: string,
    @Body(new ZodValidationPipe(UpdateShopStatusSchema)) dto: UpdateShopStatusDto,
  ): Promise<Shop> {
    return this.shopsService.updateStatus(shopId, dto);
  }

  @Patch(':id/resubmit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SHOP_OWNER)
  resubmit(
    @Param('id') shopId: string,
    @CurrentUser() user: { id: string },
  ): Promise<Shop> {
    return this.shopsService.resubmit(shopId, user.id);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SHOP_OWNER)
  getAnalytics(
    @Param('id') shopId: string,
    @CurrentUser() user: { id: string },
  ): Promise<never> {
    return this.shopsService.getAnalytics(shopId, user.id);
  }
}
