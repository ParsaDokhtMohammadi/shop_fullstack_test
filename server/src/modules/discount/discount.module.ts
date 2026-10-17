import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscountService } from './discount.service';
import { AdminDiscountController } from './admin-discount.controller';
import { Discount } from './entities/discount.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Discount])],
  controllers: [AdminDiscountController],
  // Exported: the cart preview and the order transaction validate a code
  // through this service, never through the discount repository.
  providers: [DiscountService],
  exports: [DiscountService],
})
export class DiscountModule {}
