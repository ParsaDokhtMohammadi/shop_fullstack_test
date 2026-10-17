import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  InitiatePaymentRequest,
  InitiatePaymentResult,
  PaymentGateway,
  VerifyPaymentRequest,
  VerifyPaymentResult,
} from '../payment-gateway.interface';
import { PaymentProvider } from '../../../common/enums/payment-provider.enum';

// Development. Takes no money and talks to nothing.
//
// The Express version pointed its fake link at a page that did not exist, so
// the flow had to be finished by hand. This one points the redirect straight
// back at our own callback with Status=OK, which makes the link clickable: one
// click and the order really does go to paid, through exactly the same
// callback code the real gateway uses. That is the whole value of a mock —
// the only untested part left is Zarinpal's own HTTP.
@Injectable()
export class MockPaymentGateway implements PaymentGateway {
  readonly provider = PaymentProvider.Mock;

  private readonly logger = new Logger('Payment');

  initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const reference = `MOCK-${randomBytes(8).toString('hex')}`;
    const redirectUrl = `${request.callbackUrl}?Authority=${reference}&Status=OK`;

    this.logger.log(
      `[mock] initiated ${reference} for ${request.amount} — open ${redirectUrl} to complete it`,
    );

    return Promise.resolve({ reference, redirectUrl });
  }

  // Always confirms. A mock that could fail would need a way to tell it to,
  // and the real failure paths are better exercised by pointing the app at
  // Zarinpal's sandbox than by inventing switches here.
  verify(request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    const refId = String(Date.now());

    this.logger.log(`[mock] verified ${request.reference} ref=${refId}`);

    return Promise.resolve({ refId });
  }
}
