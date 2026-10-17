import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { RequireAuth } from './RequireAuth'
import { HomePage } from '@/pages/HomePage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CategoryPage } from '@/pages/CategoryPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { CartPage } from '@/pages/CartPage'
import { NotFoundPage, RouteError } from '@/pages/NotFoundPage'

/**
 * The route table.
 *
 * Data mode (`createBrowserRouter`) rather than `<BrowserRouter>` with JSX
 * routes, because it is what gives route-level error boundaries and
 * `ScrollRestoration`. No `loader` functions are used: React Query owns data
 * fetching, and mixing the two would mean two caches and two loading stories
 * for the same request.
 *
 * Everything nests under RootLayout, so the header and footer mount once.
 * `ErrorBoundary` is on that layout, which means a thrown error still renders
 * inside the chrome — the customer keeps their navigation and can get out.
 *
 * ## What is eager and what is lazy
 *
 * The storefront pages a first-time visitor lands on — home, listings, product
 * detail, basket — are imported directly, so there is no extra round trip on
 * the path that matters most. Everything behind a login, plus the login form
 * itself, is behind `lazy`, which Vite turns into separate chunks fetched on
 * first visit. A customer browsing the catalogue never downloads the checkout
 * or account code at all.
 *
 * That is worth doing here rather than being premature: on a self-hosted VM
 * over a home connection the initial download is the slowest part of the first
 * visit, and these routes are a third of the application.
 *
 * ## Why `/cart` is not guarded
 *
 * A guest has a basket too, held in localStorage, and bouncing them to login
 * from the basket is how you lose the sale. `/checkout` *is* guarded, because
 * placing an order genuinely needs a session.
 */
export const router = createBrowserRouter([
  {
    Component: RootLayout,
    ErrorBoundary: RouteError,
    children: [
      { index: true, Component: HomePage },

      // Public catalogue — eager.
      { path: 'products', Component: ProductsPage },
      { path: 'category/:slug', Component: CategoryPage },
      { path: 'product/:slug', Component: ProductDetailPage },
      { path: 'cart', Component: CartPage },

      {
        path: 'login',
        lazy: {
          Component: async () => (await import('@/pages/LoginPage')).LoginPage,
        },
      },

      /**
       * Where the payment gateway's callback redirects the customer back to —
       * this path must match the backend's `PAYMENT_RESULT_URL`. Public,
       * because the request arrives via the bank and we cannot assume the
       * session survived the round trip.
       */
      {
        path: 'payment/result',
        lazy: {
          Component: async () =>
            (await import('@/pages/PaymentResultPage')).PaymentResultPage,
        },
      },

      // Needs a session. The server enforces this too; the guard is so the
      // customer sees a login form rather than an error page.
      {
        Component: RequireAuth,
        children: [
          {
            path: 'checkout',
            lazy: {
              Component: async () =>
                (await import('@/pages/CheckoutPage')).CheckoutPage,
            },
          },
          {
            path: 'orders',
            lazy: {
              Component: async () => (await import('@/pages/OrdersPage')).OrdersPage,
            },
          },
          {
            path: 'orders/:id',
            lazy: {
              Component: async () =>
                (await import('@/pages/OrderDetailPage')).OrderDetailPage,
            },
          },
          {
            path: 'account',
            lazy: {
              Component: async () =>
                (await import('@/pages/AccountPage')).AccountPage,
            },
          },
        ],
      },

      { path: '*', Component: NotFoundPage },
    ],
  },
])
