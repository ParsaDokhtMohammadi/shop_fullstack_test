// The gateway answered, and the answer was no: the customer cancelled, the
// card was declined, the authority was never paid. The attempt is definitely
// dead and may be marked failed.
export class PaymentRefusedError extends Error {}

// We never got an answer: a timeout, a broken connection, an unreadable
// response. The money's fate is *unknown* — the customer may well have paid.
//
// Nothing may conclude anything from this. The attempt stays pending, the
// order stays unpaid, and a later callback or a manual check in the gateway's
// panel settles it. Marking it failed here is how a shop takes someone's money
// and denies the order.
export class PaymentUnknownError extends Error {}
