// A payment attempt's life. One order can have several attempts — the
// customer abandons the gateway, comes back, tries again — so these belong to
// the attempt, not to the order.
export enum PaymentStatus {
  // Sent to the gateway, no answer yet. Also where an attempt stays if the
  // verify call itself failed to reach the gateway: the money's fate is
  // unknown, so nothing may be concluded from it.
  Pending = 'pending',
  Success = 'success',
  // The gateway said no: the customer cancelled, the card was declined, or
  // verification came back negative.
  Failed = 'failed',
  // There is no 'refunded' here on purpose. A refund is done by hand in the
  // gateway's panel, and what changes in this app is the *order's* status —
  // which is also what releases the stock and the coupon use. The payment row
  // keeps saying 'success', because it is true: the money did arrive once.
}
