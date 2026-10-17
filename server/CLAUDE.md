# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A **NestJS 11 + TypeORM + PostgreSQL** backend for a shop, deliberately built to be **reused unchanged across multiple shop clients** — each new contract should only need a new frontend. Auth is phone + OTP with a **cookie-based JWT**.

The user is primarily a React developer and less experienced on the backend. When adding backend structure, briefly explain the reasoning (module boundaries, transactions, indexes, migration safety) rather than only producing code.

## The planning documents

Read these before designing anything. There is no build checklist any more — the
code is the record of what exists, so check `src/modules/` rather than a list.

- **[docs/schema.sql](docs/schema.sql)** — the agreed 13-table schema. Verified to run on PostgreSQL with its constraints smoke-tested. Entities are written *from* this file.
- **[docs/DATABASE.md](docs/DATABASE.md)** — ERD plus the reasoning: snapshots, the order transaction, payment idempotency.
- **[ROADMAP.md](ROADMAP.md)** — phase ordering and what was deliberately left out.

Scope rule: **minimum viable shop.** Anything outside the agreed scope is a paid add-on for one client, not core work. Missing pieces get added later, on request — do not pre-build them.

## Current state

The shop is feature-complete. `src/modules/` has `auth/`, `user/`, `category/`,
`product/` (products, variants, images and inventory), `cart/`, `discount/`,
`address/`, `order/`, `payments/`, `settings/`, `banner/`, `sms/`, plus two
read-only reporting modules — `customer/` (the admin CRM) and `admin/` (the
dashboard).

Payments are built: a `PaymentGateway` interface with `mock` and `zarinpal`
drivers chosen by `PAYMENT_PROVIDER`, a public callback route, and idempotency
via the unique index on `payment (provider, reference)`. SMS has a real
Kavenegar driver alongside the console one, chosen by `SMS_PROVIDER`.

The schema is owned by **one migration**,
`src/migrations/<ts>-InitialSchema.ts`, generated from the entities against an
empty database and verified to produce all 14 tables. Databases that predate it
were marked with `migration:run --fake`, so they hold a ledger row without
re-running the SQL.

What is still missing, deliberately — do not pre-build these:

- No tests at all. `jest` finds no spec files; the order transaction and payment
  idempotency are the two worth writing first if that changes.
- No Dockerfile or compose file yet.
- Guest-cart merge on login, and a storage-swap interface for uploads (local
  disk is the only driver).
- `strict` is not fully on in tsconfig: `strictNullChecks` is true, but
  `noImplicitAny` and `strictBindCallApply` are off.

Deploy config in `.env` is still local — `NODE_ENV=development`, a localhost
`CORS_ORIGINS`, an empty `TRUST_PROXY`. Known, and deliberately left until
deployment. An empty `TRUST_PROXY` behind a proxy makes every per-ip rate limit
a shop-wide one, so it has to be set at that point.

Installed: `@nestjs/typeorm` 12, `typeorm` **1.1.1** (not the old 0.3.x — the
DataSource/migration API is the same, but check docs before assuming 0.3
behaviour), `pg`, `@nestjs/swagger` 12, `class-validator`, `class-transformer`,
`dotenv`, `@nestjs/throttler`, `@nestjs/schedule`, `cookie-parser`, `helmet`,
`bcrypt`, `jsonwebtoken` (plain, not `@nestjs/jwt`), `multer`, `sharp`,
`kavenegar`. Package manager is **pnpm**.

`@nestjs/config` is installed but **unused** — every env read goes through
`src/config/env.config.ts`, which calls `dotenv` once. Either adopt it or drop
it; do not start a second way of reading env.

### Config layout — three files, one connection

- `src/config/env.config.ts` is the only place that reads `process.env`. It
  also exports `assertPaymentUrls()`, called at boot.
- `src/config/db.config.ts` exports `dbConnection`, the shared connection
  options. It deliberately omits `entities`, `migrations` and `synchronize`,
  because those are exactly what the two ends must set differently.
- `src/config/typeorm.config.ts` (app) spreads it and adds `autoLoadEntities`
  plus `synchronize: env.db.synchronize`.
- `src/config/typeorm-cli.config.ts` (CLI) spreads it and adds the globs plus a
  hardcoded `synchronize: false`. The typeorm CLI is its own process and cannot
  read Nest's DI container, which is why this file exists. It must export
  **exactly one** DataSource — the CLI scans every export and refuses two.

### Quirks worth knowing before they cost an hour

- `migration:generate`/`create` take **one** positional whose last segment is
  the migration *name*, not a directory. `src/migrations/` alone writes a
  migration called "migrations" into `src/`. `scripts/create-migration.js`
  exists to join the folder and the name, since a package.json script can only
  append with a space.
- Do not put `--` in a pnpm script. pnpm forwards arguments already, so it
  arrives as a literal argument and yargs treats it as end-of-options: the
  command silently does nothing and exits 0.
- `migration:generate` diffs entities against the **live** database. Generating
  against a database that already has the schema produces an empty migration.
- `settings.socials` produces a phantom `ALTER COLUMN ... SET DEFAULT` on every
  generate. The stored default is already correct; it is a TypeORM comparator
  quirk with jsonb defaults. Delete that line from generated migrations.
- `UPLOAD_DIR` uses `resolve()`, so an absolute path (a mounted volume) works.

## Commands

```bash
pnpm install
pnpm start:dev            # watch mode
pnpm build                # nest build -> dist/
pnpm start:prod           # node dist/main

pnpm lint                 # eslint --fix over {src,apps,libs,test}
pnpm format               # prettier --write

pnpm test                 # jest, rootDir=src, *.spec.ts
pnpm test -- path/to/x.spec.ts          # single file
pnpm test -- -t "name of the test"      # single test by name
pnpm test:watch
pnpm test:e2e             # jest --config ./test/jest-e2e.json (rootDir=., *.e2e-spec.ts)
```

Migrations. The DataSource lives at `src/config/typeorm-cli.config.ts` and the
files in `src/migrations/`:

```bash
pnpm migration:create <Name>   # empty skeleton, lands in src/migrations/
pnpm migration:show            # [X] applied, [ ] pending — safe, read-only
pnpm migration:run             # applies every pending one, in timestamp order
pnpm migration:revert          # undoes the single most recent one

# Real SQL from the entities. Must point at a database WITHOUT the schema,
# or the diff is empty. The last path segment is the name, not a folder:
DB_DATABASE=scratch pnpm typeorm migration:generate src/migrations/<Name> -d src/config/typeorm-cli.config.ts
```

There is no way to pick which migration runs: `migration:run` applies all
pending ones in timestamp order, and the `migrations` table decides what is
pending. `--fake` records one as applied without executing it — for a database
whose schema already matches.

Unit specs live next to the code they test in `src/`; e2e specs live in `test/`.

## Module-based architecture

One folder per domain under `src/`, each self-contained:

```
src/<domain>/
  <domain>.module.ts
  <domain>.controller.ts      # thin: DTO validation + delegate
  <domain>.service.ts         # all business rules
  entities/<x>.entity.ts
  dto/<action>-<x>.dto.ts
```

Domains as they actually are: `auth/`, `user/`, `category/`, `product/`, `cart/`,
`discount/`, `address/`, `order/`, `settings/`, `banner/`, `sms/`, `customer/`,
`admin/`, and `payment/` when it lands. Names are singular. Variants, images and
inventory live inside `product/` rather than in modules of their own, because
they share its repositories. An admin-only endpoint is an `admin-<thing>.controller.ts`
inside the domain it belongs to; `admin/` holds only the cross-domain dashboard.

Cross-cutting code (guards, interceptors, filters, decorators, pagination helpers) goes in `src/common/`; config in `src/config/`; migrations in `src/migrations/`, with the CLI DataSource at `src/config/typeorm-cli.config.ts`.

Rules that keep the modules reusable:

- A module imports another module and uses its **service** — never another module's repository directly.
- Shop-specific behaviour is **configuration or data**, never branching code. Currency, shipping, feature toggles come from the single-row `settings` table or env.
- Anything a client might swap (payment gateway, SMS sender, file storage) is an **interface + DI token**, with the concrete class chosen in the module from config. That makes a swap one provider line.
- A feature only one client wants is an **optional module** left out of the root imports, not an `if (shop === 'x')`.

## Persistence

TypeORM with **`synchronize: false`** everywhere. Schema changes go through generated migrations in `src/migrations/` so a client deployment can be upgraded without losing data.

Non-negotiables from [docs/DATABASE.md](docs/DATABASE.md), because they are unfixable later:

- **Money is a digits-only `varchar`, and the unit is Toman.** Never float, and never Rial — Zarinpal is called with `currency: 'IRT'`, which is fixed in code precisely so nobody can make the stored numbers mean Rial and charge a tenth of the price. Phone numbers and postal codes are `varchar` too, never numeric.
- **Every product has ≥1 variant.** Price and stock live on `product_varient`, never on `product`. A product with no options gets one variant with `color`/`size` null.
- **Orders snapshot everything** — `order_item` copies name, label, image and unit price at purchase time; `order` copies the shipping address and discount code text. Editing a product must never rewrite a past order. The id columns to users/addresses/discounts/variants carry **no FK at all** (deliberate — see UNCONSTRAINED REFERENCES in [docs/schema.sql](docs/schema.sql)), so a deleted parent leaves a dangling id, never a `NULL`. Anything following one treats "not found" as normal; `order_item.varientId` in particular is a hint for "buy again", not a promise, and the cart is the authority.
- **Order placement is one transaction**: `SELECT ... FOR UPDATE` on the variant rows, re-check stock, **re-price from the DB**, validate the discount, insert order + snapshot items, decrement stock, clear the cart.
- **Payments are idempotent** via the unique index on `payment (provider, reference)`. A gateway callback that fires twice must not mark an order paid twice, and the verified amount must equal `order.grandTotal` before the status changes.
- Never trust a price, total or role sent by the client. Recompute server-side.

Schema naming quirks that are already baked in: `"user"` and `"order"` are reserved SQL words (TypeORM quotes them, raw SQL must too), and `product_varient` is a misspelling of *variant*.

## Auth

Phone + OTP, no passwords. OTP codes are stored **hashed** with an expiry, and the request endpoint is rate-limited per phone and per IP — an unprotected OTP endpoint is a direct SMS bill.

The JWT goes into an `httpOnly`, `secure`, `sameSite` cookie — never in the response body, never in `localStorage`. This needs `app.use(cookieParser())` and CORS with `credentials: true` plus an explicit allow-list `origin` (browsers reject wildcard origins when credentials are on).

**Sessions are stateless by design** — there is no token table, so there is no force-logout and no mid-session blocking. Keep the expiry around 7 days.

Authorization is `users.role` (`user` | `admin`). Two guards in `src/common/guards/`: `AuthGuard` (must be logged in, 401 otherwise) and `AdminGuard` (extends it; a non-admin gets **404**, not 403, so admin routes are not discoverable). No roles metadata — with only two roles a second guard is simpler than a `@Roles()` indirection.

## API surface

Global `ValidationPipe` with `whitelist: true, transform: true`, a global `/api` prefix, a global exception filter for one consistent error shape, and shared pagination/filter DTOs. Every list endpoint is paginated — no unbounded `find()`.

Swagger lives at `/swagger`. Decorate DTOs and controllers as you go; the frontend is the part that changes per client, so the documented API shape should stay stable and additive.

one line if statements should be writen as `if (x) return y` and not `if (x) { return y }`

do not pay attention to the schema types    type entities the way you want them to be    forget bigints

KEEP IT SIMPLE