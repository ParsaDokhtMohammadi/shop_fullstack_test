// All user-facing auth text lives here. Anything with a runtime value is a
// function so the sentence stays in one piece instead of being glued together
// at the call site.
export const AUTH_MESSAGES = {
  INVALID_PHONE: 'شماره موبایل وارد شده معتبر نیست.',
  OTP_SENT: 'کد تأیید ارسال شد.',
  OTP_RESEND_COOLDOWN: (seconds: number) =>
    `برای درخواست کد جدید ${seconds} ثانیه دیگر صبر کنید.`,
  OTP_INVALID: 'کد وارد شده نادرست است.',
  OTP_EXPIRED: 'کد تأیید منقضی شده است. دوباره درخواست دهید.',
  OTP_ALREADY_USED: 'این کد قبلاً استفاده شده است.',
  OTP_TOO_MANY_ATTEMPTS:
    'تعداد تلاش‌های ناموفق بیش از حد مجاز است. کد جدیدی درخواست کنید.',
  OTP_VERIFIED: 'شماره موبایل با موفقیت تأیید شد.',
  LOGGED_OUT: 'با موفقیت خارج شدید.',
  UNAUTHORIZED: 'برای این عملیات باید وارد حساب کاربری شوید.',
  FORBIDDEN: 'شما به این بخش دسترسی ندارید.',
} as const;
