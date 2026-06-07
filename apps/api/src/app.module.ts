import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrdersModule } from './modules/orders/orders.module';
import { HttpExceptionFilterGlobal } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { UsersModule } from './modules/users/users.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';
import { AppController } from './app.controller';
import { ShopsModule } from './modules/shops/shops.module';
import { SlotsModule } from './modules/slots/slots.module';
import { WalletModule } from './modules/wallet/wallet.module';

/**
 * Root application module.
 *
 * Global providers:
 * - ConfigModule: reads .env
 * - PrismaModule: global DB access
 * - HttpExceptionFilter: wraps errors → { data: null, message, statusCode }
 * - ResponseInterceptor: wraps success → { data, message: "ok", statusCode }
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    NotificationsModule,
    ShopsModule,
    SlotsModule,
    UploadModule,
    WalletModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilterGlobal,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
