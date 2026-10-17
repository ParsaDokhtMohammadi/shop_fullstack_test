import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/queries'
import {
  addCartItem,
  clearCart,
  fetchCart,
  previewDiscount,
  removeCartItem,
  updateCartItemQuantity,
} from './api'
import { useGuestCart } from './guest-cart-context'

/**
 * The server-side cart. Only fetched when there is a session — `GET /api/cart`
 * is behind AuthGuard and would answer 401 for a guest, which React Query
 * would then surface as an error on a page that is working correctly.
 */
export const useServerCart = () => {
  const { isLoggedIn } = useSession()

  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: ({ signal }) => fetchCart(signal),
    enabled: isLoggedIn,
    // Always revalidate: the lines are re-priced server-side on every read, so
    // a cached cart can be showing a price or a stock level that has moved.
    staleTime: STALE_TIME.live,
  })
}

/**
 * The number on the header's basket button, from whichever cart is in play.
 *
 * Only the *available* lines are counted for a logged-in customer, because
 * that is what `totals.itemsCount` means — a line whose variant sold out is
 * still listed but is not part of the total and cannot be checked out.
 */
export const useCartCount = (): number => {
  const { isLoggedIn } = useSession()
  const serverCart = useServerCart()
  const guestCart = useGuestCart()

  if (!isLoggedIn) return guestCart.count

  return serverCart.data?.totals.itemsCount ?? 0
}

/**
 * Every cart mutation invalidates the one cart query rather than trying to
 * patch the cache by hand.
 *
 * That is a deliberate choice, not laziness: the totals, the per-line
 * `lineTotal` and every `isAvailable` flag are computed by the server from
 * current prices and stock. Reproducing that arithmetic in the client would be
 * a second pricing implementation that can disagree with the real one — and
 * the one in the browser is the one the customer would see.
 */
const useCartMutation = <TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
  })
}

/** Add a variant to the logged-in cart. Quantity accumulates server-side. */
export const useAddToCart = () =>
  useCartMutation((input: { productVarientId: string; quantity?: number }) =>
    addCartItem(input),
  )

/** Set a line's quantity. Takes the **cart item** id, not the variant id. */
export const useUpdateCartQuantity = () =>
  useCartMutation(({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
    updateCartItemQuantity(cartItemId, quantity),
  )

/** Remove one line. Takes the cart item id. */
export const useRemoveCartItem = () =>
  useCartMutation((cartItemId: string) => removeCartItem(cartItemId))

/** Empty the cart. */
export const useClearCart = () => useCartMutation(() => clearCart())

/**
 * Check a discount code against the current cart.
 *
 * A mutation rather than a query, even though it only reads: it is a POST, it
 * is rate limited to ten calls per five minutes per account, and it must run
 * when the customer presses the button — never automatically on render, which
 * is what a query with a key would risk.
 *
 * The result is a quote. The code is sent again with the order and
 * re-validated there under a row lock, so nothing here is binding.
 */
export const usePreviewDiscount = () =>
  useMutation({
    mutationFn: (code: string) => previewDiscount(code),
  })
