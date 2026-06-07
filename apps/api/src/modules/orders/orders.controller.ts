import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Role, type OrderPriceResult } from '@printslot/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreviewPriceDto, PreviewPriceSchema } from './dto/preview-price.dto';
import { CreateOrderDto, CreateOrderSchema } from './dto/create-order.dto';
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
}
