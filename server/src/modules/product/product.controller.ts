import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { ProductQueryDto } from './dto/product-query.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({
    summary: 'Product list',
    description:
      'Active products only. Each item carries its cover image, the cheapest price across its active variants, and whether any of them is in stock.',
  })
  findAll(@Query() dto: ProductQueryDto) {
    return this.productService.findAll(dto);
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'One product by slug',
    description:
      'Active product with its active variants and images, cover first. Each variant carries finalPrice, the price after its discount.',
  })
  findOne(@Param('slug') slug: string) {
    return this.productService.findOne(slug);
  }
}
