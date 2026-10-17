import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/utils/jwt.util';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Orders')
@Controller('orders')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({
    summary: 'My orders, newest first',
    description:
      'Paginated summaries: number, status, total, item count and date. The snapshots live on the detail endpoint, so a long order history does not make this page heavier. Narrow with ?status=.',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: ListOrdersDto) {
    return this.orderService.findAllForUser(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'One of my orders, in full',
    description:
      'Everything the customer agreed to: the item snapshots, the totals, the shipping address as it was at purchase time and the tracking number once there is one. Scoped to the logged-in user, so another customer’s id is a 404 rather than a 403 — the order is not theirs to know about.',
  })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.orderService.findOneForUser(user.sub, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Place an order from the cart',
    description:
      'One transaction: the variant rows are locked, stock and prices are re-checked against the database, the coupon is re-validated and consumed, the order and its frozen item snapshots are inserted, stock is decremented and the cart is emptied. Only the address, the coupon code and the note come from the request — items, prices and totals are computed server-side, so a changed price or a line that sold out is refused here by name rather than silently charged. The order starts as pending_payment and the customer is then sent to the gateway through POST /payments/initiate; if they never pay, the expiry job closes it after ten minutes and gives the stock back. A customer can only hold one unpaid order at a time, and this endpoint resolves that itself rather than refusing: send the same basket, address, coupon and note again and the existing pending order comes back untouched (so a double-tapped button places one order, not two); send anything different and the old order is cancelled — returning its stock and coupon use — and a new one replaces it.',
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.orderService.create(user.sub, dto);
  }
}
