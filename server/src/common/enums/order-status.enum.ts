// The lifecycle of an order. `cancelled`, `refunded` and `failed` are the ends
// that put stock back; the rest move forward. The transition rules live in the
// service, not here — an enum cannot say which hop is legal.
export enum OrderStatus {
  PendingPayment = 'pending_payment',
  Paid = 'paid',
  Processing = 'processing',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
  // Never paid: the checkout window ran out and the expiry job closed it. Kept
  // apart from `cancelled`, which is a decision somebody made.
  Failed = 'failed',
  Refunded = 'refunded',
}
