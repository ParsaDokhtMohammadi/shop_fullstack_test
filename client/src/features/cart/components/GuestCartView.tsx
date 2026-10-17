import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Trash2 } from 'lucide-react'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import { fetchProduct } from '@/features/catalog/api'
import { ProductImage } from '@/components/ui/ProductImage'
import { Price } from '@/components/ui/Price'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Alert, LoadingState } from '@/components/ui/states'
import { formatPrice } from '@/lib/format'
import type { ProductVarient } from '@/types'
import { useGuestCart } from '../guest-cart-context'
import type { GuestCartLine } from '../guest-cart'

/**
 * The basket for a visitor with no session.
 *
 * Nothing about these lines is cached locally except the variant id, the
 * quantity and the product slug — so the names, prices, images and stock here
 * are fetched live, one request per distinct product, through the same public
 * `GET /api/products/:slug` the product page uses. A basket left for a week
 * therefore shows today's prices, and a product that has since been
 * unpublished 404s and its line is marked unavailable rather than being
 * priced from a stale snapshot.
 *
 * `useQueries` is what makes that one hook for a list of unknown length: a
 * `useQuery` per line is impossible, since hooks cannot be called in a loop.
 */
export const GuestCartView = () => {
  const guestCart = useGuestCart()

  // Distinct slugs, so two variants of the same product are one request.
  const slugs = [...new Set(guestCart.lines.map((line) => line.slug))]

  const products = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: queryKeys.products.detail(slug),
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchProduct(slug, signal),
      staleTime: STALE_TIME.catalog,
      // A 404 here is a real answer — the product is gone — so there is
      // nothing to retry.
      retry: false,
    })),
  })

  const isLoading = products.some((query) => query.isPending)

  // Resolve each stored line against what the API says right now.
  const resolved = guestCart.lines.map((line) => {
    const index = slugs.indexOf(line.slug)
    const query = products[index]
    const product = query?.data

    const varient: ProductVarient | undefined = product?.varients.find(
      (candidate) => candidate.id === line.productVarientId,
    )

    return {
      line,
      product,
      varient,
      // Unavailable covers all of: the product was unpublished or deleted, the
      // variant was discontinued (the public detail route returns active
      // variants only, so it simply will not be in the list), or stock has
      // fallen below the wanted quantity.
      isAvailable: Boolean(product && varient && varient.stock >= line.quantity),
    }
  })

  const payable = resolved.filter((entry) => entry.isAvailable)
  const subtotal = payable.reduce(
    (sum, entry) => sum + Number(entry.varient?.finalPrice ?? 0) * entry.line.quantity,
    0,
  )
  const itemsCount = payable.reduce((sum, entry) => sum + entry.line.quantity, 0)
  const unavailableCount = resolved.length - payable.length

  if (isLoading) return <LoadingState label="در حال قیمت‌گذاری سبد…" />

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="flex flex-col gap-3">
        <Alert tone="info">
          برای ثبت سفارش باید وارد حساب خود شوید. سبد خرید شما پس از ورود حفظ
          می‌شود.
        </Alert>

        {unavailableCount > 0 && (
          <Alert tone="warn">
            {unavailableCount} کالا در سبد شما دیگر موجود نیست و در مجموع
            محاسبه نشده است.
          </Alert>
        )}

        <ul className="flex flex-col gap-3">
          {resolved.map((entry) => (
            <GuestCartRow
              key={entry.line.productVarientId}
              line={entry.line}
              name={entry.product?.name ?? null}
              coverImage={entry.product?.images[0]?.url ?? null}
              varient={entry.varient}
              isAvailable={entry.isAvailable}
              onQuantityChange={(next) =>
                guestCart.setQuantity(entry.line.productVarientId, next)
              }
              onRemove={() => guestCart.remove(entry.line.productVarientId)}
            />
          ))}
        </ul>
      </div>

      <aside className="border-ink-200 rounded-card border bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-base font-bold">خلاصه سبد</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-600">تعداد کالا</dt>
            <dd className="font-medium tabular-nums">{itemsCount}</dd>
          </div>
          <div className="border-ink-100 flex items-center justify-between border-t pt-3">
            <dt className="text-ink-600">جمع کل</dt>
            <dd>
              <Price amount={String(subtotal)} />
            </dd>
          </div>
        </dl>

        <p className="text-ink-500 mt-3 text-xs leading-6">
          هزینه ارسال در مرحله ثبت سفارش و بر اساس آدرس شما محاسبه می‌شود.
        </p>

        <Link
          to="/login?next=%2Fcart"
          className="bg-brand-600 hover:bg-brand-700 mt-5 flex h-12 w-full items-center justify-center rounded-control font-medium text-white transition-colors"
        >
          ورود و ادامه خرید
        </Link>
      </aside>
    </div>
  )
}

const GuestCartRow = ({
  line,
  name,
  coverImage,
  varient,
  isAvailable,
  onQuantityChange,
  onRemove,
}: {
  line: GuestCartLine
  name: string | null
  coverImage: string | null
  varient: ProductVarient | undefined
  isAvailable: boolean
  onQuantityChange: (next: number) => void
  onRemove: () => void
}) => (
  <li
    className={`border-ink-200 flex gap-4 rounded-card border bg-white p-4 ${
      isAvailable ? '' : 'opacity-70'
    }`}
  >
    <Link to={`/product/${line.slug}`} className="w-24 shrink-0 sm:w-28">
      <ProductImage
        src={coverImage}
        alt={name ?? 'کالا'}
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
            {name ?? 'این کالا دیگر در دسترس نیست'}
          </Link>
          <VarientLabel varient={varient} />
        </div>

        <button
          type="button"
          onClick={onRemove}
          aria-label="حذف از سبد"
          className="text-ink-400 hover:bg-sale-50 hover:text-sale-600 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-control transition-colors"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      {isAvailable && varient ? (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            value={line.quantity}
            onChange={onQuantityChange}
            max={varient.stock}
            size="sm"
          />
          <span className="text-sm font-semibold">
            {formatPrice(String(Number(varient.finalPrice) * line.quantity))}
          </span>
        </div>
      ) : (
        <p className="text-sale-700 mt-auto text-xs font-medium">
          {varient ? 'موجودی کافی نیست' : 'این کالا موجود نیست'}
        </p>
      )}
    </div>
  </li>
)

const VarientLabel = ({ varient }: { varient: ProductVarient | undefined }) => {
  if (!varient) return null
  const parts = [varient.color, varient.size].filter(Boolean)
  if (parts.length === 0) return null

  return <p className="text-ink-500 mt-1 text-xs">{parts.join(' / ')}</p>
}
