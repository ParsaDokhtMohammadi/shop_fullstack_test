import { PaymentProvider } from '../../common/enums/payment-provider.enum';

export interface InitiatePaymentRequest {
  // Digits only, in the unit the gateway is configured for. Taken from the
  // order, never from the client.
  amount: string;
  description: string;
  // Shown to the customer on the gateway's page and used by some providers to
  // pre-fill the card form.
  mobile?: string;
  callbackUrl: string;
}

export interface InitiatePaymentResult {
  // The gateway's id for this attempt — Zarinpal's "authority".
  reference: string;
  // Where to send the customer's browser.
  redirectUrl: string;
}

export interface VerifyPaymentRequest {
  reference: string;
  amount: string;
}

export interface VerifyPaymentResult {
  // The bank receipt number.
  refId: string;
}

// The seam a client swaps, exactly like SmsSender. A gateway does two things:
// turn an amount into a url to send the customer to, and later confirm that
// the money actually arrived.
//
// Both methods throw rather than return a success flag — and *which* error
// they throw is part of the contract, see payment.errors.ts. A verify that
// could not reach the gateway must not be mistaken for a verify that came
// back negative.
export interface PaymentGateway {
  readonly provider: PaymentProvider;
  initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult>;
  verify(request: VerifyPaymentRequest): Promise<VerifyPaymentResult>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
