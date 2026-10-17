import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { mergeGuestCart } from '@/features/cart/api'
import { useGuestCart } from '@/features/cart/guest-cart-context'
import { toMergePayload } from '@/features/cart/guest-cart'
import type { SendOtpInput, VerifyOtpInput, UpdateProfileInput } from '@/types'
import {
  fetchProfile,
  fetchSession,
  logout as logoutRequest,
  requestOtp,
  updateProfile,
  verifyOtp,
} from './api'

/**
 * Who is logged in.
 *
 * This is the one piece of state the whole app branches on, and it is a React
 * Query query rather than a context holding a token — because there is no
 * token to hold. The session is an httpOnly cookie that JavaScript cannot
 * read, so "am I logged in?" is a question only the server can answer, and
 * `GET /api/auth/me` is what answers it.
 *
 * The endpoint always returns 200 with `user: null` for a guest, so this query
 * does not error on a logged-out visit — which is why `retry` is left at the
 * default rather than suppressed.
 */
export const useSession = () => {
  const query = useQuery({
    queryKey: queryKeys.session,
    queryFn: ({ signal }) => fetchSession(signal),
    // The session is cheap to check and everything depends on it, so it is
    // refetched on mount rather than cached — a cookie can expire mid-visit.
    staleTime: 0,
  })

  const user = query.data?.user ?? null

  return {
    ...query,
    user,
    isLoggedIn: user !== null,
    isAdmin: user?.role === 'admin',
    /** True only once we actually know, so a guard does not redirect too early. */
    isResolved: query.isSuccess || query.isError,
  }
}

/**
 * Step one of login: send the code.
 *
 * A 429 is the expected answer to an impatient customer — the backend allows
 * two requests per two minutes per IP — so the form shows a countdown rather
 * than treating it as a failure.
 */
export const useRequestOtp = () =>
  useMutation({
    mutationFn: (input: SendOtpInput) => requestOtp(input),
  })

/**
 * Step two: verify the code, which sets the session cookie.
 *
 * The guest basket is merged here rather than on the cart page, because the
 * backend's merge is documented to be called **once, immediately after
 * login** — and this is the only moment that is true. It is also safe if it
 * somehow runs twice: the endpoint keeps the higher quantity per line rather
 * than adding, so a repeat is a no-op.
 *
 * A failed merge deliberately does not fail the login. The customer is
 * already authenticated at that point, and refusing to let them in because
 * their week-old basket could not be folded in would be the wrong trade — the
 * error is surfaced as a warning on the cart instead.
 */
export const useVerifyOtp = () => {
  const queryClient = useQueryClient()
  const guestCart = useGuestCart()

  return useMutation({
    mutationFn: async (input: VerifyOtpInput) => {
      const result = await verifyOtp(input)

      const lines = guestCart.lines
      if (lines.length === 0) return { ...result, merge: null }

      try {
        const merge = await mergeGuestCart(toMergePayload(lines))
        // The server now holds the basket, so the local copy must go — leaving
        // it would merge the same lines again on the next login.
        guestCart.clear()

        return { ...result, merge }
      } catch {
        return { ...result, merge: null }
      }
    },
    onSuccess: async () => {
      // Everything that depends on who is logged in has to be re-read: the
      // session itself, the cart, the saved addresses and the order history.
      await queryClient.invalidateQueries({ queryKey: queryKeys.session })
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart })
      await queryClient.invalidateQueries({ queryKey: queryKeys.addresses })
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
    },
  })
}

/**
 * Logout. The cookie is cleared server-side, then the whole cache is dropped.
 *
 * `clear()` rather than targeted invalidation on purpose: anything fetched
 * while logged in belongs to that account, and leaving it in memory would show
 * the previous customer's orders for a moment to the next person at the same
 * browser.
 */
export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

/** The account page. `GET /api/me/profile` needs a session. */
export const useProfile = (enabled = true) =>
  useQuery({
    queryKey: queryKeys.profile,
    queryFn: ({ signal }) => fetchProfile(signal),
    enabled,
  })

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile })
      // The header greets the customer by name, and that comes from the
      // session query rather than the profile one.
      await queryClient.invalidateQueries({ queryKey: queryKeys.session })
    },
  })
}
