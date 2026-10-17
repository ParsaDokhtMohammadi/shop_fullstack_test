import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { AdminProductController } from './admin-product.controller';
import { AdminVarientController } from './admin-varient.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { InventoryService } from './inventory.service';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductVarient } from './entities/product-varient.entity';
import { CategoryModule } from '../category/category.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, ProductVarient]),
    CategoryModule,
    // Inventory reads lowStockThreshold from the shop's settings row.
    SettingsModule,
  ],
  controllers: [
    ProductController,
    AdminProductController,
    AdminVarientController,
    AdminInventoryController,
  ],
  providers: [ProductService, InventoryService],
  // InventoryService is out for the admin dashboard's low-stock count.
  exports: [ProductService, InventoryService],
})
export class ProductModule {}
