import { Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { PaymentCallbackDto } from './dto/payment-callback.dto';
import { env } from '../../config/env.config';

// Where the gateway sends the customer back to. Public, and it has to be: the
// request arrives as a browser redirect from Zarinpal's domain, with no
// session cookie and no way to add one.
//
// That is why nothing here is trusted. The query names an attempt; whether
// money arrived is settled by calling the gateway back, server to server.
@ApiTags('Payments')
@Controller('payments/callback')
export class PaymentCallbackController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'Gateway return url (do not call this yourself)',
    description:
      'Zarinpal redirects the browser here with ?Authority=&Status=. The handler verifies the attempt with Zarinpal, marks the order paid and empties the cart, then redirects the customer on to PAYMENT_RESULT_URL in the storefront with the outcome in the query. Safe to hit twice — the second call reports the first result without charging or writing anything again.',
  })
  handleGet(@Query() query: PaymentCallbackDto, @Res() res: Response) {
    return this.redirect(query, res);
  }

  // Some gateways POST the same fields instead of redirecting with a query.
  // Same handler, so a provider swap does not need a new route.
  @Post()
  @ApiExcludeEndpoint()
  handlePost(@Query() query: PaymentCallbackDto, @Res() res: Response) {
    return this.redirect(query, res);
  }

  // The customer is a person in a browser, not a script: they get a shop page,
  // not JSON. Everything the result page needs is in the query string, and
  // none of it is sensitive — the order number and the receipt number are both
  // already on the customer's own order.
  private async redirect(query: PaymentCallbackDto, res: Response) {
    const result = await this.paymentsService.handleCallback(query);

    // Parsed per request rather than held as one mutable URL, because the
    // query params below are written onto it and two callbacks would then be
    // writing over each other. It cannot throw: PAYMENT_RESULT_URL is checked
    // at boot by assertPaymentUrls, which exists precisely so this line is not
    // the place a bad url is discovered — everything above it has already
    // taken the money.
    const target = new URL(env.payment.resultUrl);
    target.searchParams.set('status', result.ok ? 'success' : 'failed');
    target.searchParams.set('message', result.message);
    if (result.orderNumber)
      target.searchParams.set('order', result.orderNumber);
    if (result.refId) target.searchParams.set('ref', result.refId);

    res.redirect(target.toString());
  }
}
