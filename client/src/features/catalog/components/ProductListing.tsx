import { useSearchParams } from 'react-router'
import { PackageSearch, SlidersHorizontal } from 'lucide-react'
import { Select } from '@/components/ui/Field'
import { Pagination, ResultCount } from '@/components/ui/Pagination'
import { EmptyState, ErrorState } from '@/components/ui/states'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { ProductSort, type ProductListParams } from '@/types'
import { useProducts } from '../queries'
import { ProductCard, ProductGrid, ProductGridSkeleton } from './ProductCard'

const SORT_LABELS: Record<ProductSort, string> = {
  newest: 'جدیدترین',
  oldest: 'قدیمی‌ترین',
  name: 'بر اساس نام',
}

/**
 * The product listing, shared by the all-products page and every category
 * page.
 *
 * The filter state lives in the URL, not in component state. That is what
 * makes a filtered listing shareable and bookmarkable, lets the back button
 * undo a filter, and survives a reload — all of which component state would
 * lose. React Query then keys its cache off those same values, so going back
 * to a previous filter is instant.
 *
 * Note what is *not* here: there is no price filter, no price sorting and no
 * "in stock only" toggle, because `GET /api/products` accepts only
 * `page`, `limit`, `search`, `categoryId` and `sort=newest|oldest|name`.
 * Offering a control the API cannot honour would mean filtering a single page
 * in the browser and quietly lying about the totals.
 */
export const ProductListing = ({
  /** Fixed for a category page; absent on the all-products page. */
  categoryId,
  /** Shown above the grid. */
  title,
  description,
}: {
  categoryId?: string
  title: string
  description?: string
}) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const search = searchParams.get('search') ?? undefined
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const sort = parseSort(searchParams.get('sort'))

  const params: ProductListParams = {
    page,
    limit: 20,
    sort,
    ...(search ? { search } : {}),
    ...(categoryId ? { categoryId } : {}),
  }

  const query = useProducts(params)

  /**
   * Writes one filter to the URL. `replace: false` keeps each change in
   * history so the back button steps through them, and `page` is reset
   * whenever a filter changes — staying on page 7 of a different filter would
   * usually land on an empty page.
   */
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    setSearchParams(next)
  }

  const clearSearch = () => setParam('search', null)

  return (
    <div className="page-container py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && (
          <p className="text-ink-500 mt-2 text-sm leading-7">{description}</p>
        )}

        {search && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-ink-600 text-sm">نتایج جستجو برای:</span>
            <span className="bg-brand-50 text-brand-800 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-sm font-medium">
              {search}
              <button
                type="button"
                onClick={clearSearch}
                aria-label="حذف عبارت جستجو"
                className="text-brand-600 hover:text-brand-900 cursor-pointer"
              >
                ✕
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="border-ink-200 mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="text-ink-400 size-4" aria-hidden="true" />
          <Select
            aria-label="ترتیب نمایش"
            value={sort}
            onChange={(event) => setParam('sort', event.target.value)}
            className="h-10 w-44"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {query.data && <ResultCount meta={query.data.meta} />}
      </div>

      {query.isPending ? (
        <ProductGridSkeleton count={20} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.items.length === 0 ? (
        <EmptyState
          icon={<PackageSearch className="size-7" aria-hidden="true" />}
          title={search ? 'محصولی با این عبارت پیدا نشد' : 'محصولی برای نمایش نیست'}
          description={
            search
              ? 'عبارت دیگری را امتحان کنید یا همه محصولات را ببینید.'
              : 'در این بخش هنوز محصولی ثبت نشده است.'
          }
          action={
            search ? (
              <Button variant="outline" onClick={clearSearch}>
                نمایش همه محصولات
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* While the next page loads, the previous one stays on screen
              (placeholderData) and is dimmed, rather than the grid collapsing
              to a spinner and the page jumping. */}
          <div
            className={cn(
              'transition-opacity duration-200',
              query.isPlaceholderData && 'pointer-events-none opacity-55',
            )}
          >
            <ProductGrid>
              {query.data.items.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  priority={index < 5}
                />
              ))}
            </ProductGrid>
          </div>

          <Pagination
            meta={query.data.meta}
            isLoading={query.isPlaceholderData}
            onPageChange={(next) => setParam('page', String(next))}
            className="mt-10"
          />
        </>
      )}
    </div>
  )
}

/** Keeps a hand-edited `?sort=cheapest` from reaching the API, which 400s on it. */
const parseSort = (value: string | null): ProductSort => {
  if (value === ProductSort.Oldest || value === ProductSort.Name) return value

  return ProductSort.Newest
}
