import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderExpiryService } from './order-expiry.service';
import { OrderReservationService } from './order-reservation.service';
import { OrderAdminService } from './order-admin.service';
import { OrderStatsService } from './order-stats.service';
import { OrderExpiryTask } from './order-expiry.task';
import { OrderController } from './order.controller';
import { AdminOrderController } from './admin-order.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProductModule } from '../product/product.module';
import { SettingsModule } from '../settings/settings.module';
import { DiscountModule } from '../discount/discount.module';

@Module({
  // Other modules' services, not their repositories — except inside the
  // transaction, where the cart and variant rows have to be read and locked
  // through the transaction's own manager. A service holding its own
  // connection would be outside the lock and defeat the point of taking it.
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ProductModule,
    SettingsModule,
    DiscountModule,
  ],
  controllers: [OrderController, AdminOrderController],
  providers: [
    OrderService,
    OrderAdminService,
    OrderStatsService,
    OrderReservationService,
    OrderExpiryService,
    OrderExpiryTask,
  ],
  // OrderStatsService is out for the admin CRM, which reports on a customer's
  // orders without owning the table.
  exports: [OrderService, OrderStatsService],
})
export class OrderModule {}
