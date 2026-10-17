// The `kavenegar` package ships no types. This declares only what we call:
// the constructor and Send. Everything else on the API object (Status, Select,
// account methods, ...) is left out deliberately — if a later feature needs
// one, add it here so the shape stays honest about what has been checked.
declare module 'kavenegar' {
  export interface KavenegarSendParams {
    receptor: string;
    sender: string;
    message: string;
  }

  // The SDK is callback-based, and the callback's three arguments are the
  // whole contract: the per-recipient entries, Kavenegar's own status code
  // (200 on success, 418 out of credit, 426 bad plan, ...), and its message.
  //
  // On a transport error — DNS, TCP, TLS — the SDK calls back with ONE
  // argument, so `status` arrives undefined. The sender treats that as a
  // failure rather than trusting a numeric comparison against undefined.
  export type KavenegarCallback = (
    entries: unknown,
    status?: number,
    statusMessage?: string,
  ) => void;

  export interface KavenegarApiInstance {
    Send(params: KavenegarSendParams, callback: KavenegarCallback): void;
  }

  export function KavenegarApi(options: {
    apikey: string;
  }): KavenegarApiInstance;
}
