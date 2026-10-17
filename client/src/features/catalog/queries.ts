import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/api/query-keys'
import { STALE_TIME } from '@/app/query-client'
import type { BannerPosition, ProductListParams } from '@/types'
import {
  fetchBanners,
  fetchCategory,
  fetchCategoryTree,
  fetchProduct,
  fetchProducts,
} from './api'

/** The category tree, for the header navigation and the listing sidebar. */
export const useCategoryTree = () =>
  useQuery({
    queryKey: queryKeys.categories.tree,
    queryFn: ({ signal }) => fetchCategoryTree(signal),
    staleTime: STALE_TIME.categories,
  })

/** One category by slug. */
export const useCategory = (slug: string | undefined) =>
  useQuery({
    queryKey: queryKeys.categories.detail(slug ?? ''),
    queryFn: ({ signal }) => fetchCategory(slug as string, signal),
    // Without this the query would run with an empty slug while the route
    // param is still being read, and 404.
    enabled: Boolean(slug),
    staleTime: STALE_TIME.categories,
  })

/**
 * A page of products.
 *
 * `placeholderData: keepPreviousData` is what makes pagination and filtering
 * feel right: the previous page stays on screen while the next one loads, so
 * the grid does not collapse to a spinner and the page does not jump. The
 * component reads `isPlaceholderData` to dim the grid and disable the
 * pagination buttons while that is happening.
 *
 * The signal comes from React Query and is passed through to axios, so typing
 * in the search box cancels the request for the previous keystroke instead of
 * leaving a queue of them to resolve out of order.
 */
export const useProducts = (params: ProductListParams) =>
  useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: ({ signal }) => fetchProducts(params, signal),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME.catalog,
  })

/** One product by slug, for the detail page. */
export const useProduct = (slug: string | undefined) =>
  useQuery({
    queryKey: queryKeys.products.detail(slug ?? ''),
    queryFn: ({ signal }) => fetchProduct(slug as string, signal),
    enabled: Boolean(slug),
    staleTime: STALE_TIME.catalog,
  })

/** Active banners, optionally for one slot only. */
export const useBanners = (position?: BannerPosition) =>
  useQuery({
    queryKey: queryKeys.banners.list(position),
    queryFn: ({ signal }) => fetchBanners(position, signal),
    staleTime: STALE_TIME.banners,
  })
