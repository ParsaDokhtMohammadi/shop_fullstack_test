import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { OrderModule } from '../order/order.module';
import { UserModule } from '../user/user.module';
import { ProductModule } from '../product/product.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  // No forFeature: this module owns no table, it only reports on the ones that
  // do. Like the customer module it sits at the leaf of the graph — nothing
  // imports it — so a client who wants no dashboard drops it from the root.
  imports: [OrderModule, UserModule, ProductModule, PaymentsModule],
  controllers: [AdminDashboardController],
  providers: [DashboardService],
})
export class AdminModule {}
