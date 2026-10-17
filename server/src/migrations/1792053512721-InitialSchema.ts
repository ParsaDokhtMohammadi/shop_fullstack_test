import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792053512721 implements MigrationInterface {
    name = 'InitialSchema1792053512721'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phoneNumber" character varying(20) NOT NULL, "fullName" character varying(120), "role" character varying(10) NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_f2578043e491921209f5dadd080" UNIQUE ("phoneNumber"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "address" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "firstName" character varying(60) NOT NULL, "lastName" character varying(60) NOT NULL, "province" character varying(80) NOT NULL, "city" character varying(80) NOT NULL, "address" text NOT NULL, "postalCode" character varying(20), "phoneNumber" character varying(20) NOT NULL, "info" text, "isDefault" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "address_one_default_per_user" ON "address"  ("userId") WHERE "isDefault"`);
        await queryRunner.query(`CREATE INDEX "address_user_index" ON "address"  ("userId") `);
        await queryRunner.query(`CREATE TABLE "otp_code" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "phone" character varying(20) NOT NULL, "codeHash" character varying(255) NOT NULL, "purpose" character varying(20) NOT NULL DEFAULT 'login', "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_c2c773c7da0f03da4a23c4066a7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "otp_code_phone_purpose_unique" ON "otp_code"  ("phone", "purpose") `);
        await queryRunner.query(`CREATE TABLE "category" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(120) NOT NULL, "slug" character varying(140) NOT NULL, "parentId" uuid, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_cb73208f151aa71cdd78f662d70" UNIQUE ("slug"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d5456fd7e4c4866fec8ada1fa1" ON "category"  ("parentId") `);
        await queryRunner.query(`CREATE TABLE "image" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "url" text NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d6db1ab4ee9ad9dbe86c64e4cc3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b2c9da6c36fdd916732302db9" ON "image"  ("productId", "sortOrder") `);
        await queryRunner.query(`CREATE TABLE "product" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(35) NOT NULL, "slug" character varying(40) NOT NULL, "content" text, "categoryId" uuid, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_8cfaf4a1e80806d58e3dbe69224" UNIQUE ("slug"), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ff0c0301a95e517153df97f681" ON "product"  ("categoryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7bb2b2f7a4c8a4916d4339d7f4" ON "product"  ("isActive") `);
        await queryRunner.query(`CREATE TABLE "product_varient" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "productId" uuid NOT NULL, "color" character varying(60), "colorCode" character varying(20), "size" character varying(60), "price" character varying(20) NOT NULL, "discountPercent" character varying(3) NOT NULL DEFAULT '0', "stock" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_066043c68bb3b2aeff7d03136b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cab30adc6eb2cc55a0dd23a323" ON "product_varient"  ("productId") `);
        await queryRunner.query(`CREATE TABLE "cart_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "productVarientId" uuid NOT NULL, "quantity" integer NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_bd94725aa84f8cf37632bcde997" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "cart_item_user_varient_unique" ON "cart_item"  ("userId", "productVarientId") `);
        await queryRunner.query(`CREATE TABLE "banner" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "imageUrl" text NOT NULL, "linkUrl" text, "title" character varying(160), "position" character varying(40) NOT NULL DEFAULT 'home_slider', "isActive" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6d9e2570b3d85ba37b681cd4256" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "banner_active_index" ON "banner"  ("position", "sortOrder") WHERE "isActive"`);
        await queryRunner.query(`CREATE TABLE "discount" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" character varying(40) NOT NULL, "type" character varying(10) NOT NULL, "value" character varying(20) NOT NULL, "minOrderTotal" character varying(20) NOT NULL DEFAULT '0', "usageLimit" integer, "usage" integer NOT NULL DEFAULT '0', "expirationDate" TIMESTAMP WITH TIME ZONE, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_d05d8712e429673e459e7f1cddb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "discount_code_unique" ON "discount"  ("code") `);
        await queryRunner.query(`CREATE TABLE "order" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" character varying(20) NOT NULL, "userId" uuid, "status" character varying(20) NOT NULL DEFAULT 'pending_payment', "subTotal" character varying(20) NOT NULL, "discountTotal" character varying(20) NOT NULL DEFAULT '0', "shippingTotal" character varying(20) NOT NULL DEFAULT '0', "grandTotal" character varying(20) NOT NULL, "discountId" uuid, "discountCode" character varying(40), "addressId" uuid, "shipFirstName" character varying(60) NOT NULL, "shipLastName" character varying(60) NOT NULL, "shipPhone" character varying(20) NOT NULL, "shipProvince" character varying(80) NOT NULL, "shipCity" character varying(80) NOT NULL, "shipAddress" text NOT NULL, "shipPostalCode" character varying(20), "paymentMethod" character varying(20) NOT NULL DEFAULT 'online', "trackingNumber" character varying(60), "note" text, "paidAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "order_number_unique" ON "order"  ("orderNumber") `);
        await queryRunner.query(`CREATE INDEX "order_discount_user_index" ON "order"  ("discountId", "userId") `);
        await queryRunner.query(`CREATE INDEX "order_status_index" ON "order"  ("status", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "order_user_index" ON "order"  ("userId", "createdAt") `);
        await queryRunner.query(`CREATE TABLE "order_item" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "varientId" uuid, "productName" character varying(200) NOT NULL, "varientLabel" character varying(120), "imageUrl" text, "unitPrice" character varying(20) NOT NULL, "quantity" integer NOT NULL, "lineTotal" character varying(20) NOT NULL, CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "order_item_order_index" ON "order_item"  ("orderId") `);
        await queryRunner.query(`CREATE TABLE "payment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "userId" uuid, "provider" character varying(40) NOT NULL, "reference" character varying(120) NOT NULL, "amount" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "refId" character varying(60), "paidAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "payment_provider_reference_unique" ON "payment"  ("provider", "reference") `);
        await queryRunner.query(`CREATE INDEX "payment_user_index" ON "payment"  ("userId", "createdAt") `);
        await queryRunner.query(`CREATE INDEX "payment_order_index" ON "payment"  ("orderId") `);
        await queryRunner.query(`CREATE TABLE "settings" ("id" boolean NOT NULL DEFAULT true, "name" character varying(120) NOT NULL, "logoUrl" text, "supportNumber" character varying(20), "supportEmail" character varying(160), "address" text, "socials" jsonb NOT NULL DEFAULT '{}'::jsonb, "shippingCost" character varying(20) NOT NULL DEFAULT '0', "freeShippingThreshold" character varying(20), "lowStockThreshold" integer NOT NULL DEFAULT '5', "bannerToggle" boolean NOT NULL DEFAULT true, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "address" ADD CONSTRAINT "FK_d25f1ea79e282cc8a42bd616aa3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "image" ADD CONSTRAINT "FK_c6eb61588205e25a848ba6105cd" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "FK_ff0c0301a95e517153df97f6812" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_varient" ADD CONSTRAINT "FK_cab30adc6eb2cc55a0dd23a323d" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_item" ADD CONSTRAINT "FK_158f0325ccf7f68a5b395fa2f6a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cart_item" ADD CONSTRAINT "FK_1233e382171ea652e7977e1ffee" FOREIGN KEY ("productVarientId") REFERENCES "product_varient"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`);
        await queryRunner.query(`ALTER TABLE "cart_item" DROP CONSTRAINT "FK_1233e382171ea652e7977e1ffee"`);
        await queryRunner.query(`ALTER TABLE "cart_item" DROP CONSTRAINT "FK_158f0325ccf7f68a5b395fa2f6a"`);
        await queryRunner.query(`ALTER TABLE "product_varient" DROP CONSTRAINT "FK_cab30adc6eb2cc55a0dd23a323d"`);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "FK_ff0c0301a95e517153df97f6812"`);
        await queryRunner.query(`ALTER TABLE "image" DROP CONSTRAINT "FK_c6eb61588205e25a848ba6105cd"`);
        await queryRunner.query(`ALTER TABLE "address" DROP CONSTRAINT "FK_d25f1ea79e282cc8a42bd616aa3"`);
        await queryRunner.query(`DROP TABLE "settings"`);
        await queryRunner.query(`DROP INDEX "public"."payment_order_index"`);
        await queryRunner.query(`DROP INDEX "public"."payment_user_index"`);
        await queryRunner.query(`DROP INDEX "public"."payment_provider_reference_unique"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP INDEX "public"."order_item_order_index"`);
        await queryRunner.query(`DROP TABLE "order_item"`);
        await queryRunner.query(`DROP INDEX "public"."order_user_index"`);
        await queryRunner.query(`DROP INDEX "public"."order_status_index"`);
        await queryRunner.query(`DROP INDEX "public"."order_discount_user_index"`);
        await queryRunner.query(`DROP INDEX "public"."order_number_unique"`);
        await queryRunner.query(`DROP TABLE "order"`);
        await queryRunner.query(`DROP INDEX "public"."discount_code_unique"`);
        await queryRunner.query(`DROP TABLE "discount"`);
        await queryRunner.query(`DROP INDEX "public"."banner_active_index"`);
        await queryRunner.query(`DROP TABLE "banner"`);
        await queryRunner.query(`DROP INDEX "public"."cart_item_user_varient_unique"`);
        await queryRunner.query(`DROP TABLE "cart_item"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cab30adc6eb2cc55a0dd23a323"`);
        await queryRunner.query(`DROP TABLE "product_varient"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7bb2b2f7a4c8a4916d4339d7f4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ff0c0301a95e517153df97f681"`);
        await queryRunner.query(`DROP TABLE "product"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b2c9da6c36fdd916732302db9"`);
        await queryRunner.query(`DROP TABLE "image"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5456fd7e4c4866fec8ada1fa1"`);
        await queryRunner.query(`DROP TABLE "category"`);
        await queryRunner.query(`DROP INDEX "public"."otp_code_phone_purpose_unique"`);
        await queryRunner.query(`DROP TABLE "otp_code"`);
        await queryRunner.query(`DROP INDEX "public"."address_user_index"`);
        await queryRunner.query(`DROP INDEX "public"."address_one_default_per_user"`);
        await queryRunner.query(`DROP TABLE "address"`);
        await queryRunner.query(`DROP TABLE "user"`);
    }

}
