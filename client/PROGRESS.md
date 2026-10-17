# Progress

Tracks what is built, what is verified, and what is left. Updated as work
lands, so a later session does not have to re-derive the state.

## Stage 1 — Discovery ✅

Backend inventoried from the controllers, DTOs, entities and services. The
route inventory, response-shape quirks and deployment constraints are written
up in the repository-root [CLAUDE.md](../CLAUDE.md).

## Stage 2 — Foundation ✅

- [x] React 19 + Vite 8 + TypeScript 6, `strict` **on** (the template shipped
      without it), plus `noUncheckedIndexedAccess`.
- [x] Tailwind CSS v4 via `@tailwindcss/vite`, design tokens in
      `src/styles/index.css` (`@theme`): brand teal, warm `ink` neutrals, rose
      for sale pricing, one radius scale, soft shadows.
- [x] Persian RTL document shell — `<html lang="fa" dir="rtl">`, self-hosted
      Vazirmatn variable font (one 111 kB woff2, fingerprinted by Vite).
- [x] React Router v7 in data mode, nested under one layout, with a
      route-level `ErrorBoundary` and `ScrollRestoration`.
- [x] React Query v5: one `QueryClient` with per-domain stale times, a retry
      policy that skips 4xx, and a central query-key registry.
- [x] Axios client reading `VITE_API_BASE_URL`, `withCredentials: true` for the
      httpOnly session cookie, and one normalised `ApiError`.
- [x] Dev proxy for `/api` and `/uploads`, so development is same-origin like
      production behind nginx.
- [x] Shared UI: Button, Input/Textarea/Select, Badge, Card, Price,
      ProductImage, QuantityStepper, Pagination, and the loading / empty /
      error / alert states.

## Stage 3 — Customer storefront ✅

| Route | Endpoints used |
| --- | --- |
| `/` | `GET /settings`, `/banners`, `/categories`, `/products` |
| `/products` | `GET /products` (search, sort, pagination) |
| `/category/:slug` | `GET /categories/:slug` → `GET /products?categoryId=` |
| `/product/:slug` | `GET /products/:slug` |
| `/login` | `POST /auth/otp/request`, `/auth/otp/verify`, `POST /cart/merge` |
| `/cart` | `GET /cart`, `POST/PATCH/DELETE /cart/items`, `DELETE /cart` |
| `/checkout` | `GET /addresses`, `POST /addresses`, `POST /cart/discount/preview`, `POST /orders`, `POST /payments/initiate` |
| `/orders` | `GET /orders` |
| `/orders/:id` | `GET /orders/:id`, `POST /payments/initiate` |
| `/account` | `GET/PATCH /me/profile`, all five `/addresses` routes, `GET /payments` |
| `/payment/result` | none — reads the gateway's redirect query, then links to the order |

## Stage 4 — Verification

Verified on this machine:

- [x] `pnpm build` passes (`tsc -b` + `vite build`), no chunk-size warning.
- [x] `npx tsc -b` clean under `strict`.
- [x] `pnpm lint` clean, including the `react-hooks` compiler rules — the
      effects that set state were reworked into derived state rather than
      suppressed.
- [x] Dev server boots; `/api` and `/uploads` proxy; Tailwind emits the custom
      utilities; the Vazirmatn `@font-face` is in the generated CSS.
- [x] Production build serves deep routes (`/orders/123` → 200 with the app
      shell), which is the SPA fallback nginx has to reproduce.
- [x] A 5xx from a proxy no longer leaks its own error text into the UI —
      found by stopping the backend and watching a real 502 come back.

**Not yet verified — needs a running backend.** PostgreSQL is up on this
machine but `server/.env` does not exist and the database password is unknown,
so nothing below has been exercised against real data:

- [ ] Every request's method, URL, payload and response parsing.
- [ ] The OTP login round trip and the cookie being set and sent.
- [ ] Guest-cart merge on login.
- [ ] Order placement and the mock payment gateway redirect.
- [ ] Image URLs resolving against `/uploads`.
- [ ] Jalali dates and Persian number rendering with real timestamps.

## Stage 5 — Deployment

- [ ] `DEPLOYMENT.md` for the Ubuntu VM: nginx config, SPA fallback, API
      reverse proxy, systemd unit for NestJS, VMware networking, HTTPS later.

## Still to build

- [ ] Admin panel. The backend exposes a full admin surface (dashboard,
      products with variants/images/inventory, categories, banners, discounts,
      orders, customers, payments, settings) and none of it has a frontend
      yet. The account menu deliberately has no admin link until it does.

## Backend limitations deliberately not worked around

No wishlist, reviews, customer-side order cancellation, phone-number change,
password login, guest checkout, or product sorting by price — none exists in
the API. See the root CLAUDE.md for the full list.
