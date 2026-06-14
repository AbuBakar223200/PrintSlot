import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { ShopOrdersController } from './shop-orders.controller';
import { OrdersService } from './orders.service';
import { SlotsModule } from '../slots/slots.module';
import { WalletModule } from '../wallet/wallet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CloudinaryProvider } from '../../config/cloudinary.config';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [SlotsModule, WalletModule, NotificationsModule],
  controllers: [OrdersController, ShopOrdersController],
  providers: [OrdersService, CloudinaryProvider, OrdersGateway],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
