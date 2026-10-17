import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartItem } from './entities/cart-item.entity';
import { ProductModule } from '../product/product.module';
import { DiscountModule } from '../discount/discount.module';
import { OrderModule } from '../order/order.module';

@Module({
  // DiscountModule for its service: the coupon rules live there, the cart only
  // asks what a code is worth against a subtotal it computed itself.
  // OrderModule for OrderService: whether a customer has already spent a
  // coupon is a question about their order history, and that table belongs to
  // the order module. No cycle — OrderModule does not import this one.
  imports: [
    TypeOrmModule.forFeature([CartItem]),
    ProductModule,
    DiscountModule,
    OrderModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
