import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Settings } from '../modules/settings/entities/settings.entity';
import { Banner } from '../modules/banner/entities/banner.entity';
import { Discount } from '../modules/discount/entities/discount.entity';
import { User } from '../modules/user/entities/user.entity';
import { Address } from '../modules/address/entities/address.entity';
import { CartItem } from '../modules/cart/entities/cart-item.entity';
import { Order } from '../modules/order/entities/order.entity';
import { OrderItem } from '../modules/order/entities/order-item.entity';
import { Payment } from '../modules/payments/entities/payment.entity';
import { Product } from '../modules/product/entities/product.entity';
import { ProductImage } from '../modules/product/entities/product-image.entity';
import { ProductVarient } from '../modules/product/entities/product-varient.entity';
import { BannerPosition } from '../common/enums/banner-position.enum';
import { DiscountType } from '../common/enums/discount-type.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentMethod } from '../common/enums/payment-method.enum';
import { PaymentProvider } from '../common/enums/payment-provider.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Role } from '../common/enums/role.enum';

// Fills everything the other three seeds do not: settings, banners, discounts,
// customers with addresses, a live cart, and orders in every status with their
// snapshot items and payment rows. The point is a frontend with something to
// render on every screen — an empty orders page tells you nothing about
// whether the orders page works.
//
// Run the catalogue seeds first; the carts and orders attach to real variants:
//
//   pnpm seed:categories && pnpm seed:products && pnpm seed:demo
//
// Idempotent, like the others. Every row is looked up by a stable natural key
// first — the settings singleton, a banner title, a discount code, a phone
// number, an order number — so re-running reuses rows instead of duplicating
// them. Nothing here is ever updated, so local edits survive a re-run.
//
// Money is a digits-only string in Toman, never a number. Prices below are
// written the same way the API stores them.

// Images point at picsum rather than /uploads, so they actually render in a
// browser. Nothing is written to disk, and no upload is faked — a seeded
// product simply has a remote cover.
const photo = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const BANNERS = [
  {
    title: 'فروش ویژه پاییز',
    imageUrl: photo('shop-slider-1', 1600, 600),
    linkUrl: '/products',
    position: BannerPosition.HomeSlider,
    sortOrder: 0,
    isActive: true,
  },
  {
    title: 'جدیدترین موبایل‌ها',
    imageUrl: photo('shop-slider-2', 1600, 600),
    linkUrl: '/category/mobile',
    position: BannerPosition.HomeSlider,
    sortOrder: 1,
    isActive: true,
  },
  {
    title: 'ارسال رایگان بالای ۵۰۰ هزار تومان',
    imageUrl: photo('shop-strip', 1600, 300),
    linkUrl: null,
    position: BannerPosition.HomeBanner,
    sortOrder: 0,
    isActive: true,
  },
  // Switched off on purpose: the public list must skip it while the admin
  // list still shows it.
  {
    title: 'کمپین تمام‌شده',
    imageUrl: photo('shop-old', 600, 800),
    linkUrl: null,
    position: BannerPosition.Sidebar,
    sortOrder: 0,
    isActive: false,
  },
];

// Every state the checkout has to deal with, so the frontend can show each
// rejection rather than only the happy path.
const DISCOUNTS = [
  {
    code: 'WELCOME10',
    type: DiscountType.Percent,
    value: '10',
    minOrderTotal: '0',
    usageLimit: null as number | null,
    usage: 0,
    expirationDate: null as Date | null,
    isActive: true,
    note: 'percent, no limit — the one to test with',
  },
  {
    code: 'OFF50K',
    type: DiscountType.Fixed,
    value: '50000',
    minOrderTotal: '500000',
    usageLimit: 100,
    usage: 3,
    expirationDate: null,
    isActive: true,
    note: 'fixed, needs a 500,000 subtotal',
  },
  {
    code: 'EXPIRED',
    type: DiscountType.Percent,
    value: '20',
    minOrderTotal: '0',
    usageLimit: null,
    usage: 0,
    expirationDate: new Date('2024-01-01T00:00:00Z'),
    isActive: true,
    note: 'expired — rejected on date',
  },
  {
    code: 'SOLDOUT',
    type: DiscountType.Percent,
    value: '30',
    minOrderTotal: '0',
    usageLimit: 5,
    usage: 5,
    expirationDate: null,
    isActive: true,
    note: 'usage limit reached',
  },
  {
    code: 'DISABLED',
    type: DiscountType.Fixed,
    value: '25000',
    minOrderTotal: '0',
    usageLimit: null,
    usage: 0,
    expirationDate: null,
    isActive: false,
    note: 'switched off',
  },
];

const CUSTOMERS = [
  {
    phoneNumber: '09120000001',
    fullName: 'سارا محمدی',
    address: {
      firstName: 'سارا',
      lastName: 'محمدی',
      province: 'تهران',
      city: 'تهران',
      address: 'خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳',
      postalCode: '1234567890',
      phoneNumber: '09120000001',
      info: 'زنگ واحد ۳',
    },
  },
  {
    phoneNumber: '09120000002',
    fullName: 'رضا کریمی',
    address: {
      firstName: 'رضا',
      lastName: 'کریمی',
      province: 'اصفهان',
      city: 'اصفهان',
      address: 'خیابان چهارباغ بالا، مجتمع نگین، طبقه ۲',
      postalCode: '8134567890',
      phoneNumber: '09120000002',
      info: null,
    },
  },
  // No address: the checkout has to handle a customer who has not added one.
  {
    phoneNumber: '09120000003',
    fullName: 'مینا احمدی',
    address: null,
  },
];

type SeedOrder = {
  orderNumber: string;
  customerIndex: number;
  status: OrderStatus;
  itemCount: number;
  discountCode: string | null;
  trackingNumber: string | null;
  note: string | null;
  payment: { status: PaymentStatus; refId: string | null } | null;
};

// Fixed order numbers so a re-run finds them instead of making more. The shape
// matches generateOrderNumber() (yymmdd-nnnnn) so the frontend sees realistic
// strings; the date part is frozen rather than today's.
const ORDERS: SeedOrder[] = [
  {
    orderNumber: '250101-90001',
    customerIndex: 0,
    status: OrderStatus.Delivered,
    itemCount: 2,
    discountCode: 'WELCOME10',
    trackingNumber: 'IR123456789',
    note: null,
    payment: { status: PaymentStatus.Success, refId: '100200300' },
  },
  {
    orderNumber: '250101-90002',
    customerIndex: 0,
    status: OrderStatus.Shipped,
    itemCount: 1,
    discountCode: null,
    trackingNumber: 'IR987654321',
    note: 'لطفاً قبل از ارسال تماس بگیرید.',
    payment: { status: PaymentStatus.Success, refId: '100200301' },
  },
  {
    orderNumber: '250101-90003',
    customerIndex: 1,
    status: OrderStatus.Processing,
    itemCount: 3,
    discountCode: 'OFF50K',
    trackingNumber: null,
    note: null,
    payment: { status: PaymentStatus.Success, refId: '100200302' },
  },
  {
    orderNumber: '250101-90004',
    customerIndex: 1,
    status: OrderStatus.Paid,
    itemCount: 1,
    discountCode: null,
    trackingNumber: null,
    note: null,
    payment: { status: PaymentStatus.Success, refId: '100200303' },
  },
  // Still waiting on the gateway: a pending payment row and no paidAt.
  {
    orderNumber: '250101-90005',
    customerIndex: 0,
    status: OrderStatus.PendingPayment,
    itemCount: 1,
    discountCode: null,
    trackingNumber: null,
    note: null,
    payment: { status: PaymentStatus.Pending, refId: null },
  },
  {
    orderNumber: '250101-90006',
    customerIndex: 1,
    status: OrderStatus.Failed,
    itemCount: 2,
    discountCode: null,
    trackingNumber: null,
    note: null,
    payment: { status: PaymentStatus.Failed, refId: null },
  },
  // Cancelled before any payment was attempted, so there is no payment row at
  // all — the order detail page has to cope with that.
  {
    orderNumber: '250101-90007',
    customerIndex: 0,
    status: OrderStatus.Cancelled,
    itemCount: 1,
    discountCode: null,
    trackingNumber: null,
    note: 'نظرم عوض شد',
    payment: null,
  },
  {
    orderNumber: '250101-90008',
    customerIndex: 1,
    status: OrderStatus.Refunded,
    itemCount: 1,
    discountCode: null,
    trackingNumber: 'IR555666777',
    note: null,
    payment: { status: PaymentStatus.Success, refId: '100200304' },
  },
];

const money = (n: number) => String(Math.round(n));

// What a variant costs after its own discountPercent, which is where the real
// pricing lives — order totals below are built from this, not from price.
const effectivePrice = (varient: ProductVarient): number => {
  const price = Number(varient.price);
  const percent = Number(varient.discountPercent ?? '0');

  return Math.round(price * (1 - percent / 100));
};

const varientLabel = (varient: ProductVarient): string | null => {
  const parts = [varient.color, varient.size].filter(Boolean);

  return parts.length ? parts.join(' / ') : null;
};

async function seedDemo() {
  // Boots the app's providers without opening an HTTP port, so the seed reuses
  // the same entities and connection as the running API.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const repo = <T extends object>(entity: new () => T) =>
    app.get<Repository<T>>(getRepositoryToken(entity));

  try {
    const settingsRepository = repo(Settings);
    const bannerRepository = repo(Banner);
    const discountRepository = repo(Discount);
    const userRepository = repo(User);
    const addressRepository = repo(Address);
    const cartRepository = repo(CartItem);
    const orderRepository = repo(Order);
    const paymentRepository = repo(Payment);
    const productRepository = repo(Product);
    const imageRepository = repo(ProductImage);
    const varientRepository = repo(ProductVarient);

    // The catalogue has to exist first — carts and order snapshots point at
    // real variants, and there is nothing sensible to invent here.
    const products = await productRepository.find({
      relations: { varients: true },
      order: { createdAt: 'ASC' },
    });
    const sellable = products.flatMap((product) =>
      (product.varients ?? [])
        .filter((varient) => varient.isActive && Number(varient.price) > 0)
        .map((varient) => ({ product, varient })),
    );

    if (!sellable.length) {
      console.error(
        'No products found. Run `pnpm seed:categories && pnpm seed:products` first.',
      );
      process.exit(1);
    }

    console.log('settings');
    const existingSettings = await settingsRepository.findOne({
      where: { id: true },
    });
    if (existingSettings) {
      console.log('  = already configured');
    } else {
      await settingsRepository.save(
        settingsRepository.create({
          id: true,
          name: 'فروشگاه نمونه',
          logoUrl: null,
          supportNumber: '02191000000',
          supportEmail: 'support@example.com',
          address: 'تهران، خیابان آزادی، پلاک ۱',
          // Full absolute urls, because @IsSocials accepts nothing else. A
          // bare handle here seeds a row the settings form cannot save back.
          socials: {
            instagram: 'https://instagram.com/example_shop',
            telegram: 'https://t.me/example_shop',
          },
          shippingCost: '45000',
          freeShippingThreshold: '500000',
          lowStockThreshold: 5,
          bannerToggle: true,
        }),
      );
      console.log('  + shop settings (shipping 45,000 / free over 500,000)');
    }

    console.log('\nbanners');
    for (const banner of BANNERS) {
      const existing = await bannerRepository.findOne({
        where: { title: banner.title },
      });
      if (existing) {
        console.log(`  = ${banner.title}`);
        continue;
      }
      await bannerRepository.save(bannerRepository.create(banner));
      console.log(`  + ${banner.title}${banner.isActive ? '' : ' (inactive)'}`);
    }

    console.log('\ndiscounts');
    for (const { note, ...discount } of DISCOUNTS) {
      const existing = await discountRepository.findOne({
        where: { code: discount.code },
      });
      if (existing) {
        console.log(`  = ${discount.code}`);
        continue;
      }
      await discountRepository.save(discountRepository.create(discount));
      console.log(`  + ${discount.code} — ${note}`);
    }

    // A cover for the first few products, so the catalogue is not a wall of
    // placeholders. The product seed deliberately creates none.
    console.log('\nproduct images');
    let added = 0;
    for (const product of products.slice(0, 8)) {
      const has = await imageRepository.count({
        where: { productId: product.id },
      });
      if (has) continue;

      await imageRepository.save([
        imageRepository.create({
          productId: product.id,
          url: photo(`product-${product.id.slice(0, 8)}-a`, 800, 800),
          sortOrder: 0,
        }),
        imageRepository.create({
          productId: product.id,
          url: photo(`product-${product.id.slice(0, 8)}-b`, 800, 800),
          sortOrder: 1,
        }),
      ]);
      added += 2;
    }
    console.log(added ? `  + ${added} images` : '  = already there');

    console.log('\ncustomers');
    const customers: User[] = [];
    for (const seed of CUSTOMERS) {
      let user = await userRepository.findOne({
        where: { phoneNumber: seed.phoneNumber },
      });

      if (user) {
        console.log(`  = ${seed.phoneNumber} (${seed.fullName})`);
      } else {
        user = await userRepository.save(
          userRepository.create({
            phoneNumber: seed.phoneNumber,
            fullName: seed.fullName,
            role: Role.User,
          }),
        );
        console.log(`  + ${seed.phoneNumber} (${seed.fullName})`);
      }
      customers.push(user);

      if (!seed.address) continue;

      const hasAddress = await addressRepository.count({
        where: { userId: user.id },
      });
      if (!hasAddress) {
        await addressRepository.save(
          addressRepository.create({
            ...seed.address,
            userId: user.id,
            // Only one row per user may carry this — there is a partial unique
            // index on it — and the seed gives each customer exactly one.
            isDefault: true,
          }),
        );
        console.log(`      + address in ${seed.address.city}`);
      }
    }

    // A cart left mid-shop, so the cart page has something on it before the
    // frontend can add anything. Only the first customer gets one.
    console.log('\ncart');
    const cartOwner = customers[0];
    const cartPicks = sellable
      .filter(({ varient }) => varient.stock > 0)
      .slice(0, 3);
    for (const [index, { product, varient }] of cartPicks.entries()) {
      const existing = await cartRepository.findOne({
        where: { userId: cartOwner.id, productVarientId: varient.id },
      });
      if (existing) {
        console.log(`  = ${product.name}`);
        continue;
      }
      await cartRepository.save(
        cartRepository.create({
          userId: cartOwner.id,
          productVarientId: varient.id,
          quantity: index === 0 ? 2 : 1,
        }),
      );
      console.log(`  + ${product.name} x${index === 0 ? 2 : 1}`);
    }

    console.log('\norders');
    const settings = await settingsRepository.findOne({ where: { id: true } });
    const shippingCost = Number(settings?.shippingCost ?? '0');
    const freeOver = Number(settings?.freeShippingThreshold ?? '0') || null;

    for (const [index, seed] of ORDERS.entries()) {
      const existing = await orderRepository.findOne({
        where: { orderNumber: seed.orderNumber },
      });
      if (existing) {
        console.log(`  = ${seed.orderNumber} (${seed.status})`);
        continue;
      }

      const customer = customers[seed.customerIndex];
      const customerAddress = await addressRepository.findOne({
        where: { userId: customer.id },
      });
      if (!customerAddress) {
        console.log(
          `  ! ${seed.orderNumber} skipped — customer has no address`,
        );
        continue;
      }

      // Rotate through the catalogue so the orders are not all the same thing.
      const picks = Array.from({ length: seed.itemCount }, (_, i) => {
        return sellable[(index * 2 + i) % sellable.length];
      });

      const items = picks.map(({ product, varient }, i) => {
        const unitPrice = effectivePrice(varient);
        const quantity = i === 0 ? 1 : (i % 2) + 1;

        return {
          varientId: varient.id,
          productName: product.name,
          varientLabel: varientLabel(varient),
          imageUrl: null as string | null,
          unitPrice: money(unitPrice),
          quantity,
          lineTotal: money(unitPrice * quantity),
        };
      });

      const subTotal = items.reduce(
        (sum, item) => sum + Number(item.lineTotal),
        0,
      );

      const discount = seed.discountCode
        ? await discountRepository.findOne({
            where: { code: seed.discountCode },
          })
        : null;

      // Recomputed here the same way the order transaction does it, rather
      // than hardcoded — a seeded total that disagrees with its own line items
      // is a bug the frontend would faithfully display.
      let discountTotal = 0;
      if (discount) {
        discountTotal =
          discount.type === DiscountType.Percent
            ? Math.round((subTotal * Number(discount.value)) / 100)
            : Math.min(Number(discount.value), subTotal);
      }

      const afterDiscount = subTotal - discountTotal;
      const shippingTotal =
        freeOver && afterDiscount >= freeOver ? 0 : shippingCost;
      const grandTotal = afterDiscount + shippingTotal;

      const paidStatuses = [
        OrderStatus.Paid,
        OrderStatus.Processing,
        OrderStatus.Shipped,
        OrderStatus.Delivered,
        OrderStatus.Refunded,
      ];
      const paidAt = paidStatuses.includes(seed.status)
        ? new Date(Date.now() - (index + 1) * 36e5)
        : null;

      const order = await orderRepository.save(
        orderRepository.create({
          orderNumber: seed.orderNumber,
          userId: customer.id,
          status: seed.status,
          subTotal: money(subTotal),
          discountTotal: money(discountTotal),
          shippingTotal: money(shippingTotal),
          grandTotal: money(grandTotal),
          discountId: discount?.id ?? null,
          discountCode: discount?.code ?? null,
          addressId: customerAddress.id,
          // Snapshotted, not joined: editing the address later must not
          // rewrite what this order was shipped to.
          shipFirstName: customerAddress.firstName,
          shipLastName: customerAddress.lastName,
          shipPhone: customerAddress.phoneNumber,
          shipProvince: customerAddress.province,
          shipCity: customerAddress.city,
          shipAddress: customerAddress.address,
          shipPostalCode: customerAddress.postalCode,
          paymentMethod: PaymentMethod.Online,
          trackingNumber: seed.trackingNumber,
          note: seed.note,
          paidAt,
          items: items.map((item) =>
            Object.assign(new OrderItem(), item),
          ) as OrderItem[],
        }),
      );

      if (seed.payment) {
        await paymentRepository.save(
          paymentRepository.create({
            orderId: order.id,
            userId: customer.id,
            provider: PaymentProvider.Mock,
            // Unique per (provider, reference) — the idempotency index.
            reference: `MOCK-SEED-${seed.orderNumber}`,
            amount: money(grandTotal),
            status: seed.payment.status,
            refId: seed.payment.refId,
            paidAt:
              seed.payment.status === PaymentStatus.Success ? paidAt : null,
          }),
        );
      }

      console.log(
        `  + ${seed.orderNumber} ${seed.status.padEnd(16)} ${items.length} item(s)  ${money(grandTotal)} تومان`,
      );
    }

    console.log('\n--- totals ---');
    const counts: [string, number][] = [
      ['settings', await settingsRepository.count()],
      ['banners', await bannerRepository.count()],
      ['discounts', await discountRepository.count()],
      ['users', await userRepository.count()],
      ['addresses', await addressRepository.count()],
      ['cart items', await cartRepository.count()],
      ['products', await productRepository.count()],
      ['varients', await varientRepository.count()],
      ['images', await imageRepository.count()],
      ['orders', await orderRepository.count()],
      ['order items', await repo(OrderItem).count()],
      ['payments', await paymentRepository.count()],
    ];
    for (const [name, count] of counts) {
      console.log(`  ${String(count).padStart(4)}  ${name}`);
    }

    console.log(
      '\nStock was not decremented for the seeded orders — they are display' +
        '\ndata, not real checkouts, and the catalogue stays fully in stock.',
    );
    console.log('Log in as a customer with 09120000001 (cart + 4 orders).');
  } finally {
    await app.close();
  }
}

seedDemo().catch((error) => {
  console.error(error);
  process.exit(1);
});
