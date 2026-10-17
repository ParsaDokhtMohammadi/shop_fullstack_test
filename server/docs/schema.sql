-- =============================================================================
-- Shop backend — PostgreSQL schema
--
-- Design reference, not a deployment script: TypeORM migrations are what runs
-- in production. Write the entities from this, generate migrations, diff.
--
--   money   bigint here, digits-only varchar in the entities. The unit is
--           TOMAN -- never Rial, never a fractional minor unit. Never float.
--   time    timestamptz
--   enums   varchar + CHECK
--   ids     uuid, DEFAULT gen_random_uuid()  (built in on PostgreSQL 13+)
--
-- Sessions are a stateless JWT cookie — no token table by design.
-- =============================================================================

-- No name column: an account is just a phone number. The person's name is
-- collected on the delivery address, where it is actually needed.
CREATE TABLE "user"(
    "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "phoneNumber" VARCHAR(20)  NOT NULL UNIQUE,   -- normalized: +989123456789
    "role"        VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK ("role" IN ('user','admin')),
    "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Phone login. Codes are stored HASHED so a leaked dump hands out none.
-- Rows are short-lived: requesting a new code deletes the old one, and a
-- successful verify deletes the row outright. At most one live row per phone.
CREATE TABLE "otp_code"(
    "id"        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone"     VARCHAR(20)  NOT NULL,
    "codeHash"  VARCHAR(255) NOT NULL,
    "purpose"   VARCHAR(20)  NOT NULL DEFAULT 'login'
                             CHECK ("purpose" IN ('login','phone_change')),
    -- There is deliberately no "userId". An OTP is matched to a person by
    -- "phone", which is the login identity and unique on "user" -- and at the
    -- time the first code is sent there is no account yet, because returning
    -- the code is what creates one. The column used to exist for the
    -- unbuilt 'phone_change' flow and was never read; if that flow is ever
    -- built it can come back NOT NULL, since there the account does exist.
    "expiresAt" TIMESTAMPTZ  NOT NULL,
    "attempts"  INTEGER      NOT NULL DEFAULT 0,   -- failed verifies, capped at 5
    "createdAt" TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Verify lookup + the "how many has this phone requested lately" rate limit.
-- UNIQUE: one live code per (phone, purpose). The resend cooldown is a read
-- followed by a write, so two requests can both pass it -- this index is what
-- refuses the second insert instead of letting both send a message.
CREATE UNIQUE INDEX "otp_code_phone_purpose_unique" ON "otp_code"("phone", "purpose");

-- Adjacency list. "parentId" NULL = a root category; set = a subcategory of
-- that root. Only two levels are allowed; the service refuses a parent that
-- itself has a parent, so no recursive queries are ever needed.
CREATE TABLE "category"(
    "id"        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"      VARCHAR(120) NOT NULL,
    "slug"      VARCHAR(140) NOT NULL UNIQUE,
    -- No "image". A category is a navigation label, rendered as text; the
    -- column was dropped along with the upload route.
    "parentId"  UUID,
    "sortOrder" INTEGER      NOT NULL DEFAULT 0,
    "isActive"  BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX "category_parent_index" ON "category"("parentId");

CREATE TABLE "product"(
    "id"         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "name"       VARCHAR(200) NOT NULL,
    "slug"       VARCHAR(220) NOT NULL UNIQUE,
    "content"    TEXT,
    "categoryId" UUID,
    "isActive"   BOOLEAN      NOT NULL DEFAULT TRUE,
    "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- NOTE: "coverImage" and "imageId" are gone. A product needs MANY images, so
-- the reference lives on the child ("image"."productId"), not here.

-- Images belong to a product. Lowest "sortOrder" is the cover.
CREATE TABLE "image"(
    "id"        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" UUID        NOT NULL,
    "url"       TEXT        NOT NULL,
    "sortOrder" INTEGER     NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "image_product_index" ON "image"("productId", "sortOrder");

-- EVERY product has at least one variant. No options? One row with color and
-- size null. Price and stock live here, never on "product".
CREATE TABLE "product_varient"(
    "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId"        UUID         NOT NULL,
    "color"            VARCHAR(60),
    "colorCode"        VARCHAR(20),
    "size"             VARCHAR(60),
    "price"            BIGINT       NOT NULL CHECK ("price" >= 0),
    -- Was "discount": ambiguous (percent or amount?). This is the struck-through
    -- "before" price, which is what the frontend actually renders.
    "compareAtPrice"   BIGINT       CHECK ("compareAtPrice" IS NULL OR "compareAtPrice" >= "price"),
    "stock"            INTEGER      NOT NULL DEFAULT 0 CHECK ("stock" >= 0),
    "createdAt"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    "updatedAt"        TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX "product_varient_product_index" ON "product_varient"("productId");

-- Who receives the parcel, and where. The name lives here rather than on
-- "user" because it can differ per address — a gift, or an office delivery.
CREATE TABLE "address"(
    "id"          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"      UUID         NOT NULL,
    "firstName"   VARCHAR(60)  NOT NULL,
    "lastName"    VARCHAR(60)  NOT NULL,
    "province"    VARCHAR(80)  NOT NULL,
    "city"        VARCHAR(80)  NOT NULL,
    "address"     TEXT         NOT NULL,
    "postalCode"  VARCHAR(20),                     -- text: leading zeros matter
    "phoneNumber" VARCHAR(20)  NOT NULL,           -- text: "+98" is not a number
    "info"        TEXT,
    "isDefault"   BOOLEAN      NOT NULL DEFAULT FALSE,
    "createdAt"   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX "address_user_index" ON "address"("userId");
CREATE UNIQUE INDEX "address_one_default_per_user" ON "address"("userId") WHERE "isDefault";

CREATE TABLE "cart_item"(
    "id"               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"           UUID        NOT NULL,
    "productVarientId" UUID        NOT NULL,
    "quantity"         INTEGER     NOT NULL CHECK ("quantity" > 0),
    "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Adding the same variant twice bumps quantity instead of adding a second row.
CREATE UNIQUE INDEX "cart_item_user_varient_unique" ON "cart_item"("userId", "productVarientId");
-- No price column: totals are always recomputed from "product_varient"."price".

CREATE TABLE "discount"(
    "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "code"           VARCHAR(40)  NOT NULL,
    "type"           VARCHAR(10)  NOT NULL CHECK ("type" IN ('percent','fixed')),
    -- Was missing entirely: type says HOW to discount, this says how much.
    -- percent -> 1..100, fixed -> an amount in Toman.
    "value"          BIGINT       NOT NULL CHECK ("value" > 0),
    "minOrderTotal"  BIGINT       NOT NULL DEFAULT 0,
    "limit"          BIGINT,                       -- null = unlimited uses
    "usage"          BIGINT       NOT NULL DEFAULT 0,
    "expirationDate" TIMESTAMPTZ,
    "isActive"       BOOLEAN      NOT NULL DEFAULT TRUE,
    "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- SUMMER10 and summer10 are the same code.
CREATE UNIQUE INDEX "discount_code_unique" ON "discount"(upper("code"));

-- Everything the customer agreed to is SNAPSHOT here: editing a product or an
-- address later must never change what a past order says.
CREATE TABLE "order"(
    "id"             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"         UUID,
    "status"         VARCHAR(20) NOT NULL DEFAULT 'pending_payment'
                                 CHECK ("status" IN ('pending_payment','paid','processing',
                                                     'shipped','delivered','cancelled','refunded')),
    "subTotal"       BIGINT      NOT NULL,
    "discountTotal"  BIGINT      NOT NULL DEFAULT 0,
    "shippingTotal"  BIGINT      NOT NULL DEFAULT 0,
    "grandTotal"     BIGINT      NOT NULL,         -- what the gateway is verified against
    "discountId"     UUID,                         -- nullable: most orders have no code
    "discountCode"   VARCHAR(40),                  -- snapshot of the code text

    -- shipping address snapshot; "addressId" is a reference only
    "addressId"      UUID,
    "shipFirstName"  VARCHAR(60)  NOT NULL,
    "shipLastName"   VARCHAR(60)  NOT NULL,
    "shipPhone"      VARCHAR(20)  NOT NULL,
    "shipProvince"   VARCHAR(80)  NOT NULL,
    "shipCity"       VARCHAR(80)  NOT NULL,
    "shipAddress"    TEXT         NOT NULL,
    "shipPostalCode" VARCHAR(20),

    "paymentMethod"  VARCHAR(20) NOT NULL DEFAULT 'online'
                                 CHECK ("paymentMethod" IN ('online','cod')),
    "trackingNumber" VARCHAR(60),                  -- null until shipped
    "note"           TEXT,
    "paidAt"         TIMESTAMPTZ,                  -- null until paid
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "order_user_index"   ON "order"("userId", "createdAt" DESC);
CREATE INDEX "order_status_index" ON "order"("status", "createdAt" DESC);
-- A coupon is one use per customer, and that is enforced by asking this table
-- whether they already hold an order against the code -- inside the checkout
-- transaction, so it must not be a scan of every order ever placed.
CREATE INDEX "order_discount_user_index" ON "order"("discountId", "userId");

CREATE TABLE "order_item"(
    "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId"      UUID         NOT NULL,
    "varientId"    UUID,                           -- reference only, for "buy again"
    -- Snapshot columns: this is what gets rendered, forever.
    "productName"  VARCHAR(200) NOT NULL,
    "varientLabel" VARCHAR(120),                   -- "L / Red", null if no options
    "imageUrl"     TEXT,
    "unitPrice"    BIGINT       NOT NULL,
    "quantity"     INTEGER      NOT NULL CHECK ("quantity" > 0),
    "lineTotal"    BIGINT       NOT NULL           -- unitPrice * quantity
);
CREATE INDEX "order_item_order_index" ON "order_item"("orderId");

CREATE TABLE "payment"(
    "id"        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "orderId"   UUID        NOT NULL,
    "provider"  VARCHAR(40) NOT NULL,              -- 'zarinpal', 'cod'
    "amount"    BIGINT      NOT NULL,
    "status"    VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK ("status" IN ('pending','succeeded','failed','refunded')),
    "authority" VARCHAR(120),                      -- token from initiate()
    "reference" VARCHAR(120),                      -- bank reference from verify()
    "response"  JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "payment_order_index" ON "payment"("orderId");
-- The idempotency guard. Gateways DO fire their callback twice; the second
-- insert violates this index instead of marking the order paid again.
CREATE UNIQUE INDEX "payment_reference_unique"
    ON "payment"("provider", "reference") WHERE "reference" IS NOT NULL;

CREATE TABLE "banner"(
    "id"        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    "imageUrl"  TEXT        NOT NULL,
    "linkUrl"   TEXT,
    "isActive"  BOOLEAN     NOT NULL DEFAULT TRUE,
    "sortOrder" INTEGER     NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX "banner_active_index" ON "banner"("sortOrder") WHERE "isActive";

-- Single row. Everything that differs between client shops lives here so the
-- code stays identical across deployments. API keys stay in env vars.
CREATE TABLE "settings"(
    "id"                    BOOLEAN      PRIMARY KEY DEFAULT TRUE CHECK ("id"),
    "name"                  VARCHAR(120) NOT NULL,
    "logo_url"              TEXT,
    "support_number"        VARCHAR(20),
    "support_email"         VARCHAR(160),
    "address"               TEXT,
    "socials"               JSONB        NOT NULL DEFAULT '{}'::jsonb,
    "shippingCost"          BIGINT       NOT NULL DEFAULT 0,
    "freeShippingThreshold" BIGINT,                -- null = never free
    "lowStockThreshold"     INTEGER      NOT NULL DEFAULT 5,
    "updatedAt"             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- =============================================================================
-- FOREIGN KEYS
--
-- The CHILD holds the key and points at the PARENT. The four reversed ones
-- (user->order, discount->order, product_varient->cart_item, image->product)
-- are corrected here; as exported they also referenced non-unique columns,
-- which Postgres rejects outright.
--
-- Only the constraints below this line are real. The "order", "order_item",
-- "payment" and "category"."parentId" references are deliberately
-- unconstrained -- see the section at the bottom of this file.
-- =============================================================================

ALTER TABLE "product" ADD CONSTRAINT "product_categoryid_foreign"
    FOREIGN KEY("categoryId") REFERENCES "category"("id") ON DELETE SET NULL;

ALTER TABLE "image" ADD CONSTRAINT "image_productid_foreign"
    FOREIGN KEY("productId") REFERENCES "product"("id") ON DELETE CASCADE;

ALTER TABLE "product_varient" ADD CONSTRAINT "product_varient_productid_foreign"
    FOREIGN KEY("productId") REFERENCES "product"("id") ON DELETE CASCADE;

ALTER TABLE "address" ADD CONSTRAINT "address_userid_foreign"
    FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_userid_foreign"
    FOREIGN KEY("userId") REFERENCES "user"("id") ON DELETE CASCADE;

ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_productvarientid_foreign"
    FOREIGN KEY("productVarientId") REFERENCES "product_varient"("id") ON DELETE CASCADE;

-- The one order-family constraint that is real: an order_item has no meaning
-- without its order, and there is no snapshot that outlives one.
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_orderid_foreign"
    FOREIGN KEY("orderId") REFERENCES "order"("id") ON DELETE CASCADE;


-- =============================================================================
-- UNCONSTRAINED REFERENCES
--
-- The columns below hold an id with no FOREIGN KEY behind it. That is a
-- decision, not an oversight. An earlier version of this file declared them
-- all ON DELETE SET NULL, the entities never implemented it, and the comments
-- in the code ended up describing this file rather than the database.
--
-- The reasoning: a placed order is immutable history. Everything that renders
-- is already a snapshot taken at purchase time -- "order_item" copies the
-- product name, variant label, image and unit price, "order" copies the whole
-- shipping address and the discount code text. These id columns are reference
-- only, for "buy again" and for reporting, and nothing joins through them to
-- display an order. So there is nothing a cascade could protect, and SET NULL
-- would mean a customer deleting an address gets to write to a financial row.
-- Nothing writes to an order except the code that owns its status.
--
-- What it costs: a deleted parent leaves a dangling id rather than a NULL.
-- Anything that follows one of these ids must treat "not found" as a normal
-- answer and must never read NULL as "the target is gone".
--
--   "order"."userId"         -> "user"."id"              no delete-account endpoint exists
--   "order"."addressId"      -> "address"."id"           customers do delete addresses
--   "order"."discountId"     -> "discount"."id"          admins do delete coupons
--   "order_item"."varientId" -> "product_varient"."id"   nothing hard-deletes a variant today
--   "payment"."orderId"      -> "order"."id"             nothing deletes an order
--   "category"."parentId"    -> "category"."id"          nothing hard-deletes a category
--
-- Two of these would be constraints in a stricter schema: "payment"."orderId"
-- wants RESTRICT (a payment must point at a real order) and "category"
-- ."parentId" wanted RESTRICT for the same reason. Both are moot while nothing
-- deletes an order or a category, and both are listed here rather than
-- silently omitted so the next person does not have to rediscover it.
-- =============================================================================
