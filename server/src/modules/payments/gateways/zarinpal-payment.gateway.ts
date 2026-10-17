import { Injectable, Logger } from '@nestjs/common';
import {
  InitiatePaymentRequest,
  InitiatePaymentResult,
  PaymentGateway,
  VerifyPaymentRequest,
  VerifyPaymentResult,
} from '../payment-gateway.interface';
import { PaymentRefusedError, PaymentUnknownError } from '../payment.errors';
import { PaymentProvider } from '../../../common/enums/payment-provider.enum';
import { env } from '../../../config/env.config';

// Zarinpal's own result codes, which arrive inside an HTTP 200.
const OK = 100;
// "Already verified." Their idempotency: a second verify of the same authority
// returns this instead of 100, and it is still a success — the money is ours.
// A callback that fires twice lands here, which is why it must not be treated
// as a failure.
const ALREADY_VERIFIED = 101;

const TIMEOUT_MS = 30_000;

@Injectable()
export class ZarinpalPaymentGateway implements PaymentGateway {
  readonly provider = PaymentProvider.Zarinpal;

  private readonly logger = new Logger('Payment');

  async initiate(
    request: InitiatePaymentRequest,
  ): Promise<InitiatePaymentResult> {
    const data = await this.post(env.payment.zarinpal.requestUrl, {
      merchant_id: env.payment.zarinpal.merchantId,
      amount: Number(request.amount),
      currency: env.payment.zarinpal.currency,
      description: request.description,
      callback_url: request.callbackUrl,
      metadata: { mobile: request.mobile },
    });

    if (data.code !== OK || !data.authority) {
      this.logger.error(
        `Zarinpal refused the request: code=${data.code} message=${data.message ?? '-'}`,
      );
      throw new PaymentRefusedError(`zarinpal request code ${data.code}`);
    }

    return {
      reference: data.authority,
      // Their start-pay url carries a {} placeholder for the authority.
      redirectUrl: env.payment.zarinpal.startPayUrl.replace(
        '{}',
        data.authority,
      ),
    };
  }

  async verify(request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    const data = await this.post(env.payment.zarinpal.verifyUrl, {
      merchant_id: env.payment.zarinpal.merchantId,
      authority: request.reference,
      // Zarinpal checks this against what it collected, so a mismatch is
      // refused by them as well as by us.
      amount: Number(request.amount),
    });

    if (data.code === OK || data.code === ALREADY_VERIFIED)
      return { refId: String(data.ref_id) };

    this.logger.error(
      `Zarinpal did not verify ${request.reference}: code=${data.code} message=${data.message ?? '-'}`,
    );
    throw new PaymentRefusedError(`zarinpal verify code ${data.code}`);
  }

  // One POST, JSON in and JSON out. Zarinpal answers HTTP 200 for almost
  // everything and puts the real outcome in `data.code`, so the HTTP status is
  // only useful for spotting that we never reached them at all.
  private async post(
    url: string,
    body: Record<string, unknown>,
  ): Promise<{
    code?: number;
    authority?: string;
    ref_id?: number;
    message?: string;
  }> {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Shaparak requires the request to come from the shop's registered
          // domain. There is no browser here, so the header is built from the
          // callback url's origin — the same trick as the Express version.
          ...(env.payment.callbackOrigin && {
            Referer: `${env.payment.callbackOrigin}/`,
          }),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      // Never reached them, or gave up waiting. Unknown, not failed.
      throw new PaymentUnknownError(
        `zarinpal unreachable: ${(error as Error).message}`,
      );
    }

    let payload: { data?: Record<string, unknown>; errors?: unknown };

    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      throw new PaymentUnknownError(
        `zarinpal sent an unreadable response (http ${response.status})`,
      );
    }

    // On a bad merchant id or a malformed body they answer with `errors` and
    // no `data`. That is a definite refusal, and logging the shape is the only
    // way to debug it later.
    if (!payload.data || typeof payload.data !== 'object') {
      this.logger.error(
        `Zarinpal error response (http ${response.status}): ${JSON.stringify(payload.errors ?? payload)}`,
      );
      throw new PaymentRefusedError('zarinpal returned no data');
    }

    return payload.data;
  }
}
