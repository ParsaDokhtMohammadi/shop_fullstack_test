export const PAYMENT_MESSAGES = {
  INITIATED: 'لینک پرداخت ایجاد شد.',
  FETCHED: 'پرداخت‌ها با موفقیت دریافت شد.',
  NOT_FOUND: 'پرداخت مورد نظر یافت نشد.',
  ORDER_NOT_FOUND: 'سفارش مورد نظر یافت نشد.',
  // The order is cancelled, expired, or already paid for.
  ORDER_NOT_PAYABLE: 'این سفارش قابل پرداخت نیست.',
  ALREADY_PAID: 'این سفارش قبلاً پرداخت شده است.',
  GATEWAY_FAILED: 'ارتباط با درگاه پرداخت برقرار نشد. دوباره تلاش کنید.',
  CANCELLED_BY_USER: 'پرداخت توسط شما لغو شد.',
  VERIFY_FAILED: 'پرداخت تأیید نشد.',
  // The gateway verified an amount that is not what the order costs. Never
  // shown as a detail: it means somebody tampered with the flow.
  AMOUNT_MISMATCH: 'مبلغ پرداخت با مبلغ سفارش مطابقت ندارد.',
  SUCCESS: 'پرداخت با موفقیت انجام شد.',
} as const;
