import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { OrderAdminService } from './order-admin.service';
import { AdminListOrdersDto } from './dto/admin-list-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Orders')
@Controller('admin/orders')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminOrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly orderAdminService: OrderAdminService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Every order, newest first',
    description:
      'Paginated. Filter with ?status=, a ?from=/?to= date range (either end on its own is fine), and ?search= which matches part of the order number or of the recipient phone number — whichever the customer has to hand on the phone. Each row carries the recipient name and phone so the panel does not need a call per order.',
  })
  findAll(@Query() query: AdminListOrdersDto) {
    return this.orderService.findAllForAdmin(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'One order, in full',
    description:
      'The customer view plus the internal references — userId, addressId, discountId — which an admin chasing a problem needs and the customer has no use for. The item rows are the snapshots taken at purchase time, not the current products.',
  })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.orderService.findOneForAdmin(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Move an order to another status',
    description:
      'Only the hops allowed from the order’s current status go through: pending_payment to paid/cancelled/failed, paid to processing/cancelled/refunded, processing to shipped/cancelled/refunded, shipped to delivered/refunded, delivered to refunded. cancelled, failed and refunded are ends. Moving an order to cancelled, refunded or failed gives its stock and its coupon use back in the same transaction. refunded is how a refund is recorded here: the money itself is returned by hand in the gateway’s panel, and the payment row keeps saying success because it is true. Moving it to paid goes through the same code the gateway callback uses: it stamps paidAt and empties the customer’s basket, so a payment taken outside the gateway — a bank transfer the shop confirmed by hand — leaves the order in exactly the state a card payment would. If another admin or the gateway moved it first, nothing is written and the answer says so.',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderAdminService.updateStatus(id, dto);
  }

  @Patch(':id/tracking')
  @ApiOperation({
    summary: 'Set or clear the tracking number',
    description:
      'Separate from the status on purpose: a shop may have the number before the parcel leaves, and shipping it is a deliberate second click. Send an empty string to clear a number typed in wrong. Refused on an order that was cancelled, refunded or never paid for.',
  })
  updateTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrackingDto,
  ) {
    return this.orderAdminService.updateTracking(id, dto);
  }
}
