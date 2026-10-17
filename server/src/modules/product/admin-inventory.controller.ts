import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { PaginationDto } from '../../common/dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Inventory')
@Controller('admin/inventory')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminInventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('low-stock')
  @ApiOperation({
    summary: 'What needs reordering',
    description:
      'Every active variant at or below settings.lowStockThreshold, emptiest first, paginated. The threshold in force is echoed on the response so the panel can label the page without reading the settings endpoint. Discontinued variants are left out; an unpublished product is kept but flagged.',
  })
  lowStock(@Query() query: PaginationDto) {
    return this.inventoryService.findLowStock(query);
  }
}
