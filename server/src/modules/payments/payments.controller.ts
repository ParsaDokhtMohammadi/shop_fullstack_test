import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/utils/jwt.util';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';
import { PaginationDto } from '../../common/dto';

// The logged-in half of payments. The callback is a separate, public
// controller — the gateway cannot send a session cookie.
@ApiTags('Payments')
@Controller('payments')
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Start paying for an order',
    description:
      'Takes an order id and nothing else — the amount is read from the order, because a client that can name its own price will. Answers with the gateway url to send the browser to. Refused unless the order is yours and still pending_payment.',
  })
  initiate(@CurrentUser() user: JwtPayload, @Body() dto: InitiatePaymentDto) {
    return this.paymentsService.initiate(user.sub, user.phoneNumber, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'My payment history',
    description:
      'Every attempt, newest first, paginated — including the abandoned ones, because a customer asking "did my money go?" is usually looking at one of those. refId is the bank receipt number to quote in a dispute.',
  })
  findAll(@CurrentUser() user: JwtPayload, @Query() query: PaginationDto) {
    return this.paymentsService.findAllForUser(user.sub, query);
  }
}
