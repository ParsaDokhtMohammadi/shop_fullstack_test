import { Link } from 'react-router'
import { ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Price } from '@/components/ui/Price'
import { ProductImage } from '@/components/ui/ProductImage'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import {
  Alert,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
} from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { formatNumber, formatPrice } from '@/lib/format'
import { useSession } from '@/features/auth/queries'
import {
  useClearCart,
  useRemoveCartItem,
  useServerCart,
  useUpdateCartQuantity,
} from '@/features/cart/queries'
import { useGuestCart } from '@/features/cart/guest-cart-context'
import { GuestCartView } from '@/features/cart/components/GuestCartView'
import type { CartLine } from '@/types'

/**
 * `/cart`.
 *
 * Two genuinely different implementations behind one route, because the data
 * comes from two different places: a logged-in customer's basket is a server
 * resource that the API prices and validates, and a guest's is a local list of
 * variant ids priced by re-reading the catalogue. Pretending they are the same
 * thing would mean faking one of them.
 */
export const CartPage = () => {
  const { isLoggedIn, isPending: isSessionPending } = useSession()
  const guestCart = useGuestCart()

  if (isSessionPending) return <LoadingState />

  const isEmpty = isLoggedIn ? false : guestCart.lines.length === 0

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">سبد خرید</h1>

      {isEmpty ? (
        <EmptyCart />
      ) : isLoggedIn ? (
        <ServerCartView />
      ) : (
        <GuestCartView />
      )}
    </div>
  )
}

const EmptyCart = () => (
  <EmptyState
    icon={<ShoppingBag className="size-7" aria-hidden="true" />}
    title="سبد خرید شما خالی است"
    description="از میان محصولات فروشگاه انتخاب کنید و به سبد اضافه کنید."
    action={
      <Link
        to="/products"
        className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 items-center rounded-control px-6 text-sm font-medium text-white transition-colors"
      >
        مشاهده محصولات
      </Link>
    }
  />
)

/** The logged-in basket: priced, validated and totalled by the API. */
const ServerCartView = () => {
  const cart = useServerCart()
  const updateQuantity = useUpdateCartQuantity()
  const removeItem = useRemoveCartItem()
  const clear = useClearCart()

  if (cart.isPending) return <LoadingState label="در حال بارگذاری سبد…" />
  if (cart.isError)
    return <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />

  const { items, totals } = cart.data
  if (items.length === 0) return <EmptyCart />

  const unavailable = items.filter((line) => !line.isAvailable)
  const canCheckout = totals.itemsCount > 0

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="flex flex-col gap-3">
        {unavailable.length > 0 && (
          <Alert tone="warn">
            {formatNumber(unavailable.length)} کالا در سبد شما قابل خریداری
            نیست و در جمع کل محاسبه نشده است. برای ادامه، آن‌ها را حذف کنید یا
            تعدادشان را کم کنید.
          </Alert>
        )}

        <FormError error={updateQuantity.error ?? removeItem.error} />

        <ul className="flex flex-col gap-3">
          {items.map((line) => (
            <CartRow
              key={line.id}
              line={line}
              isBusy={updateQuantity.isPending || removeItem.isPending}
              onQuantityChange={(quantity) =>
                updateQuantity.mutate({ cartItemId: line.id, quantity })
              }
              onRemove={() => removeItem.mutate(line.id)}
            />
          ))}
        </ul>

        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clear.mutate(undefined)}
            isLoading={clear.isPending}
            loadingText="در حال خالی کردن…"
            icon={<Trash2 className="size-4" aria-hidden="true" />}
            className="text-sale-700 hover:bg-sale-50"
          >
            خالی کردن سبد خرید
          </Button>
        </div>
      </div>

      <aside className="border-ink-200 rounded-card border bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-base font-bold">خلاصه سبد</h2>

        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-600">تعداد کالا</dt>
            <dd className="font-medium tabular-nums">
              {formatNumber(totals.itemsCount)}
            </dd>
          </div>

          {/* What the per-variant discounts already saved. A coupon is applied
              later, at checkout — it is a different number. */}
          {Number(totals.discountTotal) > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-ink-600">سود شما از تخفیف</dt>
              <dd className="text-sale-600 font-medium">
                {formatPrice(totals.discountTotal)}
              </dd>
            </div>
          )}

          <div className="border-ink-100 flex items-center justify-between border-t pt-3">
            <dt className="text-ink-700 font-medium">جمع کل</dt>
            <dd>
              <Price amount={totals.subtotal} />
            </dd>
          </div>
        </dl>

        <p className="text-ink-500 mt-3 text-xs leading-6">
          هزینه ارسال در مرحله ثبت سفارش و بر اساس آدرس شما محاسبه می‌شود.
        </p>

        {canCheckout ? (
          <Link
            to="/checkout"
            className="bg-brand-600 hover:bg-brand-700 mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-control font-medium text-white transition-colors"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
            ادامه و ثبت سفارش
          </Link>
        ) : (
          <p className="bg-ink-100 text-ink-500 mt-5 flex h-12 w-full items-center justify-center rounded-control text-sm">
            هیچ کالای قابل خریدی در سبد نیست
          </p>
        )}
      </aside>
    </div>
  )
}

const CartRow = ({
  line,
  isBusy,
  onQuantityChange,
  onRemove,
}: {
  line: CartLine
  isBusy: boolean
  onQuantityChange: (quantity: number) => void
  onRemove: () => void
}) => {
  const varientLabel = [line.color, line.size].filter(Boolean).join(' / ')

  return (
    <li
      className={cn(
        'border-ink-200 flex gap-4 rounded-card border bg-white p-4',
        !line.isAvailable && 'bg-sale-50/40 border-sale-100',
      )}
    >
      <Link to={`/product/${line.slug}`} className="w-24 shrink-0 sm:w-28">
        <ProductImage
          src={line.coverImage}
          alt={line.name}
          className="rounded-control"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={`/product/${line.slug}`}
              className="hover:text-brand-700 line-clamp-2-fixed text-sm font-medium transition-colors"
            >
              {line.name}
            </Link>
            {varientLabel && (
              <p className="text-ink-500 mt-1 flex items-center gap-1.5 text-xs">
                {line.colorCode && (
                  <span
                    className="border-ink-300/70 inline-block size-3 rounded-full border"
                    style={{ backgroundColor: line.colorCode }}
                    aria-hidden="true"
                  />
                )}
                {varientLabel}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={isBusy}
            aria-label={`حذف ${line.name} از سبد`}
            className="text-ink-400 hover:bg-sale-50 hover:text-sale-600 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>

        {line.isAvailable ? (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <QuantityStepper
              value={line.quantity}
              onChange={onQuantityChange}
              max={line.stock}
              isDisabled={isBusy}
              size="sm"
            />
            <div className="text-end">
              <span className="text-sm font-semibold">
                {formatPrice(line.lineTotal)}
              </span>
              {Number(line.price) > Number(line.finalPrice) && (
                <span className="text-ink-400 ms-2 text-xs line-through">
                  {formatPrice(String(Number(line.price) * line.quantity))}
                </span>
              )}
            </div>
          </div>
        ) : (
          // `isAvailable: false` can mean the variant went inactive, its
          // product was unpublished, its category was switched off, or stock
          // fell below the wanted quantity. The API does not say which, so the
          // message covers the actionable case.
          <p className="text-sale-700 mt-auto text-xs font-medium">
            این کالا در حال حاضر قابل خریداری نیست
            {line.stock > 0 && ` — تنها ${formatNumber(line.stock)} عدد موجود است`}
          </p>
        )}
      </div>
    </li>
  )
}
