import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Card } from '@/components/ui/Surface'
import { Button } from '@/components/ui/Button'
import { queryKeys } from '@/api/query-keys'

/**
 * `/payment/result` — where the gateway's callback sends the customer back to.
 *
 * This is the URL the backend's `PAYMENT_RESULT_URL` must point at. The flow
 * is: the bank redirects to the API's `/api/payments/callback`, the API
 * verifies the attempt server-to-server, marks the order paid and empties the
 * cart, and *then* redirects the browser here with
 * `?status=&message=&order=&ref=`.
 *
 * **None of those query parameters is trusted.** Anyone can type this URL with
 * `?status=success`. They are only used to phrase the message; what actually
 * happened is settled on the order page, which re-reads the order from the
 * API. That is why the primary action here is a link to the order rather than
 * a claim about it.
 */
export const PaymentResultPage = () => {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const status = searchParams.get('status')
  const message = searchParams.get('message')
  const orderNumber = searchParams.get('order')
  const refId = searchParams.get('ref')

  const isSuccess = status === 'success'

  // Whatever the gateway did, it happened outside this app: the cart may have
  // been emptied and an order's status changed, server-side, while the browser
  // was away. So the caches that could now be stale are dropped.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cart })
    void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
  }, [queryClient])

  return (
    <div className="page-container flex justify-center py-12 sm:py-20">
      <Card className="w-full max-w-lg text-center">
        <span
          className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-full ${
            isSuccess ? 'bg-success-50 text-success-600' : 'bg-sale-50 text-sale-600'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="size-8" aria-hidden="true" />
          ) : (
            <XCircle className="size-8" aria-hidden="true" />
          )}
        </span>

        <h1 className="text-xl font-bold">
          {isSuccess ? 'پرداخت با موفقیت انجام شد' : 'پرداخت انجام نشد'}
        </h1>

        {/* The gateway's own Persian message, which is more specific than
            anything we could write — "cancelled by user", "insufficient
            funds", and so on. */}
        {message && (
          <p className="text-ink-600 mt-3 text-sm leading-7">{message}</p>
        )}

        <dl className="bg-ink-50 mt-6 space-y-2.5 rounded-control p-4 text-start text-sm">
          {orderNumber && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-600">شماره سفارش</dt>
              <dd className="ltr font-medium">{orderNumber}</dd>
            </div>
          )}
          {refId && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-ink-600">شماره پیگیری بانکی</dt>
              {/* The receipt number to quote in a dispute — worth making easy
                  to copy, hence the monospace-ish tabular treatment. */}
              <dd className="ltr font-medium tabular-nums">{refId}</dd>
            </div>
          )}
        </dl>

        {!isSuccess && (
          <p className="text-ink-500 mt-4 text-xs leading-6">
            اگر مبلغی از حساب شما کسر شده باشد، طی ۷۲ ساعت به‌طور خودکار بازگشت
            داده می‌شود.
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {/* Deliberately a link to the order list rather than to one order:
              the callback gives an order *number*, and the API's detail route
              takes a UUID — there is no lookup-by-number endpoint, so the list
              is the honest destination. */}
          <Link to="/orders">
            <Button>مشاهده سفارش‌ها</Button>
          </Link>
          <Link to="/products">
            <Button variant="outline">ادامه خرید</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
