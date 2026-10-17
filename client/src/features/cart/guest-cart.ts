import type { GuestCartItem } from '@/types'

/**
 * The logged-out basket.
 *
 * The backend's cart is keyed to a user and needs a session, so there is no
 * endpoint a guest can add to. This is not a gap being papered over: the API
 * is built for exactly this arrangement — `POST /api/cart/merge` exists to
 * "fold a guest cart into the saved one", called once after login with
 * "whatever the browser was holding while logged out".
 *
 * What is stored is deliberately the bare minimum: a variant id, a quantity,
 * and the product's slug. **No price, name or image is cached here.** Those
 * are read live from `GET /api/products/:slug` when the basket is rendered, so
 * a basket left for a week shows today's price and today's stock rather than a
 * stale snapshot the customer could hold us to. The slug is only a pointer
 * back to the API, and a product that has since been unpublished simply 404s
 * and the line is shown as unavailable.
 *
 * The merge endpoint caps every quantity at current stock and reports lines it
 * could not take, which is what makes an old basket safe to hand over.
 */

/** One locally held basket line. `slug` is local only — the API never sees it. */
export interface GuestCartLine {
  productVarientId: string
  quantity: number
  /** Which product to re-fetch to price and name this line. */
  slug: string
}

const STORAGE_KEY = 'shop.guest-cart.v1'

/** The backend's merge endpoint accepts at most this many lines per request. */
const MAX_ITEMS = 50

/** The backend caps the quantity field at 100. */
const MAX_QUANTITY = 100

/**
 * Every read and write is wrapped: localStorage throws in a Safari private
 * window and when a browser is set to block site data, and a shop that
 * white-screens because of that is worse than one with no guest basket.
 */
export const readGuestCart = (): GuestCartLine[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Validated rather than trusted: this value survives deploys, so a shape
    // written by an older version of the app can still be in a browser.
    return parsed
      .filter((item): item is GuestCartLine => {
        if (typeof item !== 'object' || item === null) return false
        const line = item as Partial<GuestCartLine>

        return (
          typeof line.productVarientId === 'string' &&
          typeof line.slug === 'string' &&
          Number.isInteger(line.quantity) &&
          (line.quantity ?? 0) > 0
        )
      })
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

const writeGuestCart = (lines: GuestCartLine[]): void => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(lines.slice(0, MAX_ITEMS)),
    )
  } catch {
    // Storage full or blocked. The basket is then in-memory for this page view
    // only — degraded, not broken.
  }
}

export const clearGuestCart = (): void => {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // If it cannot be removed, it could not have been written either.
  }
}

/**
 * Adds to a line's quantity, matching what `POST /api/cart/items` does for a
 * logged-in customer — so the "add to basket" button behaves identically
 * whether or not there is a session.
 */
export const addToGuestCart = (
  productVarientId: string,
  slug: string,
  quantity = 1,
): GuestCartLine[] => {
  const lines = readGuestCart()
  const existing = lines.find((line) => line.productVarientId === productVarientId)

  if (existing)
    existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY)
  else
    lines.push({
      productVarientId,
      slug,
      quantity: Math.min(quantity, MAX_QUANTITY),
    })

  writeGuestCart(lines)

  return lines
}

/** Sets a line's quantity outright, removing it when the quantity hits zero. */
export const setGuestCartQuantity = (
  productVarientId: string,
  quantity: number,
): GuestCartLine[] => {
  const lines = readGuestCart()
  const existing = lines.find((line) => line.productVarientId === productVarientId)

  if (!existing) return lines

  if (quantity <= 0) {
    const remaining = lines.filter(
      (line) => line.productVarientId !== productVarientId,
    )
    writeGuestCart(remaining)

    return remaining
  }

  existing.quantity = Math.min(quantity, MAX_QUANTITY)
  writeGuestCart(lines)

  return lines
}

export const removeFromGuestCart = (productVarientId: string): GuestCartLine[] =>
  setGuestCartQuantity(productVarientId, 0)

/** Total quantity, for the badge on the header's basket button. */
export const guestCartCount = (lines: GuestCartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0)

/**
 * Drops the local-only `slug` field. The backend's ValidationPipe runs with
 * `whitelist: true`, so it would strip the key silently rather than complain —
 * which is exactly why it is removed here instead: a field the server quietly
 * discards is one nobody notices is being sent for no reason.
 */
export const toMergePayload = (lines: GuestCartLine[]): GuestCartItem[] =>
  lines.map(({ productVarientId, quantity }) => ({ productVarientId, quantity }))
