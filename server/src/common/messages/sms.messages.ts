// Text that goes out over SMS, not in an HTTP response. Kept separate because
// an SMS provider template is usually approved per-shop and changes on its own.
export const SMS_MESSAGES = {
  // The code alone on its own line. No label, because a Persian label next to
  // Latin digits lets some SMS clients re-order the line and show the digits
  // the wrong way round.
  OTP: (code: string) => code,

  // Iranian operators require an opt-out keyword as the last line of every
  // message. SmsService appends it to everything, so no caller has to know.
  withOptOut: (message: string) => `${message}
لغو11`,

  SEND_FAILED: 'ارسال پیامک با خطا مواجه شد. لطفاً دوباره تلاش کنید.',
} as const;
