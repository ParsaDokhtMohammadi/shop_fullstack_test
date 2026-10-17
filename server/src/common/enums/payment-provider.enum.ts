// Which gateway the app is wired to, chosen once at boot from PAYMENT_PROVIDER.
// Stored on every payment row as well, because a shop that switches provider
// still has to be able to read its old payments.
export enum PaymentProvider {
  // No gateway. The redirect url points straight back at our own callback with
  // Status=OK, so a developer can click through a whole checkout locally.
  Mock = 'mock',
  Zarinpal = 'zarinpal',
}
