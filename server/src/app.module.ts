import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { throttlerConfig } from './config/throttler.config';
import { CategoryModule } from './modules/category/category.module';
import { ProductModule } from './modules/product/product.module';
import { CartModule } from './modules/cart/cart.module';
import { AddressModule } from './modules/address/address.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BannerModule } from './modules/banner/banner.module';
import { DiscountModule } from './modules/discount/discount.module';
import { OrderModule } from './modules/order/order.module';
import { CustomerModule } from './modules/customer/customer.module';
import { AdminModule } from './modules/admin/admin.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    typeOrmConfig,
    throttlerConfig,
    // Enables the @Cron handlers: expiring unpaid orders, and clearing out
    // dead otp codes.
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    CartModule,
    AddressModule,
    SettingsModule,
    BannerModule,
    DiscountModule,
    OrderModule,
    CustomerModule,
    AdminModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
