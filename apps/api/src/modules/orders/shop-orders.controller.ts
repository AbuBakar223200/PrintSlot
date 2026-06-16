import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@printslot/shared';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';

/**
 * Shop-scoped order queue (`GET /shops/:id/orders`) — backs the staff job
 * dashboard and the owner Jobs tab. Mounted under the `shops` path but served by
 * the orders module to keep order logic in `OrdersService` (no cross-module dep).
 *
 * Query: repeatable `status` filter (e.g. `?status=QUEUED&status=PROCESSING`),
 * plus `page` / `limit`. Returns `{ items, total, page, limit }` with the
 * counter view (customerName / customerPhone / slotTime).
 */
@Controller('shops')
export class ShopOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.SHOP_OWNER, Role.PLATFORM_ADMIN)
  listShopOrders(
    @Req() req: any,
    @Param('id') id: string,
    @Query('status') status?: string | string[],
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const statuses = status
      ? Array.isArray(status)
        ? status
        : [status]
      : undefined;
    return this.ordersService.listShopOrders(id, req.user, statuses, page, limit);
  }
}
