import { http } from '@/api/client'
import type {
  CreateOrderInput,
  CreatedOrder,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PaginatedResponse,
  PaginationParams,
  PayloadResponse,
} from '@/types'

/** `GET /api/orders` — my orders, newest first. Summaries only. */
export const fetchOrders = (
  params: PaginationParams & { status?: OrderStatus },
  signal?: AbortSignal,
): Promise<PaginatedResponse<OrderSummary>> =>
  http.get<PaginatedResponse<OrderSummary>>('/orders', { params, signal })

/**
 * `GET /api/orders/:id` — the full order: item snapshots, totals, the shipping
 * address as it was at purchase time, and the tracking number once there is
 * one.
 *
 * Scoped to the logged-in user, so **another customer's id answers 404, not
 * 403** — the order is not theirs to know exists.
 */
export const fetchOrder = async (
  id: string,
  signal?: AbortSignal,
): Promise<OrderDetail> => {
  const response = await http.get<PayloadResponse<OrderDetail>>(`/orders/${id}`, {
    signal,
  })

  return response.payload
}

/**
 * `POST /api/orders` — place the order from the cart, in one transaction.
 *
 * Only the address, the coupon code and the note are sent. Items, prices and
 * totals are all recomputed server-side under a row lock, so a price that
 * moved or a line that sold out is refused here by name rather than being
 * silently charged.
 *
 * Two behaviours worth knowing before wiring a button to this:
 *
 *  - A customer may hold only **one unpaid order** at a time, and this
 *    endpoint resolves that itself rather than failing. Sending the same
 *    basket, address, coupon and note again returns the *existing* pending
 *    order untouched — so a double-tapped button places one order, not two.
 *    Sending anything different cancels the old one, returning its stock and
 *    coupon use, and replaces it.
 *  - The order starts as `pending_payment` and the **cart is not emptied
 *    yet**. It is cleared when the payment succeeds, so a customer who
 *    abandons the gateway still has their basket. If they never pay, the
 *    expiry job closes the order after about ten minutes and gives the stock
 *    back.
 */
export const createOrder = async (
  input: CreateOrderInput,
): Promise<CreatedOrder> => {
  const response = await http.post<PayloadResponse<CreatedOrder>>('/orders', input)

  return response.payload
}
