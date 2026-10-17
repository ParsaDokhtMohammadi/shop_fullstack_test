import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/queries'
import type { InitiatePaymentInput, PaginationParams } from '@/types'
import { fetchPayments, initiatePayment } from './api'

/** My payment attempts. */
export const usePayments = (params: PaginationParams) => {
  const { isLoggedIn } = useSession()

  return useQuery({
    queryKey: queryKeys.payments.list(params),
    queryFn: ({ signal }) => fetchPayments(params, signal),
    enabled: isLoggedIn,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.live,
  })
}

/**
 * Start a payment and leave the app.
 *
 * Nothing is invalidated on success, because on success this navigation does
 * not come back: the caller assigns `window.location.href` to the returned
 * gateway URL. A cache update would be thrown away with the page.
 *
 * `window.location` rather than a router navigation is the point — the gateway
 * is a different origin, so this has to be a real browser navigation and not a
 * client-side route change.
 */
export const useInitiatePayment = () =>
  useMutation({
    mutationFn: (input: InitiatePaymentInput) => initiatePayment(input),
  })
