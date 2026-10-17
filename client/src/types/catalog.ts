import type { BannerPosition, Money } from './common'

/**
 * The catalogue: categories, products, variants, images, banners and the shop
 * settings row. Types follow the backend entities and the exact projections
 * its services return — the public list and the public detail of a product are
 * genuinely different shapes, so they are two types.
 */

/** A node of `GET /api/categories`. Nesting is at most two levels deep. */
export interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  sortOrder: number
  isActive: boolean
  /** Always present on the tree endpoint; a leaf has an empty array. */
  children: Category[]
}

export interface ProductImage {
  id: string
  productId: string
  url: string
  sortOrder: number
}

/**
 * A buyable variant. **Price and stock live here, never on the product** —
 * a product with no options still has exactly one variant, with `color` and
 * `size` null.
 */
export interface ProductVarient {
  id: string
  productId: string
  color: string | null
  /** A hex swatch for the colour picker. Null whenever `color` is null. */
  colorCode: string | null
  size: string | null
  /** The list price. */
  price: Money
  /** A whole-number percentage as a string, e.g. "15". "0" means no discount. */
  discountPercent: string
  stock: number
  isActive: boolean
  /**
   * What this variant actually sells for, computed by the backend so the
   * frontend never recalculates a discount. Present on the product detail
   * response only.
   */
  finalPrice: Money
}

/**
 * What `GET /api/products` returns per row — a deliberately small "card"
 * shape. The variant list, the gallery and the description are only on the
 * detail endpoint, so a listing page cannot accidentally become heavy.
 */
export interface ProductCard {
  id: string
  name: string
  slug: string
  /** A stored path like `/uploads/x.webp`, or null when the product has no image. */
  coverImage: string | null
  /** The lowest `finalPrice` across the active variants — the "from" price. */
  priceFrom: Money
  inStock: boolean
}

/** `GET /api/products/:slug`. Active variants only, images cover-first. */
export interface ProductDetail {
  id: string
  name: string
  slug: string
  /** Long description. Plain text, nullable. */
  content: string | null
  categoryId: string | null
  category: Omit<Category, 'children'> | null
  isActive: boolean
  varients: ProductVarient[]
  images: ProductImage[]
  createdAt: string
  updatedAt: string
}

/** Sort options the API actually accepts. There is no sort by price. */
export const ProductSort = {
  Newest: 'newest',
  Oldest: 'oldest',
  Name: 'name',
} as const
export type ProductSort = (typeof ProductSort)[keyof typeof ProductSort]

/** Query parameters for `GET /api/products`. */
export interface ProductListParams {
  page?: number
  limit?: number
  /** Matches anywhere in the product name. */
  search?: string
  /** A root category also returns the products of its subcategories. */
  categoryId?: string
  sort?: ProductSort
}

/** A banner from the public endpoint — a trimmed projection of the entity. */
export interface Banner {
  id: string
  imageUrl: string
  linkUrl: string | null
  title: string | null
  position: BannerPosition
}

/**
 * `GET /api/settings`. A deliberate subset of the settings row: the low-stock
 * threshold is admin-only. Always returns a row, even before an admin has
 * saved anything.
 */
export interface PublicSettings {
  name: string
  logoUrl: string | null
  supportNumber: string | null
  supportEmail: string | null
  address: string | null
  /** Network name to absolute URL, e.g. `{ instagram: "https://..." }`. */
  socials: Record<string, string>
  shippingCost: Money
  /** Null means there is no free-shipping rule. */
  freeShippingThreshold: Money | null
  /** When false, the banners endpoint returns nothing at all. */
  bannerToggle: boolean
}
