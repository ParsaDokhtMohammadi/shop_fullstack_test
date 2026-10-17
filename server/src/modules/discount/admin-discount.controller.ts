import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiscountService } from './discount.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { ListDiscountsDto } from './dto/list-discounts.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Discounts')
@Controller('admin/discounts')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminDiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Get()
  @ApiOperation({
    summary: 'Every discount code, newest first',
    description:
      'Paginated. Includes the expired and switched-off codes, which the panel needs in order to edit or reopen them. Narrow with ?search= on the code text or ?isActive=true|false. Each row carries usage against usageLimit, so a code that has run out is visible without a second call.',
  })
  findAll(@Query() query: ListDiscountsDto) {
    return this.discountService.findAll(query);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a discount code',
    description:
      'The code is stored upper-cased, so SUMMER10 and summer10 are the same coupon and the second one is a 409. type=percent takes value% off the subtotal (1-100), type=fixed takes value Toman off. Omit usageLimit for unlimited uses and expirationDate for a code that never expires.',
  })
  create(@Body() dto: CreateDiscountDto) {
    return this.discountService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edit a discount code',
    description:
      'Every field optional; an omitted field is left unchanged. Send usageLimit or expirationDate as null to go back to unlimited uses / no expiry. usage cannot be edited — the order transaction owns that counter. Use isActive=false to stop a campaign without deleting the code the past orders point at.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.discountService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a discount code',
    description:
      'A real delete. Orders keep their own copy of the code text, so this never changes what a past order says it paid. Prefer isActive=false for a campaign that may run again — the code then stays reserved and its usage count is kept.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountService.remove(id);
  }
}
