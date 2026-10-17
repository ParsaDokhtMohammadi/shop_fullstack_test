import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  minutes,
  Throttle,
  type ThrottlerGetTrackerFunction,
} from '@nestjs/throttler';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApplyDiscountDto } from '../discount/dto/apply-discount.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { verifyToken, type JwtPayload } from '../../common/utils/jwt.util';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

// Counts the discount preview per account rather than per ip.
//
// Per ip is wrong on both sides here: Iranian carriers put a lot of real
// customers behind one address, so they would share a budget and get refused
// for each other — while an attacker rotates proxies for nothing. An account
// costs a phone number and an SMS, which is the thing worth making expensive.
//
// The cookie is read here rather than taken from request.user because the
// global ThrottlerGuard runs before the controller's AuthGuard has set it; the
// same fallback @CurrentUser() does. No session means fall back to the ip.
// The parameter is typed the way @nestjs/throttler declares it rather than as
// AuthenticatedRequest: a narrower parameter only type-checks while
// strictFunctionTypes is off, and turning `strict` on would break the build.
const perAccount: ThrottlerGetTrackerFunction = (req): string => {
  const request = req as AuthenticatedRequest;
  // express types cookies as any, so the token is narrowed before use.
  const token = (request.cookies?.[AUTH_COOKIE] as string | undefined) ?? '';
  const sub = request.user?.sub ?? verifyToken(token)?.sub;

  return sub ?? request.ip ?? 'unknown';
};

@ApiTags('Cart')
@Controller('cart')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'The current cart',
    description:
      'Lines are priced from the database on every read, so totals are never taken from the client. A line whose variant went inactive or below the wanted quantity is still listed, flagged isAvailable: false, and left out of the totals.',
  })
  getCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(user.sub);
  }

  @Post('discount/preview')
  // Ten per five minutes per account. Checking a code is something a customer
  // does once or twice at checkout, so this is generous for them and slow for
  // anyone working through a list of guesses.
  @Throttle({
    default: { limit: 10, ttl: minutes(5), getTracker: perAccount },
  })
  @ApiOperation({
    summary: 'Check a discount code against the cart',
    description:
      'Returns the subtotal, what the code takes off and the payable total. Nothing is stored — the code is sent again with the order request and re-validated there, so this is a quote, not an application. Unknown, switched-off, expired and used-up codes all answer the same "not valid", since the difference is nothing the customer can act on. Rate limited to 10 checks per 5 minutes per account.',
  })
  previewDiscount(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApplyDiscountDto,
  ) {
    return this.cartService.previewDiscount(user.sub, dto);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fold a guest cart into the saved one',
    description:
      'Call this once, immediately after login, with whatever the browser was holding while logged out. For each line the quantity kept is the HIGHER of the guest and the saved one, not the sum — so calling it twice changes nothing — and it is capped at current stock. A line whose variant is gone, inactive or sold out is skipped rather than failing the request, and comes back in `skipped` with the reason. Answers with the whole recomputed cart, so the frontend can drop its local copy and render from this one response.',
  })
  merge(@CurrentUser() user: JwtPayload, @Body() dto: MergeCartDto) {
    return this.cartService.merge(user.sub, dto);
  }

  @Post('items')
  @ApiOperation({
    summary: 'Add a variant to the cart',
    description:
      'Quantity defaults to 1. Sending a variant that is already in the cart adds to its quantity. Refused when the variant or its product is inactive, or when the resulting quantity is above stock.',
  })
  addItem(@CurrentUser() user: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.sub, dto);
  }

  @Patch('items/:id')
  @ApiOperation({
    summary: 'Change a line quantity',
    description:
      'Sets the quantity, it does not add to it. The variant is re-checked, so a line that went inactive or below stock is refused here rather than at checkout.',
  })
  updateQuantity(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateQuantity(user.sub, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({
    summary: 'Remove one line from the cart',
    description:
      'The id is the cart item id, not the variant id. 404 when the line is not in your own cart.',
  })
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cartService.removeItem(user.sub, id);
  }

  @Delete()
  @ApiOperation({
    summary: 'Empty the cart',
    description: 'Deletes every line. Safe to call on an already empty cart.',
  })
  clear(@CurrentUser() user: JwtPayload) {
    return this.cartService.clear(user.sub);
  }
}
