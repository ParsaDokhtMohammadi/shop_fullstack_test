// A send that never got an answer: the request went out, the gateway did not
// reply in time. Deliberately distinct from a refusal, because the message may
// well have been delivered — Promise.race abandons our wait, it does not
// cancel the HTTPS request, so the SDK finishes sending either way.
//
// A caller must not undo anything on this. An OTP row deleted here is the
// worst outcome available: the customer is holding a code that just stopped
// being valid.
export class SmsUnknownError extends Error {}
