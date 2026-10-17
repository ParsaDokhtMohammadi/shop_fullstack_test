import { http } from '@/api/client'
import type {
  InitiatePaymentInput,
  PaginatedResponse,
  PaymentInitiation,
  PaymentRecord,
  PaginationParams,
  PayloadResponse,
} from '@/types'

/**
 * `POST /api/payments/initiate` — start paying for an order.
 *
 * Takes an order id and nothing else: the amount is read from the order row,
 * because a client that can name its own price eventually will. Answers with
 * the gateway URL to send the browser to. Refused unless the order is yours
 * and still `pending_payment`.
 */
export const initiatePayment = async (
  input: InitiatePaymentInput,
): Promise<PaymentInitiation> => {
  const response = await http.post<PayloadResponse<PaymentInitiation>>(
    '/payments/initiate',
    input,
  )

  return response.payload
}

/**
 * `GET /api/payments` — every attempt, newest first, including the abandoned
 * ones, because a customer asking "did my money go?" is usually looking at one
 * of those. `refId` is the bank receipt number to quote in a dispute.
 */
export const fetchPayments = (
  params: PaginationParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<PaymentRecord>> =>
  http.get<PaginatedResponse<PaymentRecord>>('/payments', { params, signal })

/**
 * There is deliberately no function here for `/api/payments/callback`.
 *
 * That route belongs to the payment gateway: it arrives as a browser redirect
 * from the bank with no session cookie, the server verifies the attempt
 * gateway-to-gateway, and then redirects the customer on to this app's
 * `/payment/result` page with the outcome in the query string. Calling it from
 * the frontend would be meaningless, and trusting its query parameters instead
 * of re-reading the order would be worse.
 */
