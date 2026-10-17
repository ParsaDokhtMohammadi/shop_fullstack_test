import type { ProductListParams } from '@/types'
import type { BannerPosition, OrderStatus, PaginationParams } from '@/types'

/**
 * Every query key in the app, in one place.
 *
 * Why a registry instead of inline arrays: invalidation works on key prefixes,
 * so `invalidateQueries({ queryKey: queryKeys.products.all })` has to match the
 * prefix every product query was registered under. When keys are written inline
 * at each call site, one typo means a mutation silently stops refreshing a list
 * — and nothing fails, the screen just shows stale data. Declaring them here
 * makes the prefix relationship explicit and type-checked.
 *
 * The convention: `all` is the broad prefix for a domain, and the more specific
 * keys extend it, so invalidating `all` catches every list and detail under it.
 */
export const queryKeys = {
  session: ['session'] as const,

  /** The account page's own fetch of `GET /api/me/profile`. */
  profile: ['profile'] as const,

  settings: ['settings'] as const,

  banners: {
    all: ['banners'] as const,
    list: (position?: BannerPosition) => ['banners', { position }] as const,
  },

  categories: {
    all: ['categories'] as const,
    tree: ['categories', 'tree'] as const,
    detail: (slug: string) => ['categories', 'detail', slug] as const,
  },

  products: {
    all: ['products'] as const,
    /**
     * The params object is part of the key, so each filter combination is
     * cached separately and going back to a previous filter is instant.
     */
    list: (params: ProductListParams) => ['products', 'list', params] as const,
    detail: (slug: string) => ['products', 'detail', slug] as const,
  },

  cart: ['cart'] as const,

  addresses: ['addresses'] as const,

  orders: {
    all: ['orders'] as const,
    list: (params: PaginationParams & { status?: OrderStatus }) =>
      ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },

  payments: {
    all: ['payments'] as const,
    list: (params: PaginationParams) => ['payments', 'list', params] as const,
  },
} as const
