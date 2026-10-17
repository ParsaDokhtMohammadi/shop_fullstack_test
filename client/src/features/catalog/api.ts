import { http } from '@/api/client'
import type {
  ApiMessage,
  Banner,
  BannerPosition,
  Category,
  PaginatedResponse,
  PayloadResponse,
  ProductCard,
  ProductDetail,
  ProductListParams,
} from '@/types'

/* -------------------------------------------------------------------------- */
/*  Categories                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `GET /api/categories` — the active category tree, children nested under
 * `children`. Nesting is at most two levels deep by design.
 *
 * Note the response key: this endpoint answers `{ message, categories }`, not
 * `{ payload }`. The envelope varies per endpoint in this API, so each function
 * unwraps the key its own endpoint actually returns.
 */
export const fetchCategoryTree = async (signal?: AbortSignal): Promise<Category[]> => {
  const response = await http.get<ApiMessage & { categories: Category[] }>(
    '/categories',
    { signal },
  )

  return response.categories
}

/** `GET /api/categories/:slug` — the category plus its active subcategories. */
export const fetchCategory = async (
  slug: string,
  signal?: AbortSignal,
): Promise<Category> => {
  const response = await http.get<ApiMessage & { category: Category }>(
    `/categories/${encodeURIComponent(slug)}`,
    { signal },
  )

  return response.category
}

/* -------------------------------------------------------------------------- */
/*  Products                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * `GET /api/products` — the public, paginated listing. Returns the small card
 * shape; the variant list and gallery are on the detail endpoint only.
 *
 * Only active products with at least one active variant appear, and a
 * deactivated category hides its products, so an empty result is a legitimate
 * state rather than an error.
 */
export const fetchProducts = (
  params: ProductListParams,
  signal?: AbortSignal,
): Promise<PaginatedResponse<ProductCard>> =>
  http.get<PaginatedResponse<ProductCard>>('/products', { params, signal })

/**
 * `GET /api/products/:slug` — full detail. Note the lookup is by **slug**, not
 * by id; the id-based route is admin-only.
 */
export const fetchProduct = async (
  slug: string,
  signal?: AbortSignal,
): Promise<ProductDetail> => {
  const response = await http.get<ApiMessage & { product: ProductDetail }>(
    `/products/${encodeURIComponent(slug)}`,
    { signal },
  )

  return response.product
}

/* -------------------------------------------------------------------------- */
/*  Banners                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `GET /api/banners` — active banners in display order. Comes back empty when
 * `bannerToggle` is off in the shop settings, which is a normal state: the
 * homepage then simply renders without them.
 */
export const fetchBanners = async (
  position?: BannerPosition,
  signal?: AbortSignal,
): Promise<Banner[]> => {
  const response = await http.get<PayloadResponse<Banner[]>>('/banners', {
    params: position ? { position } : undefined,
    signal,
  })

  return response.payload
}
