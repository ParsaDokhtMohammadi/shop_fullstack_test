export const CART_MESSAGES = {
  FETCHED: 'سبد خرید با موفقیت دریافت شد.',
  ITEM_ADDED: 'محصول به سبد خرید اضافه شد.',
  ITEM_UPDATED: 'تعداد به‌روزرسانی شد.',
  ITEM_REMOVED: 'محصول از سبد خرید حذف شد.',
  CLEARED: 'سبد خرید خالی شد.',
  MERGED: 'سبد خرید شما به‌روزرسانی شد.',
  DISCOUNT_PREVIEWED: 'کد تخفیف بررسی شد.',
  ITEM_NOT_FOUND: 'این محصول در سبد خرید شما نیست.',
  VARIENT_NOT_FOUND: 'تنوع مورد نظر یافت نشد.',
  OUT_OF_STOCK: 'این محصول موجود نیست.',
  STOCK_EXCEEDED: (available: number) =>
    `تنها ${available} عدد از این محصول موجود است.`,
} as const;
