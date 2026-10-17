import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  addToGuestCart,
  clearGuestCart,
  guestCartCount,
  readGuestCart,
  removeFromGuestCart,
  setGuestCartQuantity,
  type GuestCartLine,
} from './guest-cart'
import { GuestCartContext, type GuestCartContextValue } from './guest-cart-context'

/**
 * Makes the localStorage basket reactive.
 *
 * localStorage does not notify React when it changes, so the lines are mirrored
 * in state here and every write goes through this provider: localStorage is the
 * durable copy, this state is what renders. Without it, adding an item would
 * not update the count in the header until the next navigation.
 *
 * This is **local UI state, kept deliberately separate from server state** —
 * React Query owns everything that comes from the API, and this owns the one
 * thing that does not. A logged-in customer's cart is not in here at all; it
 * lives on the server, under the `cart` query key.
 */
export const GuestCartProvider = ({ children }: { children: ReactNode }) => {
  // Read once on mount. The initialiser is a function so the parse happens on
  // the first render only, rather than on every one.
  const [lines, setLines] = useState<GuestCartLine[]>(() => readGuestCart())

  const add = useCallback(
    (productVarientId: string, slug: string, quantity = 1) => {
      setLines([...addToGuestCart(productVarientId, slug, quantity)])
    },
    [],
  )

  const setQuantity = useCallback((productVarientId: string, quantity: number) => {
    setLines([...setGuestCartQuantity(productVarientId, quantity)])
  }, [])

  const remove = useCallback((productVarientId: string) => {
    setLines([...removeFromGuestCart(productVarientId)])
  }, [])

  const clear = useCallback(() => {
    clearGuestCart()
    setLines([])
  }, [])

  const value = useMemo<GuestCartContextValue>(
    () => ({ lines, count: guestCartCount(lines), add, setQuantity, remove, clear }),
    [lines, add, setQuantity, remove, clear],
  )

  return <GuestCartContext.Provider value={value}>{children}</GuestCartContext.Provider>
}
