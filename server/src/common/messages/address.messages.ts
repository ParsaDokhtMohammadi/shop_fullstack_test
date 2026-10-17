export const ADDRESS_MESSAGES = {
  FETCHED: 'نشانی‌ها با موفقیت دریافت شد.',
  CREATED: 'نشانی با موفقیت ثبت شد.',
  UPDATED: 'نشانی با موفقیت ویرایش شد.',
  DELETED: 'نشانی حذف شد.',
  DEFAULT_CHANGED: 'نشانی پیش‌فرض تغییر کرد.',
  NOT_FOUND: 'نشانی مورد نظر یافت نشد.',
  PHONE_INVALID: 'شماره تماس گیرنده معتبر نیست.',
  LIMIT_REACHED: (max: number) => `حداکثر ${max} نشانی می‌توانید ثبت کنید.`,
} as const;
