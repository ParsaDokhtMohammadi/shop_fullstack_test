/**
 * Response envelopes and the enums shared across domains.
 *
 * The backend does not use one generic wrapper — the data key differs per
 * endpoint — so there are three envelope shapes here and each endpoint picks
 * the one it actually returns. Nothing is guessed: each shape was read off the
 * service method that builds it.
 */

/** Every response carries a Persian, user-facing message. */
export interface ApiMessage {
  message: string
}

/** `{ message, payload }` — cart, settings, banners, profile, order detail. */
export interface PayloadResponse<T> extends ApiMessage {
  payload: T
}

/** What `paginated()` adds to a list response. */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  /** At least 1 even for an empty list, so "page 1 of 0" cannot happen. */
  pageCount: number
}

/** `{ message, items, meta }` — every list endpoint. */
export interface PaginatedResponse<T> extends ApiMessage {
  items: T[]
  meta: PaginationMeta
}

/** Shared query parameters for list endpoints. `limit` is capped at 100. */
export interface PaginationParams {
  page?: number
  limit?: number
}

/**
 * Money is a digits-only string in **Toman**, never a number and never Rial.
 * The alias exists to make that visible at every field that holds an amount,
 * and to make a `number` there a type error rather than a rounding bug.
 */
export type Money = string

/** `users.role`. Authorisation is this one column; there is no permission list. */
export const Role = {
  User: 'user',
  Admin: 'admin',
} as const
export type Role = (typeof Role)[keyof typeof Role]

/**
 * The order lifecycle. `failed` means the ten-minute checkout window ran out
 * and the expiry job closed it; `cancelled` means a person decided to.
 */
export const OrderStatus = {
  PendingPayment: 'pending_payment',
  Paid: 'paid',
  Processing: 'processing',
  Shipped: 'shipped',
  Delivered: 'delivered',
  Cancelled: 'cancelled',
  Failed: 'failed',
  Refunded: 'refunded',
} as const
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]

/**
 * A payment attempt's state. There is deliberately no `refunded` here: a
 * refund changes the *order's* status, because the payment did arrive once.
 */
export const PaymentStatus = {
  Pending: 'pending',
  Success: 'success',
  Failed: 'failed',
} as const
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

/** Online only — cash on delivery is deliberately not offered. */
export type PaymentMethod = 'online'

export type PaymentProvider = 'mock' | 'zarinpal'

/** Where on the storefront a banner is rendered. */
export const BannerPosition = {
  HomeSlider: 'home_slider',
  HomeBanner: 'home_banner',
  Sidebar: 'sidebar',
} as const
export type BannerPosition =
  (typeof BannerPosition)[keyof typeof BannerPosition]

/** `percent` takes value% off the subtotal, `fixed` takes value Toman off it. */
export type DiscountType = 'percent' | 'fixed'
