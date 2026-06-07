import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Role, type OrderPriceResult } from '@printslot/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreviewPriceDto, PreviewPriceSchema } from './dto/preview-price.dto';
import { CreateOrderDto, CreateOrderSchema } from './dto/create-order.dto';
import { UpdateOrderStatusDto, UpdateOrderStatusSchema } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('preview-price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  previewPrice(
    @Body(new ZodValidationPipe(PreviewPriceSchema)) dto: PreviewPriceDto,
  ): Promise<OrderPriceResult> {
    return this.ordersService.previewPrice(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  createOrder(
    @Req() req: any,
    @Body(new ZodValidationPipe(CreateOrderSchema)) dto: CreateOrderDto,
  ): Promise<any> {
    return this.ordersService.createOrder(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.STAFF, Role.SHOP_OWNER)
  listOrders(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<any> {
    return this.ordersService.listOrders(req.user, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER, Role.STAFF, Role.SHOP_OWNER)
  getOrderById(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.ordersService.getOrderById(id, req.user);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  cancelOrder(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<any> {
    return this.ordersService.cancelOrder(id, req.user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.SHOP_OWNER)
  advanceStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateOrderStatusSchema)) dto: UpdateOrderStatusDto,
  ): Promise<any> {
    return this.ordersService.advanceStatus(id, dto, req.user);
  }
}

