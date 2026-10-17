import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Category } from '../modules/category/entities/category.entity';
import { Product } from '../modules/product/entities/product.entity';
import { ProductVarient } from '../modules/product/entities/product-varient.entity';
import { slugify } from '../common/utils/slug.util';

// Sample products for local development. Deliberately covers every shape the
// API has to handle: no options, colours only, sizes only, both, a discount,
// sold out, an unpublished product and a discontinued variant.
//
// Run the category seed first — products attach by category name.
//
//   pnpm seed:categories && pnpm seed:products
//
// No images: they are optional, so this also exercises the null cover.
type SeedVarient = {
  color?: string;
  colorCode?: string;
  size?: string;
  price: string;
  discountPercent?: string;
  stock?: number;
  isActive?: boolean;
};

type SeedProduct = {
  name: string;
  category: string;
  content?: string;
  isActive?: boolean;
  varients: SeedVarient[];
};

const PRODUCTS: SeedProduct[] = [
  {
    // No options at all: one variant, no colour, no size.
    name: 'هدفون بی‌سیم مدل ایر ۳',
    category: 'هدفون و هندزفری',
    content: 'هدفون بی‌سیم با نویز کنسلینگ فعال و ۳۰ ساعت پخش موسیقی.',
    varients: [{ price: '4500000', stock: 25 }],
  },
  {
    // Colours only.
    name: 'موبایل گلکسی اس ۲۴',
    category: 'موبایل',
    content: 'نمایشگر ۶.۲ اینچی، ۲۵۶ گیگابایت حافظه داخلی.',
    varients: [
      { color: 'مشکی', colorCode: '#1a1a1a', price: '52000000', stock: 8 },
      { color: 'بنفش', colorCode: '#7c3aed', price: '52000000', stock: 3 },
      // Sold out, but the other colours keep the card in stock.
      { color: 'کرم', colorCode: '#f5e6c8', price: '52000000', stock: 0 },
    ],
  },
  {
    // Sizes only, one of them discounted — the "from" price comes from it.
    name: 'کفش رانینگ مدل استرایک',
    category: 'ورزش و سفر',
    content: 'کفش دویدن با زیره فوم و رویه مش تنفسی.',
    varients: [
      { size: '41', price: '3200000', stock: 5 },
      { size: '42', price: '3200000', discountPercent: '15', stock: 12 },
      { size: '43', price: '3200000', stock: 0 },
    ],
  },
  {
    // Colour AND size: a full grid, plus one discontinued combination.
    name: 'تی‌شرت نخی یقه گرد',
    category: 'مردانه',
    content: 'تی‌شرت آستین کوتاه، ۱۰۰٪ پنبه.',
    varients: [
      {
        color: 'سفید',
        colorCode: '#ffffff',
        size: 'M',
        price: '890000',
        stock: 20,
      },
      {
        color: 'سفید',
        colorCode: '#ffffff',
        size: 'L',
        price: '890000',
        stock: 14,
      },
      {
        color: 'قرمز',
        colorCode: '#e02424',
        size: 'M',
        price: '950000',
        discountPercent: '10',
        stock: 7,
      },
      {
        color: 'قرمز',
        colorCode: '#e02424',
        size: 'L',
        price: '950000',
        discountPercent: '10',
        stock: 0,
      },
      // Discontinued: hidden from the public routes, still visible to admin.
      {
        color: 'سبز',
        colorCode: '#16a34a',
        size: 'M',
        price: '890000',
        stock: 4,
        isActive: false,
      },
    ],
  },
  {
    // Everything sold out: still listed, but inStock is false.
    name: 'ساعت هوشمند مدل ونچر',
    category: 'ساعت هوشمند',
    varients: [
      { color: 'نقره‌ای', colorCode: '#c0c0c0', price: '7900000', stock: 0 },
      { color: 'مشکی', colorCode: '#1a1a1a', price: '7900000', stock: 0 },
    ],
  },
  {
    // Heavy discount, for checking the finalPrice maths.
    name: 'جاروبرقی مدل سیکلون',
    category: 'جاروبرقی',
    content: 'جاروبرقی ۲۲۰۰ وات با فیلتر هپا.',
    varients: [{ price: '12500000', discountPercent: '40', stock: 6 }],
  },
  {
    // Unpublished: must not appear on GET /products at all.
    name: 'لپ‌تاپ مدل پرو ۱۶ به‌زودی',
    category: 'لپ‌تاپ',
    isActive: false,
    varients: [{ price: '98000000', stock: 2 }],
  },
  {
    // No category: categoryId is nullable, the product still lists.
    name: 'ماگ سرامیکی',
    category: '',
    varients: [
      { color: 'آبی', colorCode: '#2563eb', price: '450000', stock: 30 },
      { color: 'سفید', colorCode: '#ffffff', price: '450000', stock: 0 },
    ],
  },

  // --- the rest are plain, active products, to fill the catalogue out ---
  {
    name: 'لپ‌تاپ اولترابوک مدل ایر ۱۴',
    category: 'لپ‌تاپ',
    content: 'پردازنده نسل سیزدهم، ۱۶ گیگابایت رم، ۵۱۲ گیگابایت اس‌اس‌دی.',
    varients: [
      { color: 'خاکستری', colorCode: '#6b7280', price: '62000000', stock: 4 },
      {
        color: 'نقره‌ای',
        colorCode: '#c0c0c0',
        price: '62000000',
        discountPercent: '5',
        stock: 6,
      },
    ],
  },
  {
    name: 'موبایل مدل نوا ۱۲',
    category: 'موبایل',
    content: 'دوربین ۵۰ مگاپیکسلی و باتری ۵۰۰۰ میلی‌آمپری.',
    varients: [
      { color: 'سبز', colorCode: '#16a34a', price: '18500000', stock: 15 },
      { color: 'مشکی', colorCode: '#1a1a1a', price: '18500000', stock: 22 },
      {
        color: 'آبی',
        colorCode: '#2563eb',
        price: '19500000',
        discountPercent: '8',
        stock: 9,
      },
    ],
  },
  {
    name: 'هندزفری سیمی مدل بیسیک',
    category: 'هدفون و هندزفری',
    varients: [{ price: '390000', stock: 120 }],
  },
  {
    name: 'ساعت هوشمند مدل فیت بند',
    category: 'ساعت هوشمند',
    content: 'ردیاب ضربان قلب و خواب، مقاوم در برابر آب.',
    varients: [
      { color: 'مشکی', colorCode: '#1a1a1a', price: '2900000', stock: 18 },
      {
        color: 'صورتی',
        colorCode: '#ec4899',
        price: '2900000',
        discountPercent: '20',
        stock: 11,
      },
    ],
  },
  {
    name: 'یخچال ساید بای ساید آرکتیک',
    category: 'یخچال و فریزر',
    content: 'یخچال فریزر دوقلو با آبسردکن و یخساز اتوماتیک.',
    varients: [
      { color: 'استیل', colorCode: '#9ca3af', price: '185000000', stock: 3 },
      { color: 'سفید', colorCode: '#ffffff', price: '178000000', stock: 2 },
    ],
  },
  {
    name: 'ماشین لباسشویی ۸ کیلویی واش پرو',
    category: 'ماشین لباسشویی',
    content: 'موتور اینورتر، ۱۴ برنامه شستشو.',
    varients: [
      {
        price: '96000000',
        discountPercent: '12',
        stock: 5,
      },
    ],
  },
  {
    name: 'اجاق گاز پنج شعله مدل شعله طلایی',
    category: 'اجاق گاز',
    varients: [
      { color: 'مشکی', colorCode: '#1a1a1a', price: '41000000', stock: 7 },
    ],
  },
  {
    name: 'شلوار جین مردانه مدل کلاسیک',
    category: 'مردانه',
    content: 'جین کشی با فرم راسته.',
    varients: [
      {
        color: 'آبی',
        colorCode: '#1e40af',
        size: '30',
        price: '2400000',
        stock: 6,
      },
      {
        color: 'آبی',
        colorCode: '#1e40af',
        size: '32',
        price: '2400000',
        stock: 11,
      },
      {
        color: 'آبی',
        colorCode: '#1e40af',
        size: '34',
        price: '2400000',
        stock: 8,
      },
      {
        color: 'مشکی',
        colorCode: '#1a1a1a',
        size: '32',
        price: '2600000',
        discountPercent: '10',
        stock: 5,
      },
      {
        color: 'مشکی',
        colorCode: '#1a1a1a',
        size: '34',
        price: '2600000',
        discountPercent: '10',
        stock: 0,
      },
    ],
  },
  {
    name: 'مانتو زنانه مدل بهاره',
    category: 'زنانه',
    content: 'مانتو جلو باز با پارچه لینن.',
    varients: [
      {
        color: 'کرم',
        colorCode: '#f5e6c8',
        size: '38',
        price: '3100000',
        stock: 9,
      },
      {
        color: 'کرم',
        colorCode: '#f5e6c8',
        size: '40',
        price: '3100000',
        stock: 4,
      },
      {
        color: 'سرمه‌ای',
        colorCode: '#1e3a8a',
        size: '38',
        price: '3100000',
        stock: 7,
      },
      {
        color: 'سرمه‌ای',
        colorCode: '#1e3a8a',
        size: '40',
        price: '3100000',
        discountPercent: '15',
        stock: 12,
      },
    ],
  },
  {
    name: 'ست بلوز و شلوار بچگانه',
    category: 'بچگانه',
    varients: [
      { size: '۲ تا ۳ سال', price: '1200000', stock: 14 },
      { size: '۴ تا ۵ سال', price: '1350000', stock: 10 },
      { size: '۶ تا ۷ سال', price: '1450000', discountPercent: '10', stock: 6 },
    ],
  },
  {
    name: 'کرم مرطوب‌کننده مدل آکوا',
    category: 'مراقبت پوست و مو',
    content: 'مناسب پوست خشک و حساس، حجم ۵۰ میلی‌لیتر.',
    varients: [{ price: '890000', discountPercent: '25', stock: 40 }],
  },
  {
    name: 'رژ لب جامد مدل ولوت',
    category: 'لوازم آرایشی',
    varients: [
      { color: 'قرمز', colorCode: '#dc2626', price: '640000', stock: 25 },
      { color: 'صورتی', colorCode: '#ec4899', price: '640000', stock: 18 },
      { color: 'نود', colorCode: '#d8a48f', price: '640000', stock: 0 },
    ],
  },
  {
    name: 'کوله پشتی کوهنوردی ۴۰ لیتری',
    category: 'ورزش و سفر',
    content: 'پارچه ضد آب با تسمه‌های قابل تنظیم.',
    varients: [
      { color: 'سبز ارتشی', colorCode: '#4d7c0f', price: '4200000', stock: 8 },
      {
        color: 'مشکی',
        colorCode: '#1a1a1a',
        price: '4200000',
        discountPercent: '18',
        stock: 13,
      },
    ],
  },
  {
    name: 'دمبل ۵ کیلوگرمی جفتی',
    category: 'ورزش و سفر',
    varients: [{ price: '1850000', stock: 20 }],
  },
  {
    name: 'دفتر ۱۰۰ برگ طرح مینیمال',
    category: 'کتاب و لوازم تحریر',
    varients: [
      { color: 'سفید', colorCode: '#ffffff', price: '180000', stock: 60 },
      { color: 'مشکی', colorCode: '#1a1a1a', price: '180000', stock: 45 },
    ],
  },
  {
    name: 'خودکار رنگی بسته ۱۲ عددی',
    category: 'کتاب و لوازم تحریر',
    varients: [{ price: '320000', discountPercent: '10', stock: 35 }],
  },
];

async function seedProducts() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const categoryRepository = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );
    const productRepository = app.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    const varientRepository = app.get<Repository<ProductVarient>>(
      getRepositoryToken(ProductVarient),
    );

    for (const seed of PRODUCTS) {
      const slug = slugify(seed.name);

      // Idempotent: slug is unique, so a second run reuses the row instead of
      // inserting a duplicate or overwriting edits made while testing.
      const existing = await productRepository.findOne({
        where: { slug },
        select: { id: true },
      });
      if (existing) {
        console.log(`  = ${seed.name} (already there)`);
        continue;
      }

      let categoryId: string | null = null;
      if (seed.category) {
        const category = await categoryRepository.findOne({
          where: { slug: slugify(seed.category) },
          select: { id: true },
        });
        if (!category) {
          console.log(`  ! ${seed.name} — no category "${seed.category}"`);
          continue;
        }
        categoryId = category.id;
      }

      await productRepository.save(
        productRepository.create({
          name: seed.name,
          slug,
          content: seed.content ?? null,
          categoryId,
          isActive: seed.isActive ?? true,
          varients: seed.varients.map((varient) =>
            Object.assign(new ProductVarient(), {
              color: varient.color ?? null,
              colorCode: varient.colorCode ?? null,
              size: varient.size ?? null,
              price: varient.price,
              discountPercent: varient.discountPercent ?? '0',
              stock: varient.stock ?? 0,
              isActive: varient.isActive ?? true,
            }),
          ),
        }),
      );
      console.log(`  + ${seed.name} (${seed.varients.length} varients)`);
    }

    // A product in a deactivated category is hidden from the public routes, so
    // say which ones rather than leaving you wondering where they went.
    const usedSlugs = [
      ...new Set(PRODUCTS.map((p) => p.category).filter(Boolean)),
    ].map((name) => slugify(name));
    const inactive = await categoryRepository.find({
      where: { slug: In(usedSlugs), isActive: false },
      select: { name: true },
    });
    if (inactive.length) {
      console.log(
        `
  ! deactivated categories, their products stay hidden from GET /products: ${inactive
    .map((category) => category.name)
    .join('، ')}`,
      );
    }

    const products = await productRepository.count();
    const varients = await varientRepository.count();
    console.log(`\nDone. ${products} products, ${varients} varients.`);
  } finally {
    await app.close();
  }
}

seedProducts().catch((error) => {
  console.error(error);
  process.exit(1);
});
