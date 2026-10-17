import { Link } from 'react-router'
import { ProductImage } from '@/components/ui/ProductImage'
import { PriceFrom } from '@/components/ui/Price'
import { Skeleton } from '@/components/ui/states'
import { cn } from '@/lib/cn'
import type { ProductCard as ProductCardData } from '@/types'

/**
 * A product in a grid.
 *
 * The whole card is one link rather than a card with a separate button,
 * because the API's list response has nothing a card could act on: it carries
 * no variant ids, so "add to basket" is impossible from here. A customer has
 * to pick a colour and size on the detail page first. Putting a dead
 * "add to basket" button here would be exactly the fake interaction to avoid.
 */
export const ProductCard = ({
  product,
  /** True for the first row, which should not be lazy-loaded. */
  priority = false,
}: {
  product: ProductCardData
  priority?: boolean
}) => (
  <Link
    to={`/product/${product.slug}`}
    className={cn(
      'group border-ink-200 relative flex flex-col overflow-hidden rounded-card border bg-white',
      'shadow-card transition-[box-shadow,border-color,transform] duration-200',
      'hover:border-ink-300 hover:shadow-card-hover hover:-translate-y-0.5',
    )}
  >
    <div className="relative">
      <ProductImage
        src={product.coverImage}
        alt={product.name}
        priority={priority}
        sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
        className="transition-transform duration-300 group-hover:scale-[1.03]"
      />

      {/* Out of stock is the one state worth shouting about on a card: it
          saves the customer a click. `inStock` is computed by the backend
          across the product's variants. */}
      {!product.inStock && (
        <div className="bg-ink-950/55 absolute inset-0 flex items-center justify-center">
          <span className="rounded-pill bg-white/95 px-3 py-1.5 text-xs font-semibold text-ink-800">
            ناموجود
          </span>
        </div>
      )}
    </div>

    <div className="flex flex-1 flex-col gap-3 p-3.5">
      {/* Fixed to two lines so every card in a row is the same height however
          long the name is — the alternative is a ragged grid. */}
      <h3 className="line-clamp-2-fixed min-h-[3rem] text-sm leading-6 font-medium">
        {product.name}
      </h3>

      {/* mt-auto pins the price to the bottom of the card regardless of how
          many lines the name took. */}
      <div className="mt-auto">
        {product.inStock ? (
          <PriceFrom amount={product.priceFrom} />
        ) : (
          <span className="text-ink-400 text-sm">فعلاً موجود نیست</span>
        )}
      </div>
    </div>
  </Link>
)

/** The card's loading shape, so the grid does not reflow when data arrives. */
export const ProductCardSkeleton = () => (
  <div className="border-ink-200 overflow-hidden rounded-card border bg-white">
    <Skeleton className="aspect-square rounded-none" />
    <div className="space-y-3 p-3.5">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  </div>
)

/**
 * The product grid. Column counts are defined once here so every listing —
 * homepage, category page, search results — lines up identically.
 */
export const ProductGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
    {children}
  </div>
)

/** A full grid of skeletons, for the first load of a listing. */
export const ProductGridSkeleton = ({ count = 10 }: { count?: number }) => (
  <ProductGrid>
    {Array.from({ length: count }, (_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </ProductGrid>
)
