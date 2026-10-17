import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { LoadingState, ErrorState } from '@/components/ui/states'
import { useCategory } from '@/features/catalog/queries'
import { ProductListing } from '@/features/catalog/components/ProductListing'

/**
 * `/category/:slug`.
 *
 * Two requests rather than one, and necessarily so: the URL carries a slug
 * because that is what is readable and shareable, but `GET /api/products`
 * filters by `categoryId`. So the category is resolved by slug first, then its
 * id is handed to the listing. A deactivated category 404s on the first
 * request, which is the correct outcome — its products are hidden too.
 *
 * Asking for a root category also returns the products of its subcategories,
 * which the backend handles; the frontend does not have to walk the tree.
 */
export const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>()
  const category = useCategory(slug)

  if (category.isPending)
    return (
      <div className="page-container">
        <LoadingState label="در حال بارگذاری دسته‌بندی…" />
      </div>
    )

  if (category.isError)
    return (
      <div className="page-container py-10">
        <ErrorState
          error={category.error}
          title="این دسته‌بندی پیدا نشد"
          onRetry={() => void category.refetch()}
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

  return (
    <>
      {/* Subcategory chips, when the category has children. These are real
          navigation into narrower listings, not decoration. */}
      {category.data.children.length > 0 && (
        <div className="border-ink-200 border-b bg-white">
          <div className="page-container py-4">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto">
              {category.data.children.map((child) => (
                <li key={child.id}>
                  <Link
                    to={`/category/${child.slug}`}
                    className="border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 inline-flex rounded-pill border px-4 py-2 text-sm whitespace-nowrap transition-colors"
                  >
                    {child.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ProductListing
        categoryId={category.data.id}
        title={category.data.name}
        description={
          category.data.children.length > 0
            ? 'شامل محصولات زیردسته‌های این دسته‌بندی'
            : undefined
        }
      />
    </>
  )
}
