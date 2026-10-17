export const DISCOUNT_MESSAGES = {
  FETCHED: 'کدهای تخفیف با موفقیت دریافت شد.',
  CREATED: 'کد تخفیف با موفقیت ثبت شد.',
  UPDATED: 'کد تخفیف با موفقیت ویرایش شد.',
  DELETED: 'کد تخفیف حذف شد.',
  NOT_FOUND: 'کد تخفیف مورد نظر یافت نشد.',
  APPLIED: 'کد تخفیف اعمال شد.',
  // Covers four cases on purpose — unknown, switched off, expired, used up.
  // See DiscountService.validateForSubtotal.
  INVALID_CODE: 'این کد تخفیف معتبر نیست.',
  // Deliberately distinct from INVALID_CODE: the customer holds a real code
  // and has already spent it, which is something they can understand rather
  // than something worth hiding.
  ALREADY_USED: 'شما قبلاً از این کد تخفیف استفاده کرده‌اید.',
  // Only for the checkout race in consume(), where the last use went to
  // somebody else between validating and paying. Not used for a code that was
  // already exhausted when the customer asked — that answers INVALID_CODE.
  USAGE_LIMIT_REACHED: 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.',
  MIN_ORDER_NOT_MET: (minOrderTotal: string) =>
    `این کد تخفیف برای سفارش‌های بالای ${minOrderTotal} قابل استفاده است.`,
  EMPTY_CART: 'سبد خرید شما خالی است.',
  DUPLICATE_CODE: 'این کد تخفیف قبلاً ثبت شده است.',
  PERCENT_OUT_OF_RANGE: 'درصد تخفیف باید عددی بین ۱ تا ۱۰۰ باشد.',
  EXPIRATION_IN_PAST: 'تاریخ انقضا باید در آینده باشد.',
} as const;
