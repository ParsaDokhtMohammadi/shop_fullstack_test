# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two independent projects in one folder, with **no root-level package.json, workspace or tooling** — each is installed and run on its own, from its own directory.

- **`server/`** — the NestJS 11 + TypeORM + PostgreSQL shop API. Feature-complete and the **source of truth** for everything the frontend may do. It has its own git repository and its own **`server/CLAUDE.md`**, which governs all backend work — read it before touching anything under `server/`.
- **`client/`** — the storefront. Currently an **untouched `create-vite` React template** (`App.tsx` is still the Vite counter demo). Not a git repository, and neither is the repository root.

The backend is built to be reused unchanged across shop clients, so **the frontend is the part that changes per client**. Do not modify `server/` to make a frontend feature easier; if the API cannot do something, that is a documented limitation, not a backend task.

### `client/` as it stands

React 19 + Vite 8 + TypeScript 6, with the **React Compiler** enabled through a Babel plugin in [client/vite.config.ts](client/vite.config.ts) (so dev and build are slower than a plain Vite app). `pnpm` is the package manager, matching the server.

Two things to know before building on it:

- **`strict` is not set** in [client/tsconfig.app.json](client/tsconfig.app.json) — `noUnusedLocals`/`noUnusedParameters` are on, but the strict family is absent. Turn it on before writing much code, not after.
- [client/index.html](client/index.html) is still `lang="en"` with no `dir`, the title is `client`, and `src/` holds only the template's `App.tsx`/`App.css`/`index.css` plus its demo assets. Nothing in `src/` is worth preserving.

Tailwind, React Router and TanStack Query are **not installed yet**.

### Commands

```bash
# client/
pnpm install
pnpm dev                  # vite dev server, default port 5173
pnpm build                # tsc -b && vite build  -> dist/
pnpm preview              # serve the production build
pnpm lint                 # eslint .

# server/
pnpm install
pnpm start:dev            # watch mode, http://localhost:3000/api
pnpm build && pnpm start:prod
pnpm lint                 # eslint --fix
pnpm test                 # jest — finds no spec files; there are no tests yet

pnpm migration:run        # required on a fresh database
pnpm seed:demo            # settings, banners, discounts, customers, a cart,
                          # and orders in every status — the one to run so
                          # every frontend screen has something to render
pnpm seed:admin           # ADMIN_PHONE_NUMBERS is read by the PromoteAdmins
                          # migration, not at boot
```

Swagger is at **`http://localhost:3000/swagger`** in development. It is **not registered in production at all** (see [server/src/config/swagger.config.ts](server/src/config/swagger.config.ts)), so it is a dev-time tool, never a deployed contract.

## The API contract the frontend has to match

Facts that are spread across guards, filters, utils and a dozen services. Verify against the controller before relying on any of it.

**Prefix and static files.** Every route is under **`/api`**, except `GET /health`, which is deliberately excluded. Uploaded images are served straight off disk at **`/uploads/...`** — outside `/api`, because they are files, not endpoints. Image URLs in responses are already stored as that path (e.g. `/uploads/abc.webp`), so the frontend resolves them against the API origin, not the `/api` base.

**Auth is an httpOnly cookie, never a header.** `POST /api/auth/otp/verify` sets `access_token` (`httpOnly`, `sameSite: 'lax'`, `secure` only when `NODE_ENV=production`); the token is never in a response body. So:

- Every request needs **`credentials: 'include'`** / `withCredentials: true`. There is no token for JS to read or attach.
- `CORS_ORIGINS` must list the storefront origin exactly — wildcards are rejected by browsers once credentials are on.
- **`GET /api/auth/me` is unguarded and always 200.** Branch on `user` being null, never on the status code. It is the only way the frontend can learn who is logged in.
- Sessions are stateless, ~7 days, with no revocation table.

**Two guards, two different failure codes.** `AuthGuard` → **401**. `AdminGuard` → **404**, deliberately, so admin routes are not discoverable. An admin route answering 404 means "not an admin", not "wrong URL" — do not build retry or "not found" handling that misreads it.

**The response envelope is inconsistent, and it is per-endpoint.** Every response carries a Persian `message`, and the data sits under a key that varies:

- List endpoints spread `paginated()`: `{ message, items, meta: { page, limit, total, pageCount } }`. `pageCount` is at least 1 even when empty.
- Some return `{ message, payload }` — cart, settings, banners, user profile, order detail, admin stats.
- Others return the entity under its own name — `{ message, product }`, `{ message, category }`, `{ message, categories }`, `{ message, order }`, `{ message, varient }`, `{ message, images }`, `{ message, address }`, `{ message, user }`.

Type each endpoint from its own service return statement. There is no single generic wrapper to write once.

**Errors are one shape**, from `AllExceptionsFilter`: `{ statusCode, message, path, timestamp }`, where `message` is a **string or an array of strings** — `ValidationPipe` puts an array there. Messages are already user-facing Persian, so they can be surfaced directly. Unknown body fields are **stripped, not rejected** (`whitelist: true`), so a `PATCH` with an extra field is a 200 that silently changes nothing.

**Money is a digits-only string, and the unit is Toman.** Never a number, never Rial. Format for display; never parse and re-send a total. The backend recomputes every price, subtotal and discount server-side and ignores anything the client sends — `POST /api/orders` takes only the address, coupon code and note.

**Price and stock live on the variant, never the product.** Every product has at least one variant; a product with no options has one variant with `color`/`size` null. The public list returns a **card** shape only — `{ id, name, slug, coverImage, priceFrom, inStock }` — so the full variant list, `finalPrice` per variant and the gallery come from the detail endpoint. Cart lines and the cart picker are keyed by **variant id**; `DELETE /api/cart/items/:id` takes the **cart item** id, not the variant id.

Note the spelling: the entity, the DTOs, the routes and the JSON keys all say **`varient`**, not `variant`. It is baked into the schema.

**Validation quirks that cost time.** Every `:id` is a UUID v4 behind `ParseUUIDPipe`/`@IsUUID('4')`, so the nil UUID `00000000-...` is a **400, not a 404** — use a real-looking v4 that does not exist when testing "not found". Product and category detail routes take a **`:slug`**, not an id.

**Dates** come back as ISO strings. Jalali conversion is entirely a frontend concern; nothing in the API is localized beyond the Persian `message` strings.

## Route inventory

Public — no cookie needed:

| Method | Route | Notes |
| --- | --- | --- |
| `GET` | `/health` | outside the `/api` prefix |
| `GET` | `/api/settings` | shop branding, contact, socials, shipping rule, `bannerToggle`. Always returns a row |
| `GET` | `/api/banners` | active only, ordered; `?position=home_slider\|home_banner\|sidebar`. Empty when `bannerToggle` is off |
| `GET` | `/api/categories` | active tree, children nested under `children` |
| `GET` | `/api/categories/:slug` | 404 when deactivated |
| `GET` | `/api/products` | `?page&limit&search&categoryId&sort=newest\|oldest\|name`. Card shape. A root `categoryId` includes its subcategories |
| `GET` | `/api/products/:slug` | full detail: category, active variants with `finalPrice`, images cover-first |
| `POST` | `/api/auth/otp/request` | login and signup in one. **2 per 2 min per ip** |
| `POST` | `/api/auth/otp/verify` | sets the cookie. 10 per 2 min per ip, plus 5 wrong guesses per code |
| `POST` | `/api/auth/logout` | clears the cookie |
| `GET` | `/api/auth/me` | always 200, `user` is null when not logged in |
| `GET`/`POST` | `/api/payments/callback` | **the gateway's return url — never call it from the frontend.** It redirects the browser to `PAYMENT_RESULT_URL` with `?status&message&order&ref` |

Customer — `AuthGuard`, 401 without the cookie:

| Method | Route | Notes |
| --- | --- | --- |
| `GET`/`PATCH` | `/api/me/profile` | |
| `GET` | `/api/addresses` | |
| `POST` | `/api/addresses` | |
| `PATCH` | `/api/addresses/:id` | |
| `PATCH` | `/api/addresses/:id/default` | one default per user |
| `DELETE` | `/api/addresses/:id` | |
| `GET` | `/api/cart` | re-priced from the DB on every read. An unbuyable line stays listed with `isAvailable: false` and is excluded from the totals |
| `POST` | `/api/cart/items` | by variant id; an existing line **accumulates** quantity |
| `PATCH` | `/api/cart/items/:id` | **sets** the quantity; cart item id |
| `DELETE` | `/api/cart/items/:id` | cart item id |
| `DELETE` | `/api/cart` | empty the cart |
| `POST` | `/api/cart/merge` | call **once, right after login**, with the guest cart. Keeps the higher quantity per line (not the sum), so it is idempotent; unbuyable lines come back in `skipped` |
| `POST` | `/api/cart/discount/preview` | a quote only — nothing is stored, the code is re-validated at order time. **10 per 5 min per account** |
| `GET` | `/api/orders` | `?status=`, newest first, summaries only |
| `GET` | `/api/orders/:id` | snapshots, totals, address, tracking. Another customer's id is a 404 |
| `POST` | `/api/orders` | one transaction. Re-sending the same basket returns the **existing** pending order rather than creating a second; anything different cancels the old one. Starts `pending_payment` and expires in ~10 minutes |
| `POST` | `/api/payments/initiate` | takes only an order id; answers with the gateway url to redirect to |
| `GET` | `/api/payments` | my attempts, newest first, paginated |

Admin — `AdminGuard`, **404** for everyone else:

| Method | Route |
| --- | --- |
| `GET` | `/api/admin/stats` |
| `GET` | `/api/admin/products`, `/api/admin/products/:id` |
| `POST` | `/api/admin/products` |
| `PATCH` | `/api/admin/products/:id`, `/api/admin/products/:id/toggle` |
| `POST` | `/api/admin/products/:id/varients`, `/api/admin/products/:id/images` (multipart, 10 per product max) |
| `PATCH` | `/api/admin/products/:id/images/order` |
| `DELETE` | `/api/admin/products/:id/images/:imageId` |
| `PATCH` | `/api/admin/varients/:id`, `/:id/toggle`, `/:id/stock` |
| `GET` | `/api/admin/inventory/low-stock` |
| `GET`/`POST` | `/api/admin/categories` |
| `GET` | `/api/admin/categories/parents` |
| `PATCH` | `/api/admin/categories/:id`, `/:id/toggle` |
| `GET`/`POST` | `/api/admin/banners` |
| `PATCH` | `/api/admin/banners/reorder`, `/api/admin/banners/:id` |
| `DELETE` | `/api/admin/banners/:id` |
| `GET`/`POST` | `/api/admin/discounts` |
| `PATCH`/`DELETE` | `/api/admin/discounts/:id` |
| `GET` | `/api/admin/orders`, `/api/admin/orders/:id` |
| `PATCH` | `/api/admin/orders/:id/status`, `/:id/tracking` |
| `GET` | `/api/admin/customers`, `/api/admin/customers/:id` |
| `GET` | `/api/admin/payments` |
| `GET`/`POST` | `/api/admin/settings` (multipart, optional `logo`) |

`toggle` is also the **soft delete** for products, variants and categories — there is no hard product delete. Image, banner and settings writes are **`multipart/form-data`**; everything else is JSON. Allowed image types are jpeg/png/webp/avif, capped by `UPLOAD_MAX_SIZE_MB` (5 by default).

Enums the UI has to render: `OrderStatus` is `pending_payment | paid | processing | shipped | delivered | cancelled | failed | refunded` (`failed` means the checkout window expired; `cancelled` means someone decided). `PaymentStatus` has no `refunded` — a refund changes the **order's** status, not the payment's. `PaymentMethod` is `online` only. `DiscountType` is `percent | fixed`.

## What the backend deliberately does not have

Do not build a UI for these, and do not fake them. There is **no** wishlist, no product reviews or ratings, no order cancellation by the customer, no phone-number change flow, no password login, no guest checkout (the cart is server-side and needs a session), no stock-movement log, no static content pages, no multi-currency, and no product sort by price (`sort` is `newest | oldest | name` only). The frontend holds the guest cart in `localStorage` and folds it in via `POST /api/cart/merge` on login — that is the only intended client-side state of record.

## Deployment-relevant backend behaviour

The target is one Ubuntu VM under VMware, Nginx serving the built frontend and reverse-proxying the API. The backend's own assumptions:

- **`CORS_ORIGINS`** must list the storefront's real origin. Same-origin behind one Nginx avoids the problem entirely, and also makes the `sameSite: 'lax'` cookie behave.
- **`secure` is tied to `NODE_ENV=production`** — a production build served over plain HTTP will set a `secure` cookie the browser then refuses to send back, so logins appear to work and then do not. Either terminate TLS or keep `NODE_ENV` non-production while testing over HTTP.
- **`TRUST_PROXY` must be set to `1` behind a single Nginx.** Unset is the default and is silently wrong there: every per-ip rate limit becomes shop-wide, so two OTP requests from anyone exhaust the allowance for every visitor. The app logs a warning at boot in production when it is unset.
- **`PAYMENT_RESULT_URL`** is the storefront page the gateway callback redirects the customer to; it must be a real frontend route and is validated at boot. The default assumes `http://localhost:5173/payment/result`.
- `UPLOAD_DIR` resolves absolute paths as-is, so uploads can live outside the deployment folder. Nginx can serve `/uploads` directly, but the path must match `UPLOAD_PUBLIC_PATH`.
- `SMS_PROVIDER=mock` logs the OTP to the server console instead of sending it, which is how to log in without SMS credit. `PAYMENT_PROVIDER=mock` redirects straight back to the callback with `Status=OK`, so a whole checkout can be clicked through locally.
- `.env` is not committed; [server/.env.example](server/.env.example) documents every variable with its failure mode.

There is no Dockerfile, no compose file and no CI. Do not add any unless asked.

## Project documentation

- **[server/CLAUDE.md](server/CLAUDE.md)** — backend conventions, module rules, migration quirks. Authoritative for `server/`.
- **[server/docs/DATABASE.md](server/docs/DATABASE.md)** and **[server/docs/schema.sql](server/docs/schema.sql)** — the 14 tables, the ERD, and the reasoning behind snapshots, the order transaction and payment idempotency.
- **[server/ROADMAP.md](server/ROADMAP.md)** — phase ordering and what was deliberately left out of scope. Its checkboxes are unticked and stale; `server/src/modules/` is the record of what exists.
- **[server/backend-findings.md](server/backend-findings.md)** — API defects found by an earlier test client. **Partly stale**: Finding #1 (product pagination miscounting when a product has several images) has since been fixed — see `sortCollections` at the bottom of [server/src/modules/product/product.service.ts](server/src/modules/product/product.service.ts). Findings #2–#4 still stand, in particular that round-tripping `GET` → `POST /api/admin/settings` fails on a stored `socials` value the validator now rejects; omitting `socials` is the workaround.

`backend-findings.md` describes a frontend that no longer exists in this tree — `client/` was reset to the Vite template. Treat it as notes on the API, not as a description of the current client.

Both READMEs are untouched framework boilerplate (Vite template, NestJS starter) and carry no project information.
