// The seam a client swaps. Anything that can put a text message on a phone
// implements this; SmsService talks to nothing else, so moving a shop from
// Kavenegar to another provider is one new class plus one line in SmsModule.
export interface SmsSender {
  // `phone` is the canonical stored form, +989xxxxxxxxx. Each sender reshapes
  // it to whatever its own API wants — that conversion is the adapter's job,
  // not the caller's.
  send(phone: string, message: string): Promise<void>;
}

// Interfaces vanish at runtime, so Nest needs a token to inject by.
export const SMS_SENDER = Symbol('SMS_SENDER');
