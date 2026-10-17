# Backend findings

Issues found while building and running the test client against
`server/` on 2026-10-15. **No backend code was changed.** Each entry says how
it was reproduced and what it would take to fix, so the call stays with whoever
owns the backend.

These are separate from frontend bugs, which were fixed as they appeared and
are not listed here.

---

## Finding #1 — product list pagination miscounts whenever a product has more than one image

**Severity: high.** It is wrong on the default page size, it hides products
from the admin, and it is silent.

### What happens

`GET /api/products` and `GET /api/admin/products` return fewer rows than
`limit` asks for, and a `meta.total` that is too small — but only when the
page would contain a product with two or more images.

Measured against the seeded database (26 products, 16 of them publicly
visible):

| Request | `meta.total` | rows returned | truth |
| --- | --- | --- | --- |
| `/api/products?sort=name&limit=1` | 16 | 1 | 16 |
| `/api/products?sort=name&limit=3` | **2** | **2** | 16 |
| `/api/products?sort=name&limit=5` | **3** | **3** | 16 |
| `/api/products?sort=name&limit=20` | 16 | 16 | 16 |
| `/api/admin/products?limit=20` | **14** | **14** | 26 |

`sort=newest` looks healthy only by luck: the three newest seeded products
happen to have no images at all.

An admin on the default page size therefore sees 14 of 26 products and a
"۱۴ مورد" footer, with no error anywhere.

### Why

From the SQL the server logged (`DB_LOGGING=true`), TypeORM builds the usual
distinct-id subquery for a paginated find that joins a one-to-many relation:

```sql
SELECT DISTINCT "distinctAlias"."Product_id",
                "distinctAlias"."Product_name",
                "distinctAlias"."Product__Product_images_sortOrder"
FROM ( … product LEFT JOIN product_varient LEFT JOIN image LEFT JOIN category … ) "distinctAlias"
ORDER BY "distinctAlias"."Product_name" ASC,
         "distinctAlias"."Product__Product_images_sortOrder" ASC,
         "Product_id" ASC
LIMIT 3 OFFSET 0
```

Because the find orders by a column of a joined collection —

```ts
// src/modules/product/product.service.ts, findAll()
order: {
  ...this.orderBy(dto.sort),
  images: { sortOrder: 'ASC' },
},
```

— TypeORM must put `images.sortOrder` in the `SELECT DISTINCT` list. The
distinct key becomes *(product id, name, image sortOrder)*, so the row set
being paginated is one row **per image**, not per product. `LIMIT 3` then buys
three (product, image) pairs, which can be as few as two products, and the
count query counts the same pairs.

`findAllForAdmin()` has the same `order` block and the same defect.

### Reproduce

```bash
curl -s 'http://localhost:3000/api/products?sort=name&limit=3'  | python -c "import sys,json;print(json.load(sys.stdin)['meta'])"
curl -s 'http://localhost:3000/api/products?sort=name&limit=20' | python -c "import sys,json;print(json.load(sys.stdin)['meta'])"
```

### Suggested fix

Stop ordering the collection inside the paginated query. Either:

1. Drop `images: { sortOrder: 'ASC' }` from the `findAndCount` and sort the
   images in JS after loading (`toCard` already only reads `images[0]`, so the
   public list needs nothing more than a `Math.min`-style pick); or
2. Paginate product ids in their own query and load the relations for that
   page separately; or
3. Load the cover image the way `findCoverImages()` already does — a
   `distinctOn` query the cart path uses — and keep the list query free of the
   image join entirely.

Option 1 is the smallest change and option 3 is the one that matches code
already in the file.

### Not affected

`/api/admin/orders`, `/api/admin/customers`, `/api/admin/discounts`,
`/api/admin/payments` and `/api/admin/inventory/low-stock` were all checked at
`limit=2` and `limit=100` and report a stable total — none of them orders by a
joined collection.

---

## Finding #2 — saved settings cannot be read back and re-saved

**Severity: medium.** A plain "open the settings page, change the shop name,
save" is impossible while the stored value is invalid.

### What happens

`GET /api/admin/settings` returned

```json
"socials": { "telegram": "tel.com", "instagram": "https://instagram.com/shop" }
```

Posting that same object straight back to `POST /api/admin/settings` is
rejected:

```
400 ["شبکه‌های اجتماعی باید یک آبجکت JSON از نام شبکه و نشانی باشد و هر نشانی باید با http یا https شروع شود."]
```

`tel.com` is not an absolute http(s) url, and `@IsSocials` requires one. The
row predates that validator, so the API serves a value its own validator will
not accept. Any client that does read-modify-write on settings — which is the
natural shape for a settings form — fails until a human notices which field is
at fault.

### Reproduce

Round-trip the payload of `GET /api/admin/settings` into `POST
/api/admin/settings` as multipart. Omitting `socials` entirely succeeds and
leaves the stored value untouched, which is the workaround.

### Suggested fix

Not a code bug so much as unmigrated data, but it is reachable from the API:
clean the `settings.socials` jsonb in a migration (drop or fix values that are
not absolute http/https urls), since the validator was added after the row was
written. Optionally make the error name the offending key, which would have
made this obvious immediately.

### Note on data changed

Testing this route rewrote `settings.socials` to
`{"instagram":"https://instagram.com/shop"}` — the invalid `telegram` entry is
gone. Re-add it through the admin settings page with a full `https://` url.

---

## Finding #3 — the admin customer list returns three fields the docs do not mention

**Severity: low** (additive, so nothing breaks — but a typed client written
from the Swagger shape will silently drop them).

`GET /api/admin/customers` rows carry `ordersCount`, `totalSpent` and
`lastOrderAt` in addition to the documented `id`, `fullName`, `phoneNumber`,
`role`, `createdAt`:

```json
{ "id": "…", "fullName": null, "phoneNumber": "+989120001122", "role": "user",
  "createdAt": "…", "ordersCount": 1, "totalSpent": "624000",
  "lastOrderAt": "2026-10-15T11:13:21.893Z" }
```

The detail route nests the same three under `stats`, so the two shapes differ.
Worth a `@ApiProperty` on the list response, or a shared DTO, so the contract
is visible from Swagger. The client now types and displays them.

---

## Finding #4 — an invalid boolean query parameter is silently coerced instead of rejected

**Severity: low.**

`GET /api/admin/discounts?isActive=maybe` returns **200** and lists inactive
codes. The `@Transform` on the DTO is

```ts
@Transform(({ value }) =>
  value === undefined ? undefined : value === 'true' || value === true,
)
```

so anything that is not the string `true` becomes `false`, and `@IsBoolean`
then sees a valid boolean. `isActive=maybe` therefore means "show me the
inactive ones", which is not what the caller asked for.

Every other invalid query value in this API is a 400 (`sort=cheapest`,
`status=nope`, `position=bogus`, `from=yesterday`), so this is inconsistent
rather than dangerous. The same transform appears on `needsAttention`,
`bannerToggle`, `isActive` for categories and banners.

A stricter transform — map `'true'`/`'false'` and leave anything else as the
original string so `@IsBoolean` fails — would make these behave like the rest.

---

## Deliberately not reported as bugs

Checked, and the backend is doing what its own comments say it should:

- **Admin routes answer 404, not 403.** Intentional, so admin routes are not
  discoverable. Documented in `server/CLAUDE.md`.
- **`GET /auth/me` is always 200.** Intentional; the client branches on `user`.
- **The nil UUID `00000000-…` returns 400, not 404.** It is not a valid v4, so
  `@IsUUID('4')` rejects it before any lookup. Correct, and worth knowing when
  writing "resource not found" tests — use a valid v4 that does not exist.
- **`POST /orders` returns an existing pending order** instead of creating a
  second one. Intentional.
- **The cart is cleared on payment success, not at order creation.** Confirmed
  in `order.service.ts`; `server/CLAUDE.md` describes the order transaction as
  clearing the cart, which reads as if it happens at checkout. Only the prose
  is misleading, not the code.
- **Unknown body fields are stripped, not rejected** (`whitelist: true`), so
  `PATCH /me/profile` with `{"role":"admin"}` is a 200 that changes nothing.
  Verified the role did not change.
- **Clearing a variant's `color` also clears its `colorCode`.** Deliberate, per
  the service.
- Items already tracked in `server/bugs.md` (#22 image race, #23 stock
  read-then-write, #25 cart quantity accumulation, #27 hard-deleted discount)
  were not re-investigated.
