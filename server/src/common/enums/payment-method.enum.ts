// How the order was paid for. Online only: cash on delivery is deliberately
// not offered — it needs courier reconciliation, a separate settle-on-delivery
// status and an unpaid-parcel policy, none of which belongs in a minimum
// viable shop.
//
// The column it fills is kept even though it has one value, so a client who
// pays for COD later is a new member here plus the rules that go with it,
// rather than a schema change on a live orders table.
export enum PaymentMethod {
  Online = 'online',
}
