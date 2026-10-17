// Which SMS sender the app is wired to. Chosen once at boot from SMS_PROVIDER,
// not per call — see SmsModule.
export enum SmsProvider {
  // Logs the message instead of sending it. The development default: no API
  // key needed, and the OTP is readable in the console.
  Mock = 'mock',
  Kavenegar = 'kavenegar',
}
