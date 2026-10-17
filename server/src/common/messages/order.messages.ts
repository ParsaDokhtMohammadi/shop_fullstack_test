// The statuses in Persian, for anything a customer or an admin reads. Keyed by
// the stored value so a message can label a status it was handed at runtime.
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'در انتظار پرداخت',
  paid: 'پرداخت‌شده',
  processing: 'در حال پردازش',
  shipped: 'ارسال‌شده',
  delivered: 'تحویل‌شده',
  cancelled: 'لغو‌شده',
  failed: 'پرداخت‌نشده',
  refunded: 'بازپرداخت‌شده',
};

export const ORDER_MESSAGES = {
  FETCHED: 'سفارش‌ها با موفقیت دریافت شد.',
  FETCHED_ONE: 'سفارش با موفقیت دریافت شد.',
  CREATED: 'سفارش شما ثبت شد.',
  NOT_FOUND: 'سفارش مورد نظر یافت نشد.',
  EMPTY_CART: 'سبد خرید شما خالی است.',
  ADDRESS_NOT_FOUND: 'نشانی انتخاب‌شده یافت نشد.',
  // Not an error: the customer asked for an order they already have, so the
  // existing one comes back and the frontend sends them on to pay for it.
  ALREADY_PENDING:
    'این سفارش از قبل ثبت شده و در انتظار پرداخت است. برای پرداخت ادامه دهید.',
  ITEM_UNAVAILABLE: (name: string) =>
    `${name} در حال حاضر قابل سفارش نیست. آن را از سبد خرید حذف کنید.`,
  // For the case where the row is gone entirely, so there is no name left to
  // put in ITEM_UNAVAILABLE.
  ITEM_GONE:
    'یکی از کالاهای سبد خرید شما دیگر موجود نیست. سبد خرید خود را به‌روز کنید.',
  STOCK_CHANGED: (name: string, available: number) =>
    `موجودی ${name} به ${available} عدد کاهش یافته است. سبد خرید خود را به‌روز کنید.`,
  ORDER_NUMBER_FAILED: 'ثبت سفارش با خطا مواجه شد. دوباره تلاش کنید.',
  STATUS_UPDATED: 'وضعیت سفارش به‌روزرسانی شد.',
  TRACKING_UPDATED: 'کد رهگیری سفارش ثبت شد.',
  STATUS_RACED:
    'وضعیت این سفارش هم‌زمان تغییر کرده است. صفحه را به‌روزرسانی کنید.',
  TRACKING_NOT_ALLOWED:
    'برای سفارشی که لغو، بازپرداخت یا پرداخت‌نشده است نمی‌توان کد رهگیری ثبت کرد.',
  INVALID_TRANSITION: (from: string, to: string) =>
    `تغییر وضعیت سفارش از ${ORDER_STATUS_LABELS[from] ?? from} به ${ORDER_STATUS_LABELS[to] ?? to} مجاز نیست.`,
} as const;
