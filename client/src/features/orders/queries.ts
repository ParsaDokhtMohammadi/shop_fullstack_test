import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { useSession } from '@/features/auth/queries'
import type { CreateOrderInput, OrderStatus, PaginationParams } from '@/types'
import { createOrder, fetchOrder, fetchOrders } from './api'

/** My order history, optionally filtered by status. */
export const useOrders = (params: PaginationParams & { status?: OrderStatus }) => {
  const { isLoggedIn } = useSession()

  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: ({ signal }) => fetchOrders(params, signal),
    enabled: isLoggedIn,
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.live,
  })
}

/**
 * One order in full.
 *
 * `refetchInterval` is set only while the order is awaiting payment: the
 * gateway's callback marks it paid server-to-server, so a customer sitting on
 * this page after returning from the bank has no other way to see the status
 * change. Once it is out of `pending_payment` the polling stops, because
 * nothing else changes without the customer doing something.
 */
export const useOrder = (id: string | undefined) => {
  const { isLoggedIn } = useSession()

  return useQuery({
    queryKey: queryKeys.orders.detail(id ?? ''),
    queryFn: ({ signal }) => fetchOrder(id as string, signal),
    enabled: isLoggedIn && Boolean(id),
    staleTime: STALE_TIME.live,
    refetchInterval: (query) =>
      query.state.data?.status === 'pending_payment' ? 10_000 : false,
  })
}

/**
 * Place the order.
 *
 * Both the cart and the order list are invalidated afterwards. The cart is
 * deliberately *not* emptied by this endpoint — that happens when the payment
 * succeeds — but its stock and availability flags can have changed as a result
 * of the transaction, so it is re-read rather than assumed unchanged.
 */
export const useCreateOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateOrderInput) => createOrder(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart })
    },
  })
}
