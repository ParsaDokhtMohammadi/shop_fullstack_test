import { Link, useParams } from 'react-router'
import { ChevronRight, CreditCard, MapPin, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Surface'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { Price } from '@/components/ui/Price'
import { ProductImage } from '@/components/ui/ProductImage'
import { Alert, ErrorState, FormError, LoadingState } from '@/components/ui/states'
import { formatDateTime, formatNumber, formatPhone, formatPrice } from '@/lib/format'
import { useOrder } from '@/features/orders/queries'
import { useInitiatePayment } from '@/features/payments/queries'
import type { OrderDetail } from '@/types'

/**
 * `/orders/:id` — one order in full.
 *
 * Everything here is a snapshot taken when the order was placed: the item
 * names, images and unit prices, the shipping address, and the coupon code as
 * text. Editing a product later does not rewrite this, which is the whole
 * point of the backend storing copies rather than joins.
 */
export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const order = useOrder(id)
  const initiatePayment = useInitiatePayment()

  if (order.isPending) return <LoadingState label="در حال بارگذاری سفارش…" />

  if (order.isError)
    return (
      <div className="page-container py-10">
        {/* A 404 here is also what another customer's order id returns — the
            order is scoped to the logged-in user, so it is not theirs to know
            exists. The message says "not found" rather than "forbidden"
            because that is the truth as far as this account is concerned. */}
        <ErrorState
          error={order.error}
          title="این سفارش پیدا نشد"
          onRetry={() => void order.refetch()}
        />
        <div className="text-center">
          <Link
            to="/orders"
            className="text-brand-700 hover:text-brand-800 text-sm font-medium"
          >
            بازگشت به سفارش‌ها
          </Link>
        </div>
      </div>
    )

  const data = order.data
  const isPayable = data.status === 'pending_payment'

  const pay = async () => {
    const payment = await initiatePayment.mutateAsync({ orderId: data.id })
    window.location.href = payment.redirectUrl
  }

  return (
    <div className="page-container py-6 sm:py-8">
      <Link
        to="/orders"
        className="text-ink-600 hover:text-brand-700 mb-5 inline-flex items-center gap-1 text-sm transition-colors"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        بازگشت به سفارش‌ها
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="ltr text-xl font-bold sm:text-2xl">{data.orderNumber}</h1>
          <p className="text-ink-500 mt-1.5 text-sm">
            ثبت شده در {formatDateTime(data.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={data.status} label={data.statusLabel} />
      </div>

      {isPayable && (
        <Alert tone="warn" className="mb-5">
          این سفارش در انتظار پرداخت است. در صورت پرداخت نشدن، پس از حدود ده
          دقیقه به‌طور خودکار لغو می‌شود و موجودی کالاها آزاد خواهد شد.
        </Alert>
      )}

      {data.status === 'failed' && (
        <Alert tone="error" className="mb-5">
          مهلت پرداخت این سفارش به پایان رسید و سفارش لغو شد. می‌توانید
          کالاها را دوباره به سبد اضافه کنید.
        </Alert>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-5">
          <Card padded={false}>
            <h2 className="border-ink-100 border-b px-5 py-4 text-base font-bold">
              کالاهای سفارش
            </h2>
            <ul className="divide-ink-100 divide-y">
              {data.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-5">
                  <div className="w-20 shrink-0">
                    <ProductImage
                      // The snapshot's own image path, not the product's
                      // current one — this is what was bought.
                      src={item.imageUrl}
                      alt={item.productName}
                      className="rounded-control"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-sm font-medium">{item.productName}</p>
                    {item.varientLabel && (
                      <p className="text-ink-500 mt-1 text-xs">{item.varientLabel}</p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
                      <span className="text-ink-500 text-xs">
                        {formatPrice(item.unitPrice)} × {formatNumber(item.quantity)}
                      </span>
                      <span className="font-semibold">
                        {formatPrice(item.lineTotal)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h2 className="mb-4 inline-flex items-center gap-2 text-base font-bold">
              <MapPin className="text-brand-600 size-5" aria-hidden="true" />
              نشانی تحویل
            </h2>
            <div className="text-ink-700 space-y-1.5 text-sm leading-7">
              <p className="font-medium">
                {data.shipping.firstName} {data.shipping.lastName}
              </p>
              <p>
                {data.shipping.province}، {data.shipping.city}،{' '}
                {data.shipping.address}
              </p>
              {data.shipping.postalCode && (
                <p className="text-ink-500">
                  کد پستی: <span className="ltr">{data.shipping.postalCode}</span>
                </p>
              )}
              <p className="text-ink-500 ltr">
                {formatPhone(data.shipping.phoneNumber)}
              </p>
            </div>

            {data.note && (
              <p className="text-ink-600 border-ink-100 mt-4 border-t pt-4 text-sm leading-7">
                <span className="text-ink-800 font-medium">توضیح سفارش: </span>
                {data.note}
              </p>
            )}
          </Card>

          {data.trackingNumber && (
            <Card>
              <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold">
                <Truck className="text-brand-600 size-5" aria-hidden="true" />
                کد رهگیری مرسوله
              </h2>
              <p className="ltr bg-ink-50 rounded-control px-4 py-3 text-sm font-medium">
                {data.trackingNumber}
              </p>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <h2 className="text-base font-bold">صورت‌حساب</h2>
            <Totals order={data} />

            {isPayable && (
              <>
                <FormError error={initiatePayment.error} />
                <Button
                  size="lg"
                  fullWidth
                  className="mt-4"
                  isLoading={initiatePayment.isPending}
                  loadingText="در حال انتقال به درگاه…"
                  onClick={() => void pay()}
                  icon={<CreditCard className="size-5" aria-hidden="true" />}
                >
                  پرداخت سفارش
                </Button>
              </>
            )}

            {data.paidAt && (
              <p className="text-success-700 mt-4 text-xs">
                پرداخت‌شده در {formatDateTime(data.paidAt)}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  )
}

const Totals = ({ order }: { order: OrderDetail }) => (
  <dl className="mt-4 space-y-3 text-sm">
    <div className="flex items-center justify-between">
      <dt className="text-ink-600">جمع کالاها</dt>
      <dd className="font-medium">{formatPrice(order.subTotal)}</dd>
    </div>

    {Number(order.discountTotal) > 0 && (
      <div className="flex items-center justify-between">
        <dt className="text-ink-600">
          تخفیف
          {order.discountCode && (
            <span className="text-ink-400 ltr ms-1 text-xs">
              ({order.discountCode})
            </span>
          )}
        </dt>
        <dd className="text-sale-600 font-medium">
          − {formatPrice(order.discountTotal)}
        </dd>
      </div>
    )}

    <div className="flex items-center justify-between">
      <dt className="text-ink-600">هزینه ارسال</dt>
      <dd className="font-medium">
        {Number(order.shippingTotal) === 0
          ? 'رایگان'
          : formatPrice(order.shippingTotal)}
      </dd>
    </div>

    <div className="border-ink-100 flex items-center justify-between border-t pt-3">
      <dt className="font-medium">مبلغ کل</dt>
      <dd>
        <Price amount={order.grandTotal} />
      </dd>
    </div>
  </dl>
)
