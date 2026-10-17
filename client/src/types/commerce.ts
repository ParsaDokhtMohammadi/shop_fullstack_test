import type {
  DiscountType,
  Money,
  OrderStatus,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from './common'

/* -------------------------------------------------------------------------- */
/*  Addresses                                                                 */
/* -------------------------------------------------------------------------- */

export interface Address {
  id: string
  userId: string
  firstName: string
  lastName: string
  province: string
  city: string
  address: string
  /** Exactly 10 digits when present. Stored as text, so leading zeros survive. */
  postalCode: string | null
  phoneNumber: string
  /** A note for the courier. */
  info: string | null
  /** At most one per user, enforced by a partial unique index. */
  isDefault: boolean
  createdAt: string
}

export interface AddressInput {
  firstName: string
  lastName: string
  province: string
  city: string
  /** Between 10 and 500 characters. */
  address: string
  postalCode?: string
  phoneNumber: string
  info?: string
  isDefault?: boolean
}

/* -------------------------------------------------------------------------- */
/*  Cart                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One cart line. Re-priced from the database on every read, so these numbers
 * are never taken from the client.
 *
 * `id` is the **cart item** id — that is what the update and remove endpoints
 * take. `varientId` is what the add endpoint takes. Mixing them up produces a
 * 404, which is the most common slip against this API.
 */
export interface CartLine {
  id: string
  quantity: number
  productId: string
  name: string
  slug: string
  coverImage: string | null
  varientId: string
  color: string | null
  colorCode: string | null
  size: string | null
  price: Money
  discountPercent: string
  finalPrice: Money
  lineTotal: Money
  /** Current stock, so the quantity stepper can stop at the right number. */
  stock: number
  /**
   * False when the variant went inactive, its product was unpublished, its
   * category was switched off, or stock dropped below the wanted quantity.
   * The line is still listed so the customer can be told why, but it is
   * excluded from the totals and checkout will refuse it.
   */
  isAvailable: boolean
}

export interface CartTotals {
  /** Sum of quantities across available lines only. */
  itemsCount: number
  subtotal: Money
  /** What the per-variant discounts already took off — not a coupon. */
  discountTotal: Money
}

export interface Cart {
  items: CartLine[]
  totals: CartTotals
}

/** `POST /api/cart/items`. Quantity defaults to 1 and is capped at 100. */
export interface AddCartItemInput {
  productVarientId: string
  quantity?: number
}

/** A guest line, as held in localStorage and sent to `POST /api/cart/merge`. */
export interface GuestCartItem {
  productVarientId: string
  quantity: number
}

/** A line the merge could not take, with the reason, rather than a failure. */
export interface SkippedMergeItem {
  productVarientId: string
  reason: string
}

/** `POST /api/cart/merge` answers with the whole recomputed cart. */
export interface MergeCartResult extends Cart {
  /** How many lines were actually written. A line already at the right
   *  quantity is not counted, so a second identical merge reports 0. */
  merged: number
  skipped: SkippedMergeItem[]
}

/* -------------------------------------------------------------------------- */
/*  Discounts                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * `POST /api/cart/discount/preview`. A quote only — nothing is stored, and the
 * code is sent again with the order and re-validated there under a row lock.
 * Shipping is not included, because the cart has no address yet.
 */
export interface DiscountPreview {
  code: string
  type: DiscountType
  value: string
  subtotal: Money
  discountAmount: Money
  payableTotal: Money
}

/* -------------------------------------------------------------------------- */
/*  Orders                                                                    */
/* -------------------------------------------------------------------------- */

/** A row of `GET /api/orders`. Summaries only; snapshots are on the detail. */
export interface OrderSummary {
  id: string
  orderNumber: string
  status: OrderStatus
  /** The Persian label, supplied by the backend — no mapping needed here. */
  statusLabel: string
  grandTotal: Money
  itemsCount: number
  paymentMethod: PaymentMethod
  createdAt: string
}

/**
 * A line of an order, frozen at purchase time. Editing a product later must
 * never rewrite this, which is why the name, label, image and price are
 * copies rather than joins.
 */
export interface OrderItem {
  id: string
  /**
   * A hint for "buy again", not a promise — the variant may since have been
   * deleted or discontinued, and this id does not go null when it is. Show the
   * button optimistically and let `POST /api/cart/items` be the authority.
   */
  varientId: string
  productName: string
  /** e.g. "آبی / ۴۲", or null for a product with no options. */
  varientLabel: string | null
  imageUrl: string | null
  unitPrice: Money
  quantity: number
  lineTotal: Money
}

/** The shipping address as it was when the order was placed. */
export interface OrderShipping {
  firstName: string
  lastName: string
  phoneNumber: string
  province: string
  city: string
  address: string
  postalCode: string | null
}

/** `GET /api/orders/:id` — everything the customer agreed to. */
export interface OrderDetail {
  id: string
  orderNumber: string
  status: OrderStatus
  statusLabel: string
  subTotal: Money
  discountTotal: Money
  shippingTotal: Money
  grandTotal: Money
  /** The coupon code as text, snapshotted. */
  discountCode: string | null
  paymentMethod: PaymentMethod
  trackingNumber: string | null
  note: string | null
  paidAt: string | null
  createdAt: string
  shipping: OrderShipping
  items: OrderItem[]
}

/**
 * `POST /api/orders`. Only these three fields come from the client — items,
 * prices and totals are all computed server-side from the cart.
 */
export interface CreateOrderInput {
  addressId: string
  discountCode?: string
  note?: string
}

/**
 * What order creation returns: the saved order row, not the trimmed detail
 * projection. Only the fields the checkout flow needs are declared.
 */
export interface CreatedOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  grandTotal: Money
}

/* -------------------------------------------------------------------------- */
/*  Payments                                                                  */
/* -------------------------------------------------------------------------- */

/** `POST /api/payments/initiate` takes an order id and nothing else. */
export interface InitiatePaymentInput {
  orderId: string
}

/** Where to send the browser next, plus what was snapshotted for the attempt. */
export interface PaymentInitiation {
  redirectUrl: string
  reference: string
  amount: Money
  orderNumber: string
}

/** A row of `GET /api/payments` — every attempt, abandoned ones included. */
export interface PaymentRecord {
  id: string
  orderId: string
  orderNumber: string | null
  amount: Money
  status: PaymentStatus
  provider: PaymentProvider
  /** The bank receipt number, to quote in a dispute. Null until success. */
  refId: string | null
  paidAt: string | null
  createdAt: string
}

/**
 * The query the gateway callback redirects back to the storefront with, at
 * `PAYMENT_RESULT_URL`. All four are already visible on the customer's own
 * order, so none of it is sensitive — but none of it is trusted either: the
 * order is re-fetched to find out what really happened.
 */
export interface PaymentResultQuery {
  status: 'success' | 'failed' | null
  message: string | null
  order: string | null
  ref: string | null
}
