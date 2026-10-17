# Shop Backend — Build Checklist

Scope rule for this project: **minimum viable shop, built once, resold to many clients.** Anything not on this list is a paid add-on for a specific client, not core work. Items marked _(optional)_ are deliberately deferred — build them only when a client pays for them.

Assumptions to confirm: SMS provider and payment gateway are region-specific (e.g. Kavenegar / SMS.ir and Zarinpal for Iran). Both are behind an interface so a client can swap them — see the DI-token convention in [CLAUDE.md](CLAUDE.md).

---

## Phase 0 — Foundation (do this before any feature)

- [ ] Install deps: `@nestjs/typeorm typeorm pg @nestjs/config class-validator class-transformer cookie-parser @nestjs/throttler helmet`
- [ ] `src/config/` — env schema with validation (app fails to boot on a missing var, not at 3am in production)
- [ ] `src/database/` — TypeORM module (`synchronize: false`) + standalone `data-source.ts` for the CLI + first migration
- [ ] `main.ts` — global `ValidationPipe` ({ whitelist: true, transform: true }), `/api` prefix, cookie-parser, helmet, CORS with `credentials: true` + explicit origin list
- [ ] `src/common/` — global exception filter (one error shape), pagination DTO, `@Roles()` decorator + roles guard
- [ ] Turn on `strict` in `tsconfig.json` (cheap now, painful later)
- [ ] `/health` endpoint
- [ ] Seed script: create the first admin user
- [ ] `shop_settings` table (single row): shop name, currency, tax %, free-shipping threshold, flat shipping cost, contact info, feature flags. **This table is what makes the backend reusable — no client-specific value goes in code.**

## Phase 1 — Auth (phone + OTP)

- [ ] `users` table: phone (unique), name, role (`user` | `admin`), createdAt, isBlocked
- [ ] `POST /auth/otp/request` — normalize phone, generate 5–6 digit code, store **hashed** with expiry (2 min), send via SMS provider interface
- [ ] `POST /auth/otp/verify` — verify, create user if new (this is signup and login in one), issue cookies
- [ ] Access + refresh tokens in `httpOnly` `secure` `sameSite` cookies, refresh rotation, server-side revocation table
- [ ] `POST /auth/logout`, `GET /auth/me`
- [ ] **Rate limit OTP hard**: per phone + per IP, cooldown between sends, max verify attempts per code. SMS costs real money and this is the #1 way to get billed by a bot.
- [ ] Dev mode: log the OTP instead of sending, so the frontend can be developed without SMS credit

## Phase 2 — Catalog

- [ ] `categories` — name, slug, optional parent (one level of nesting is enough), sort order
- [ ] `products` — name, slug, description, price (**integer minor units**), compareAtPrice, stock, isActive, category, createdAt
- [ ] `product_images` — product FK, url, sort order, one primary; multiple uploads per product
- [ ] Upload module — validate mime + size, generate a thumbnail, store behind a storage interface (local disk first, S3-compatible later without touching callers)
- [ ] Public: list with pagination + filter by category + text search + sort by price/newest; get by slug
- [ ] Admin CRUD for products, categories, images (reorder + delete)
- [ ] _(optional)_ Variants (size/colour with their own stock and price) — skip unless the client sells clothing; retrofitting is expensive, so ask before Phase 2 starts

## Phase 3 — Cart

- [ ] `carts` / `cart_items` keyed to the user
- [ ] Guest cart lives in frontend `localStorage`, merged into the DB cart on login — cheapest correct approach, no guest-session table
- [ ] Add / update quantity / remove / clear, cart totals computed **server-side** from current DB prices (never trust prices sent by the client)
- [ ] Reject quantities above stock at add time and again at checkout

## Phase 4 — Discount codes

- [ ] `discount_codes` — code, type (percent | fixed), value, minimum order, max uses, uses count, per-user limit, starts/expires, isActive
- [ ] Validate + apply endpoint; final recalculation happens at order creation, not from the client
- [ ] Increment usage inside the order transaction

## Phase 5 — Orders

- [ ] `addresses` — user FK, receiver name, phone, province/city, full address, postal code (allow a few saved addresses)
- [ ] `orders` — user, order number, status, items snapshot, subtotal, discount, shipping, tax, total, address snapshot, timestamps
- [ ] `order_items` — **snapshot** product name, image and price at purchase time (later price edits must not rewrite history)
- [ ] Create order inside one transaction: lock rows, re-check stock, re-price, decrement stock, mark discount used, empty cart
- [ ] Status flow: `pending_payment → paid → processing → shipped → delivered`, plus `cancelled` / `refunded`; restore stock on cancel
- [ ] User: list my orders, order detail. Admin: list/filter by status, update status, add tracking number
- [ ] _(optional)_ SMS notification on status change

## Phase 6 — Payments

- [ ] `payments` — order FK, gateway, amount, authority/reference, status, raw gateway response, timestamps
- [ ] Gateway behind an interface: `initiate()` → redirect url, `verify()` → confirm
- [ ] Callback/verify endpoint is **idempotent** — a double callback must never mark an order paid twice or double-decrement anything
- [ ] Verify the amount against the order server-side before marking paid
- [ ] Admin: payment list, mark refunded
- [ ] _(optional)_ Cash on delivery as a second "gateway" — trivial and clients ask for it

## Phase 7 — Panels

**Admin**
- [ ] Dashboard stats: revenue today/month, order count by status, low-stock list, new users
- [ ] Customers (the "CRM" part): list + search, order history per customer, internal notes field, block/unblock
- [ ] Inventory: stock adjust endpoint with a `stock_movements` log (who changed what, when, why) and a low-stock threshold
- [ ] Orders, products, categories, discounts, banners CRUD — all paginated and filterable

**User**
- [ ] Profile: view + edit name/email, manage addresses
- [ ] Changing phone number requires OTP on the new number
- [ ] Order list + detail, payment history

## Phase 8 — Content

- [ ] `banners` — image, link, position (home slider / sidebar), sort order, isActive, optional start/end date
- [ ] _(optional)_ Static pages (about / contact / terms) as DB rows so the client edits them without a deploy — cheap, and it stops "can you change this text" support requests

---

## Worth adding (my recommendations, in priority order)

1. **`shop_settings` table** — Phase 0. Without it "reusable across shops" turns into a fork per client. Highest-value item on this list.
2. **OTP rate limiting** — Phase 1. Not optional; an unprotected OTP endpoint is a direct bill.
3. **Order item snapshots + integer money** — Phase 5. Both are nearly free now and unfixable later without a data migration.
4. **Idempotent payment verify** — Phase 6. The single most common source of real money bugs in small shops.
5. **Stock movement log** — Phase 7. Cheap table, and it answers "where did my inventory go" without you reading production logs.
6. **Seed + migrations discipline** — Phase 0. This is what lets you deploy client #4 in an afternoon.

Deliberately left out as over-scope for a cheap shop: reviews/ratings, wishlist, multi-vendor, loyalty points, abandoned-cart emails, full-text search engines, i18n, multi-currency, GraphQL, microservices, queues. Each is a fine paid add-on later.

## Cross-cutting, do as you go

- [ ] Every list endpoint paginated (no unbounded `find()`)
- [ ] Indexes on: product slug, category FK, order user FK + status, phone, discount code
- [ ] Soft delete for products and categories (an order must still resolve a deleted product)
- [ ] e2e test per phase covering the happy path; unit tests for pricing/discount math specifically
- [ ] Never trust client-sent prices, totals, or roles — recompute server-side
