import { Link, useSearchParams } from 'react-router'
import { ChevronLeft, PackageOpen } from 'lucide-react'
import { Card } from '@/components/ui/Surface'
import { OrderStatusBadge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Field'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states'
import { formatDate, formatNumber, formatPrice } from '@/lib/format'
import { useOrders } from '@/features/orders/queries'
import { OrderStatus } from '@/types'

/**
 * `/orders` — the customer's order history.
 *
 * Summaries only: the API deliberately leaves the item snapshots off this
 * endpoint so a long history does not grow the payload, and the detail page is
 * one click away.
 */

/**
 * Status labels for the filter dropdown.
 *
 * Note these are *ours*, unlike the `statusLabel` on each row — the API sends
 * that per order, but the filter needs a label for a status it has no row for
 * yet. They are kept in the same wording so the two never look different.
 */
const STATUS_FILTERS: { value: OrderStatus | ''; label: string }[] = [
  { value: '', label: 'همه سفارش‌ها' },
  { value: OrderStatus.PendingPayment, label: 'در انتظار پرداخت' },
  { value: OrderStatus.Paid, label: 'پرداخت‌شده' },
  { value: OrderStatus.Processing, label: 'در حال پردازش' },
  { value: OrderStatus.Shipped, label: 'ارسال‌شده' },
  { value: OrderStatus.Delivered, label: 'تحویل‌شده' },
  { value: OrderStatus.Cancelled, label: 'لغوشده' },
  { value: OrderStatus.Failed, label: 'ناموفق' },
  { value: OrderStatus.Refunded, label: 'بازگشت وجه' },
]

const VALID_STATUSES = new Set<string>(Object.values(OrderStatus))

export const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const rawStatus = searchParams.get('status')
  // Checked against the enum so a hand-edited `?status=nope` is dropped rather
  // than sent to the API, which answers 400 on an unknown value.
  const status =
    rawStatus && VALID_STATUSES.has(rawStatus) ? (rawStatus as OrderStatus) : undefined

  const orders = useOrders({ page, limit: 10, ...(status ? { status } : {}) })

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold sm:text-3xl">سفارش‌های من</h1>
        <Select
          aria-label="فیلتر وضعیت سفارش"
          value={status ?? ''}
          onChange={(event) => setParam('status', event.target.value)}
          className="h-10 w-48"
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {orders.isPending ? (
        <LoadingState label="در حال بارگذاری سفارش‌ها…" />
      ) : orders.isError ? (
        <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />
      ) : orders.data.items.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="size-7" aria-hidden="true" />}
          title={status ? 'سفارشی با این وضعیت ندارید' : 'هنوز سفارشی ثبت نکرده‌اید'}
          description={
            status
              ? 'فیلتر را بردارید تا همه سفارش‌ها را ببینید.'
              : 'پس از اولین خرید، سفارش‌هایتان اینجا نمایش داده می‌شود.'
          }
          action={
            <Link
              to="/products"
              className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 items-center rounded-control px-6 text-sm font-medium text-white transition-colors"
            >
              شروع خرید
            </Link>
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {orders.data.items.map((order) => (
              <li key={order.id}>
                <Link to={`/orders/${order.id}`} className="block">
                  <Card className="hover:border-brand-300 hover:shadow-card-hover transition-[border-color,box-shadow]">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {/* An order number is Latin text in an RTL page. */}
                          <span className="ltr text-sm font-bold">
                            {order.orderNumber}
                          </span>
                          <OrderStatusBadge
                            status={order.status}
                            label={order.statusLabel}
                          />
                        </div>
                        <p className="text-ink-500 mt-2 text-xs">
                          {formatDate(order.createdAt)} ·{' '}
                          {formatNumber(order.itemsCount)} کالا
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold">
                          {formatPrice(order.grandTotal)}
                        </span>
                        <ChevronLeft
                          className="text-ink-400 size-5 shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>

          <Pagination
            meta={orders.data.meta}
            isLoading={orders.isPlaceholderData}
            onPageChange={(next) => setParam('page', String(next))}
            className="mt-8"
          />
        </>
      )}
    </div>
  )
}
