// Text that isn't tied to one domain — rate limiting, generic failures.
export const COMMON_MESSAGES = {
  SERVER_ERROR: 'خطای غیرمنتظره‌ای رخ داد. لطفاً دوباره تلاش کنید.',
  TOO_MANY_REQUESTS: (seconds: number) =>
    `تعداد درخواست‌های شما بیش از حد مجاز است. ${seconds} ثانیه دیگر تلاش کنید.`,
  DUPLICATE: 'این مورد از قبل ثبت شده است.',
  RELATED_NOT_FOUND: 'یکی از موارد مرتبط با این درخواست یافت نشد.',
  NOTFOUND: 'صفحه مورد نظر یافت نشد',
} as const;
