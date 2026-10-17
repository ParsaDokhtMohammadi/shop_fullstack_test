export const PRODUCT_MESSAGES = {
  CREATED: 'محصول با موفقیت ایجاد شد.',
  UPDATED: 'محصول با موفقیت به‌روزرسانی شد.',
  FETCHED: 'محصولات با موفقیت دریافت شد.',
  FETCHED_ONE: 'محصول با موفقیت دریافت شد.',
  NOT_FOUND: 'محصول مورد نظر یافت نشد.',
  SLUG_TAKEN: 'این اسلاگ قبلاً استفاده شده است.',
  CATEGORY_NOT_FOUND: 'دسته‌بندی انتخاب‌شده یافت نشد.',
  VARIENT_REQUIRED: 'هر محصول باید حداقل یک تنوع داشته باشد.',
  VARIENT_DUPLICATE: 'تنوع تکراری است؛ ترکیب رنگ و سایز باید یکتا باشد.',
  ACTIVATED: 'محصول فعال شد.',
  DEACTIVATED: 'محصول غیرفعال شد.',
  NO_ACTIVE_VARIENT:
    'این محصول هیچ تنوع فعالی ندارد؛ ابتدا یک تنوع را فعال کنید.',
  VARIENT_CREATED: 'تنوع با موفقیت اضافه شد.',
  VARIENT_UPDATED: 'تنوع با موفقیت به‌روزرسانی شد.',
  VARIENT_NOT_FOUND: 'تنوع مورد نظر یافت نشد.',
  VARIENT_ACTIVATED: 'تنوع فعال شد.',
  VARIENT_DEACTIVATED: 'تنوع غیرفعال شد.',
  LAST_ACTIVE_VARIENT:
    'این آخرین تنوع فعال یک محصول منتشرشده است؛ ابتدا محصول را غیرفعال کنید.',
  STOCK_UPDATED: 'موجودی به‌روزرسانی شد.',
  STOCK_MODE_REQUIRED:
    'یکی از مقادیر set یا adjust را ارسال کنید، نه هر دو را.',
  STOCK_INSUFFICIENT: (available: number) =>
    `موجودی فعلی ${available} عدد است و با این تغییر منفی می‌شود.`,
  LOW_STOCK_FETCHED: 'فهرست کمبود موجودی دریافت شد.',
  IMAGES_ADDED: 'تصاویر با موفقیت اضافه شد.',
  IMAGE_DELETED: 'تصویر حذف شد.',
  IMAGES_REORDERED: 'ترتیب تصاویر به‌روزرسانی شد.',
  IMAGE_NOT_FOUND: 'تصویر مورد نظر یافت نشد.',
  IMAGES_REQUIRED: 'حداقل یک تصویر انتخاب کنید.',
  IMAGES_LIMIT: (max: number) =>
    `هر محصول حداکثر ${max} تصویر می‌تواند داشته باشد.`,
  IMAGES_ORDER_MISMATCH:
    'فهرست ارسالی باید دقیقاً شامل همه تصاویر این محصول باشد.',
} as const;
