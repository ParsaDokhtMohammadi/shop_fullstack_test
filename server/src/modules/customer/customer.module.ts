import { Module } from '@nestjs/common';
import { CustomerService } from './customer.service';
import { AdminCustomerController } from './admin-customer.controller';
import { UserModule } from '../user/user.module';
import { OrderModule } from '../order/order.module';
import { AddressModule } from '../address/address.module';

@Module({
  // No forFeature: this module owns no table. It composes the three services
  // that do. It also sits at the leaf of the graph — nothing imports it — so
  // a client who does not want a CRM drops it from the root imports.
  imports: [UserModule, OrderModule, AddressModule],
  controllers: [AdminCustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
