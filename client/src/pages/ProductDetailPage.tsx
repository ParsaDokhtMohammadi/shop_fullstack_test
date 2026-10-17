import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Check, ChevronLeft, ShoppingCart, Truck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Surface'
import { DiscountedPrice } from '@/components/ui/Price'
import { ProductImage } from '@/components/ui/ProductImage'
import { QuantityStepper } from '@/components/ui/QuantityStepper'
import { Alert, ErrorState, FormError, LoadingState, Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { assetUrl } from '@/lib/env'
import { formatNumber, formatPrice } from '@/lib/format'
import { useProduct } from '@/features/catalog/queries'
import { useSettings } from '@/features/settings/queries'
import { useSession } from '@/features/auth/queries'
import { useAddToCart } from '@/features/cart/queries'
import { useGuestCart } from '@/features/cart/guest-cart-context'
import {
  ColourPicker,
  SizePicker,
} from '@/features/catalog/components/VarientPicker'
import {
  colourOptions,
  findVarient,
  isSingleVarient,
  sizeOptions,
} from '@/features/catalog/varient-options'
import type { ProductDetail } from '@/types'

/** `/product/:slug` — the full product page. */
export const ProductDetailPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const product = useProduct(slug)

  if (product.isPending) return <DetailSkeleton />

  if (product.isError)
    return (
      <div className="page-container py-10">
        <ErrorState
          error={product.error}
          title="این محصول پیدا نشد"
          onRetry={() => void product.refetch()}
        />
        <div className="text-center">
          <Link
            to="/products"
            className="text-brand-700 hover:text-brand-800 inline-flex items-center gap-1 text-sm font-medium"
          >
            مشاهده همه محصولات
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    )

  // Keyed by id so switching to another product resets the gallery and the
  // variant selection instead of carrying the previous product's state over.
  return <ProductView key={product.data.id} product={product.data} />
}

const ProductView = ({ product }: { product: ProductDetail }) => {
  const { data: settings } = useSettings()
  const { isLoggedIn } = useSession()
  const addToCart = useAddToCart()
  const guestCart = useGuestCart()

  const [imageIndex, setImageIndex] = useState(0)
  const [justAdded, setJustAdded] = useState(false)

  const single = isSingleVarient(product.varients)
  const colours = useMemo(() => colourOptions(product.varients), [product.varients])
  const hasColours = colours.length > 0

  /**
   * Colour, size and quantity are held as *preferences* and the effective
   * values are derived below.
   *
   * The reason: changing colour can invalidate the chosen size — a product may
   * have blue in 42 but not in 40 — and changing variant can invalidate the
   * quantity, because stock differs per variant. Correcting those with effects
   * means an extra render each time and a frame where the buy button is
   * pointing at a variant that does not exist. Deriving them means the UI is
   * never in that intermediate state, and a preference that becomes valid
   * again (switching back to blue) is honoured rather than lost.
   */
  const [preferredColour, setPreferredColour] = useState<string | null>(null)
  const [preferredSize, setPreferredSize] = useState<string | null>(null)
  const [preferredQuantity, setPreferredQuantity] = useState(1)

  // The colour: the customer's pick, else the first one with stock in any size.
  const colour = useMemo(() => {
    if (!hasColours) return null
    if (preferredColour && colours.some((option) => option.color === preferredColour))
      return preferredColour

    const inStock = product.varients.find(
      (varient) => varient.color !== null && varient.stock > 0,
    )

    return inStock?.color ?? colours[0]?.color ?? null
  }, [hasColours, preferredColour, colours, product.varients])

  const sizes = useMemo(
    () => sizeOptions(product.varients, hasColours ? colour : null),
    [product.varients, colour, hasColours],
  )
  const hasSizes = sizes.length > 0

  // The size: the pick if it exists in this colour, else the first with stock.
  const size = useMemo(() => {
    if (!hasSizes) return null
    if (preferredSize && sizes.includes(preferredSize)) return preferredSize

    const firstInStock = sizes.find(
      (candidate) => (findVarient(product.varients, colour, candidate)?.stock ?? 0) > 0,
    )

    return firstInStock ?? sizes[0] ?? null
  }, [hasSizes, preferredSize, sizes, product.varients, colour])

  const selected = single
    ? (product.varients[0] ?? null)
    : findVarient(product.varients, hasColours ? colour : null, hasSizes ? size : null)

  const stock = selected?.stock ?? 0
  const isBuyable = selected !== null && stock > 0

  // Clamped to this variant's stock, so switching to a variant with less of it
  // cannot leave an over-large quantity on screen.
  const quantity = Math.min(Math.max(1, preferredQuantity), Math.max(1, stock))

  const images = product.images
  const activeImage = images[imageIndex] ?? images[0]

  const onAdd = async () => {
    if (!selected) return

    if (isLoggedIn) {
      await addToCart.mutateAsync({
        productVarientId: selected.id,
        quantity,
      })
    } else {
      // No session, so there is no server cart to add to. The basket is held
      // locally and folded in by POST /api/cart/merge after login.
      guestCart.add(selected.id, product.slug, quantity)
    }

    setJustAdded(true)
    window.setTimeout(() => setJustAdded(false), 2500)
  }

  return (
    <div className="page-container py-6 sm:py-8">
      <Breadcrumb product={product} />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Gallery */}
        <div>
          <div className="border-ink-200 overflow-hidden rounded-card border bg-white">
            <ProductImage
              src={activeImage?.url ?? null}
              alt={product.name}
              ratio="aspect-square"
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
            />
          </div>

          {images.length > 1 && (
            <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <li key={image.id}>
                  <button
                    type="button"
                    onClick={() => setImageIndex(index)}
                    aria-label={`تصویر ${formatNumber(index + 1)}`}
                    aria-current={index === imageIndex ? 'true' : undefined}
                    className={cn(
                      'block size-18 shrink-0 cursor-pointer overflow-hidden rounded-control border-2 transition-colors',
                      index === imageIndex
                        ? 'border-brand-600'
                        : 'border-ink-200 hover:border-ink-400',
                    )}
                  >
                    <img
                      src={assetUrl(image.url) ?? undefined}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Buying panel */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl lg:text-3xl">{product.name}</h1>
            {product.category && (
              <Link
                to={`/category/${product.category.slug}`}
                className="text-brand-700 hover:text-brand-800 mt-2 inline-block text-sm"
              >
                {product.category.name}
              </Link>
            )}
          </div>

          {!single && (
            <div className="flex flex-col gap-5">
              {hasColours && (
                <ColourPicker
                  options={colours}
                  selected={colour}
                  onSelect={setPreferredColour}
                  varients={product.varients}
                />
              )}
              {hasSizes && (
                <SizePicker
                  sizes={sizes}
                  selected={size}
                  onSelect={setPreferredSize}
                  varients={product.varients}
                  colour={hasColours ? colour : null}
                />
              )}
            </div>
          )}

          <Card className="flex flex-col gap-5">
            {selected ? (
              <DiscountedPrice
                price={selected.price}
                finalPrice={selected.finalPrice}
                size="lg"
              />
            ) : (
              <p className="text-ink-500 text-sm">
                این ترکیب رنگ و اندازه موجود نیست.
              </p>
            )}

            <StockNote stock={stock} isBuyable={isBuyable} hasVarient={selected !== null} />

            {isBuyable && (
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-ink-700 text-sm">تعداد:</span>
                <QuantityStepper value={quantity} onChange={setPreferredQuantity} max={stock} />
              </div>
            )}

            <FormError error={addToCart.error} />

            {justAdded && (
              <Alert tone="success">
                <span className="inline-flex items-center gap-2">
                  <Check className="size-4" aria-hidden="true" />
                  به سبد خرید اضافه شد.{' '}
                  <Link to="/cart" className="font-medium underline">
                    مشاهده سبد
                  </Link>
                </span>
              </Alert>
            )}

            <Button
              size="lg"
              fullWidth
              onClick={() => void onAdd()}
              disabled={!isBuyable}
              isLoading={addToCart.isPending}
              loadingText="در حال افزودن…"
              icon={<ShoppingCart className="size-5" aria-hidden="true" />}
            >
              {isBuyable ? 'افزودن به سبد خرید' : 'ناموجود'}
            </Button>

            {settings?.freeShippingThreshold && (
              <p className="text-ink-600 flex items-start gap-2 text-sm leading-6">
                <Truck className="text-brand-600 mt-1 size-4 shrink-0" aria-hidden="true" />
                ارسال سفارش‌های بالای {formatPrice(settings.freeShippingThreshold)} رایگان
                است.
              </p>
            )}
          </Card>
        </div>
      </div>

      {product.content && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-bold">معرفی محصول</h2>
          <Card>
            {/* The API stores plain text, so it is rendered as text with
                newlines preserved — never as HTML, which would be an
                injection route from the admin panel into every visitor's
                browser. */}
            <p className="text-ink-700 leading-8 whitespace-pre-line">
              {product.content}
            </p>
          </Card>
        </section>
      )}
    </div>
  )
}

const StockNote = ({
  stock,
  isBuyable,
  hasVarient,
}: {
  stock: number
  isBuyable: boolean
  hasVarient: boolean
}) => {
  if (!hasVarient) return null

  if (!isBuyable)
    return <p className="text-sale-700 text-sm font-medium">این گزینه موجود نیست.</p>

  // Only called out when it is genuinely low, so the message means something.
  if (stock <= 5)
    return (
      <p className="text-warn-700 text-sm font-medium">
        تنها {formatNumber(stock)} عدد در انبار باقی مانده است.
      </p>
    )

  return (
    <p className="text-success-700 inline-flex items-center gap-1.5 text-sm font-medium">
      <Check className="size-4" aria-hidden="true" />
      موجود در انبار
    </p>
  )
}

const Breadcrumb = ({ product }: { product: ProductDetail }) => (
  <nav aria-label="مسیر صفحه" className="text-ink-500 mb-5 text-sm">
    <ol className="flex flex-wrap items-center gap-1.5">
      <li>
        <Link to="/" className="hover:text-brand-700 transition-colors">
          خانه
        </Link>
      </li>
      <li aria-hidden="true">/</li>
      <li>
        <Link to="/products" className="hover:text-brand-700 transition-colors">
          محصولات
        </Link>
      </li>
      {product.category && (
        <>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              to={`/category/${product.category.slug}`}
              className="hover:text-brand-700 transition-colors"
            >
              {product.category.name}
            </Link>
          </li>
        </>
      )}
      <li aria-hidden="true">/</li>
      <li className="text-ink-800 font-medium" aria-current="page">
        {product.name}
      </li>
    </ol>
  </nav>
)

const DetailSkeleton = () => (
  <div className="page-container py-8">
    <Skeleton className="mb-5 h-4 w-64" />
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <Skeleton className="aspect-square rounded-card" />
      <div className="space-y-5">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full rounded-card" />
        <Skeleton className="h-44 w-full rounded-card" />
      </div>
    </div>
    <LoadingState label="در حال بارگذاری محصول…" />
  </div>
)
