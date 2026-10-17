import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { InventoryService } from './inventory.service';
import { UpdateVarientDto } from './dto/update-varient.dto';
import { SetStockDto } from './dto/set-stock.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

// Variants are addressed by their own id once they exist, so they get their
// own prefix instead of /admin/products/:productId/varients/:id.
@ApiTags('Admin · Products')
@Controller('admin/varients')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminVarientController {
  constructor(
    private readonly productService: ProductService,
    private readonly inventoryService: InventoryService,
  ) {}

  @Patch(':id/toggle')
  @ApiOperation({
    summary: 'Activate or deactivate a variant',
    description:
      'Flips isActive. This is the soft delete. Refused when it is the last active variant of a published product.',
  })
  toggle(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.toggleVarientActive(id);
  }

  @Patch(':id/stock')
  @ApiOperation({
    summary: 'Set or adjust stock',
    description:
      'Send `set` for a stock-take (the new absolute number) or `adjust` for a movement (`12` for a delivery, `-3` for a write-off) — one of the two, never both. `adjust` does the arithmetic in the database, so it cannot overwrite a sale that lands at the same moment, and it is refused rather than allowed to take stock below zero. The answer carries the new stock and whether it is still under the low-stock threshold.',
  })
  setStock(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStockDto) {
    return this.inventoryService.setStock(id, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a variant',
    description:
      'Send only the fields you are changing. null clears colour, colour code or size. Refused with 409 when the new colour/size pair already exists on the product. This writes `stock` too, but as a plain overwrite — for a delivery or a write-off use PATCH :id/stock, which is safe against a sale landing at the same moment.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVarientDto,
  ) {
    return this.productService.updateVarient(id, dto);
  }
}
