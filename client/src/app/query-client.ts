import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/errors'

/**
 * How long data is considered fresh before React Query will refetch it on the
 * next mount or window focus. Named rather than written inline so the choice
 * per domain is visible in one place.
 *
 * The reasoning: the catalogue changes when an admin edits it, which is rarely,
 * so a minute of staleness is fine and saves a request on every navigation.
 * The cart and the session change because of something the user just did, so
 * they are always refetched — and they are invalidated explicitly by the
 * mutations that change them anyway.
 */
export const STALE_TIME = {
  /** Shop name, logo, shipping rule. Effectively static during a visit. */
  settings: 30 * 60 * 1000,
  /** The category tree. Changes only when an admin edits it. */
  categories: 15 * 60 * 1000,
  /** Product lists and detail pages. */
  catalog: 60 * 1000,
  /** Banners. */
  banners: 10 * 60 * 1000,
  /** Cart, orders, addresses, session: always revalidate. */
  live: 0,
} as const

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.catalog,

      /**
       * Retrying a 4xx is pointless and sometimes harmful: a 400 will fail
       * again with the same body, a 401 means the session is gone, a 404 on an
       * admin route means the user is not an admin, and a 429 is the backend
       * asking us to stop — retrying it makes the rate limit worse. So only
       * network failures and 5xx get a second chance.
       */
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          if (error.isNetworkError) return failureCount < 2
          if (error.status >= 400 && error.status < 500) return false
        }

        return failureCount < 2
      },

      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),

      /**
       * Off because this app's data is not a live feed: refetching the whole
       * catalogue every time the user alt-tabs back is traffic for nothing.
       * The places that genuinely need fresh data (cart, session, an order
       * awaiting payment) ask for it explicitly.
       */
      refetchOnWindowFocus: false,
    },
    mutations: {
      /**
       * Never retry a mutation automatically. `POST /orders` and
       * `POST /payments/initiate` are not safe to repeat blindly — the backend
       * protects itself against double-submits, but a silent retry would also
       * hide a real failure from the user, who should see it and decide.
       */
      retry: false,
    },
  },
})
