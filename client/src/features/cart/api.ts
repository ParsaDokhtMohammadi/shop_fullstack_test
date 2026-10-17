import { http } from '@/api/client'
import type {
  AddCartItemInput,
  Cart,
  DiscountPreview,
  GuestCartItem,
  MergeCartResult,
  PayloadResponse,
} from '@/types'

/**
 * The cart lives on the server and requires a session — there is no guest
 * cart endpoint. A logged-out visitor's basket is kept in localStorage by
 * `guest-cart.ts` and folded in with `mergeGuestCart` after login.
 *
 * Every read re-prices the lines from the database, so no total here is ever
 * taken from the client.
 *
 * **The write endpoints do not return the cart.** They answer with the saved
 * row (or just its id), so the quantities and totals on screen come from
 * re-reading `GET /api/cart` afterwards — which the mutation hooks do by
 * invalidating its query. That is also the correct behaviour rather than a
 * workaround: the totals depend on every other line, so only the server can
 * recompute them.
 */

/** The raw `cart_item` row the write endpoints echo back. */
export interface CartItemRow {
  id: string
  userId: string
  productVarientId: string
  quantity: number
  createdAt: string
}

/** `GET /api/cart` — the priced cart with availability flags and totals. */
export const fetchCart = async (signal?: AbortSignal): Promise<Cart> => {
  const response = await http.get<PayloadResponse<Cart>>('/cart', { signal })

  return response.payload
}

/**
 * `POST /api/cart/items` — by **variant** id, not product id.
 *
 * Adding a variant already in the cart **accumulates** its quantity rather
 * than replacing it, and stock is checked against the resulting total. Refused
 * with a 404 when the variant or its product is inactive, and with a 400 that
 * names the available quantity when it would exceed stock.
 */
export const addCartItem = async (
  input: AddCartItemInput,
): Promise<CartItemRow> => {
  const response = await http.post<PayloadResponse<CartItemRow>>(
    '/cart/items',
    input,
  )

  return response.payload
}

/**
 * `PATCH /api/cart/items/:id` — **sets** the quantity, it does not add to it.
 *
 * The id is the **cart item** id, not the variant id. This is the easiest
 * mistake to make against this API, and it surfaces as a 404.
 */
export const updateCartItemQuantity = async (
  cartItemId: string,
  quantity: number,
): Promise<CartItemRow> => {
  const response = await http.patch<PayloadResponse<CartItemRow>>(
    `/cart/items/${cartItemId}`,
    { quantity },
  )

  return response.payload
}

/** `DELETE /api/cart/items/:id` — again the cart item id. */
export const removeCartItem = async (cartItemId: string): Promise<{ id: string }> => {
  const response = await http.delete<PayloadResponse<{ id: string }>>(
    `/cart/items/${cartItemId}`,
  )

  return response.payload
}

/** `DELETE /api/cart` — safe to call on an already empty cart. */
export const clearCart = async (): Promise<{ removed: number }> => {
  const response = await http.delete<PayloadResponse<{ removed: number }>>('/cart')

  return response.payload
}

/**
 * `POST /api/cart/merge` — call **once, immediately after login**, with
 * whatever the browser was holding while logged out.
 *
 * Per line the quantity kept is the *higher* of the guest and saved one, not
 * the sum, so calling it twice changes nothing. Lines whose variant is gone,
 * inactive or sold out come back in `skipped` with a reason instead of failing
 * the whole request. Answers with the whole recomputed cart, so the local copy
 * can be dropped and the UI rendered from this one response.
 */
export const mergeGuestCart = async (
  items: GuestCartItem[],
): Promise<MergeCartResult> => {
  const response = await http.post<PayloadResponse<MergeCartResult>>(
    '/cart/merge',
    { items },
  )

  return response.payload
}

/**
 * `POST /api/cart/discount/preview` — a quote, not an application. Nothing is
 * stored: the code is sent again with the order and re-validated there under a
 * row lock, so this can never be what decides the price.
 *
 * Rate limited to **10 checks per 5 minutes per account**. Unknown,
 * switched-off, expired and used-up codes all answer with the same "not
 * valid", since the difference is nothing the customer can act on.
 */
export const previewDiscount = async (code: string): Promise<DiscountPreview> => {
  const response = await http.post<PayloadResponse<DiscountPreview>>(
    '/cart/discount/preview',
    { code: code.trim() },
  )

  return response.payload
}
