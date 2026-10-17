import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CreditCard, MapPin, Plus, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Surface'
import { Input } from '@/components/ui/Field'
import { Price } from '@/components/ui/Price'
import {
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
} from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { formatNumber, formatPhone, formatPrice } from '@/lib/format'
import { useServerCart } from '@/features/cart/queries'
import { usePreviewDiscount } from '@/features/cart/queries'
import { useAddresses, useCreateAddress } from '@/features/addresses/queries'
import { AddressForm } from '@/features/addresses/components/AddressForm'
import { useCreateOrder } from '@/features/orders/queries'
import { useInitiatePayment } from '@/features/payments/queries'
import type { Address, DiscountPreview } from '@/types'

/**
 * `/checkout` — pick an address, optionally apply a coupon, place the order
 * and go to the gateway.
 *
 * The totals shown here are deliberately incomplete, and honestly so: the cart
 * endpoint has no address, so it cannot know the shipping cost, and the
 * discount preview says the same. The real grand total is computed by
 * `POST /api/orders` inside its transaction and is shown on the order page
 * straight afterwards. Guessing shipping here would mean displaying a number
 * the backend may not agree with.
 */
export const CheckoutPage = () => {
  const navigate = useNavigate()
  const cart = useServerCart()
  const addresses = useAddresses()

  // The customer's explicit pick. Null means "nothing chosen yet", and the
  // effective id below falls back to their default address — derived rather
  // than written into state by an effect, so there is no render where the
  // selection is briefly empty and no risk of overwriting a real choice.
  const [pickedAddressId, setPickedAddressId] = useState<string | null>(null)
  const [isAddingAddress, setAddingAddress] = useState(false)
  const [note, setNote] = useState('')
  const [discount, setDiscount] = useState<DiscountPreview | null>(null)

  const createAddress = useCreateAddress()
  const createOrder = useCreateOrder()
  const initiatePayment = useInitiatePayment()

  // Each query is narrowed on its own. A combined `a.isPending ||
  // b.isPending` check reads fine but narrows neither, so `.data` would still
  // be possibly-undefined below.
  if (cart.isPending) return <LoadingState />
  if (cart.isError)
    return (
      <div className="page-container py-8">
        <ErrorState error={cart.error} onRetry={() => void cart.refetch()} />
      </div>
    )

  if (addresses.isPending) return <LoadingState />
  if (addresses.isError)
    return (
      <div className="page-container py-8">
        <ErrorState
          error={addresses.error}
          onRetry={() => void addresses.refetch()}
        />
      </div>
    )

  /**
   * What is actually selected: the customer's pick if they made one and it is
   * still in the list, otherwise their default address, otherwise the first.
   */
  const fallbackAddress =
    addresses.data.find((address) => address.isDefault) ?? addresses.data[0]
  const addressId =
    (pickedAddressId &&
      addresses.data.some((address) => address.id === pickedAddressId)
      ? pickedAddressId
      : fallbackAddress?.id) ?? null

  const payableLines = cart.data.items.filter((line) => line.isAvailable)

  if (payableLines.length === 0)
    return (
      <div className="page-container py-8">
        <EmptyState
          title="سبد خرید شما کالای قابل خریدی ندارد"
          description="برای ثبت سفارش ابتدا کالایی به سبد اضافه کنید."
          action={
            <Link
              to="/products"
              className="bg-brand-600 hover:bg-brand-700 inline-flex h-11 items-center rounded-control px-6 text-sm font-medium text-white transition-colors"
            >
              مشاهده محصولات
            </Link>
          }
        />
      </div>
    )

  /**
   * Place the order, then immediately ask for a gateway URL and leave.
   *
   * Two requests on purpose, because that is how the API is shaped:
   * `POST /orders` creates a `pending_payment` order, and
   * `POST /payments/initiate` turns an order id into a redirect. Splitting
   * them is what makes "pay for an order I placed earlier" possible from the
   * order page.
   *
   * If the order is created but the payment cannot be started, the customer is
   * sent to the order page rather than left here — the order exists, it is
   * payable, and that page has a pay button.
   */
  const placeOrder = async () => {
    if (!addressId) return

    const order = await createOrder.mutateAsync({
      addressId,
      ...(discount ? { discountCode: discount.code } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    })

    try {
      const payment = await initiatePayment.mutateAsync({ orderId: order.id })
      // A real browser navigation, not a router one: the gateway is another
      // origin.
      window.location.href = payment.redirectUrl
    } catch {
      void navigate(`/orders/${order.id}`, { replace: true })
    }
  }

  const subtotal = Number(cart.data.totals.subtotal)
  const discountAmount = discount ? Number(discount.discountAmount) : 0

  return (
    <div className="page-container py-6 sm:py-8">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">تکمیل سفارش</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="flex flex-col gap-5">
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="inline-flex items-center gap-2 text-base font-bold">
                <MapPin className="text-brand-600 size-5" aria-hidden="true" />
                نشانی تحویل
              </h2>
              {!isAddingAddress && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingAddress(true)}
                  icon={<Plus className="size-4" aria-hidden="true" />}
                >
                  نشانی جدید
                </Button>
              )}
            </div>

            {isAddingAddress ? (
              <AddressForm
                isSubmitting={createAddress.isPending}
                error={createAddress.error}
                onCancel={() => setAddingAddress(false)}
                onSubmit={(values) =>
                  createAddress.mutate(values, {
                    onSuccess: (created) => {
                      setPickedAddressId(created.id)
                      setAddingAddress(false)
                    },
                  })
                }
              />
            ) : addresses.data.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-ink-600 text-sm">
                  هنوز نشانی‌ای ثبت نکرده‌اید.
                </p>
                <Button className="mt-4" onClick={() => setAddingAddress(true)}>
                  افزودن نشانی
                </Button>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {addresses.data.map((address) => (
                  <li key={address.id}>
                    <AddressOption
                      address={address}
                      isSelected={addressId === address.id}
                      onSelect={() => setPickedAddressId(address.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 inline-flex items-center gap-2 text-base font-bold">
              <Ticket className="text-brand-600 size-5" aria-hidden="true" />
              کد تخفیف
            </h2>
            <DiscountBox applied={discount} onApply={setDiscount} />
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-bold">توضیح سفارش (اختیاری)</h2>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="یادداشتی برای پیک یا بسته‌بندی"
              maxLength={500}
            />
          </Card>
        </div>

        <aside className="border-ink-200 rounded-card border bg-white p-5 lg:sticky lg:top-28">
          <h2 className="text-base font-bold">صورت‌حساب</h2>

          <ul className="border-ink-100 mt-4 space-y-2.5 border-b pb-4">
            {payableLines.map((line) => (
              <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-ink-700 min-w-0">
                  <span className="line-clamp-2-fixed">{line.name}</span>
                  <span className="text-ink-400 text-xs">
                    × {formatNumber(line.quantity)}
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {formatPrice(line.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-600">جمع کالاها</dt>
              <dd className="font-medium">{formatPrice(String(subtotal))}</dd>
            </div>

            {discount && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-600">تخفیف «{discount.code}»</dt>
                <dd className="text-sale-600 font-medium">
                  − {formatPrice(discount.discountAmount)}
                </dd>
              </div>
            )}

            <div className="flex items-center justify-between">
              <dt className="text-ink-600">هزینه ارسال</dt>
              <dd className="text-ink-500 text-xs">
                در مرحله نهایی محاسبه می‌شود
              </dd>
            </div>

            <div className="border-ink-100 flex items-center justify-between border-t pt-3">
              <dt className="font-medium">مبلغ قابل پرداخت</dt>
              <dd>
                <Price amount={String(subtotal - discountAmount)} />
              </dd>
            </div>
          </dl>

          {/* Said plainly rather than hidden: the server adds shipping inside
              the order transaction, so this figure is not the final one. */}
          <p className="text-ink-500 mt-3 text-xs leading-6">
            مبلغ نهایی همراه با هزینه ارسال، پس از ثبت سفارش و پیش از پرداخت به
            شما نمایش داده می‌شود.
          </p>

          <FormError error={createOrder.error ?? initiatePayment.error} />

          <Button
            size="lg"
            fullWidth
            className="mt-5"
            disabled={!addressId}
            isLoading={createOrder.isPending || initiatePayment.isPending}
            loadingText="در حال ثبت سفارش…"
            onClick={() => void placeOrder()}
            icon={<CreditCard className="size-5" aria-hidden="true" />}
          >
            ثبت سفارش و پرداخت
          </Button>

          {!addressId && (
            <p className="text-ink-500 mt-2 text-center text-xs">
              برای ادامه، یک نشانی انتخاب کنید.
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

const AddressOption = ({
  address,
  isSelected,
  onSelect,
}: {
  address: Address
  isSelected: boolean
  onSelect: () => void
}) => (
  // A label wrapping a radio rather than a div with onClick: it is keyboard
  // operable and announced as a radio group for free.
  <label
    className={cn(
      'flex cursor-pointer gap-3 rounded-control border p-4 transition-colors',
      isSelected
        ? 'border-brand-600 bg-brand-50/60 ring-1 ring-brand-600'
        : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50',
    )}
  >
    <input
      type="radio"
      name="address"
      checked={isSelected}
      onChange={onSelect}
      className="accent-brand-600 mt-1 size-4 shrink-0 cursor-pointer"
    />
    <div className="min-w-0 text-sm">
      <p className="font-medium">
        {address.firstName} {address.lastName}
        {address.isDefault && (
          <span className="bg-brand-100 text-brand-800 ms-2 rounded-pill px-2 py-0.5 text-xs font-medium">
            پیش‌فرض
          </span>
        )}
      </p>
      <p className="text-ink-600 mt-1 leading-6">
        {address.province}، {address.city}، {address.address}
      </p>
      <p className="text-ink-500 ltr mt-1 text-xs">
        {formatPhone(address.phoneNumber)}
      </p>
    </div>
  </label>
)

/**
 * The coupon box.
 *
 * The result is explicitly a quote: the code is sent again with the order and
 * re-validated under a row lock, so what is shown here is advisory. It is
 * still worth doing — a customer learns at the basket that they have already
 * used a code, instead of at the end of checkout.
 *
 * Rate limited to ten checks per five minutes per account, which is generous
 * for a real customer and slow for someone working through a list of guesses.
 */
const DiscountBox = ({
  applied,
  onApply,
}: {
  applied: DiscountPreview | null
  onApply: (preview: DiscountPreview | null) => void
}) => {
  const [code, setCode] = useState('')
  const preview = usePreviewDiscount()

  if (applied)
    return (
      <div className="bg-success-50 border-success-100 flex flex-wrap items-center justify-between gap-3 rounded-control border px-4 py-3">
        <p className="text-success-700 text-sm">
          کد «<span className="font-bold">{applied.code}</span>» اعمال شد —{' '}
          {formatPrice(applied.discountAmount)} تخفیف
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onApply(null)
            setCode('')
            preview.reset()
          }}
        >
          حذف کد
        </Button>
      </div>
    )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-48 flex-1">
          <Input
            // The backend accepts letters, digits, underscore and hyphen only.
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase())
            }
            placeholder="کد تخفیف را وارد کنید"
            className="ltr"
            aria-label="کد تخفیف"
          />
        </div>
        <Button
          onClick={() =>
            preview.mutate(code, { onSuccess: (result) => onApply(result) })
          }
          disabled={code.trim().length < 3}
          isLoading={preview.isPending}
          loadingText="در حال بررسی…"
        >
          اعمال کد
        </Button>
      </div>

      {preview.isError && <FormError error={preview.error} />}

      {preview.error === null && code.length === 0 && (
        <p className="text-ink-500 text-xs">
          اگر کد تخفیفی دارید اینجا وارد کنید.
        </p>
      )}
    </div>
  )
}
