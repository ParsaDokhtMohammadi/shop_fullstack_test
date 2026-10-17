import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppModule } from '../app.module';
import { Category } from '../modules/category/entities/category.entity';
import { slugify } from '../common/utils/slug.util';

// Sample catalogue for local development. Two levels, matching the schema:
// a root with no children is a valid category on its own.
//
//   pnpm seed:categories
const TREE: { name: string; children?: string[] }[] = [
  {
    name: 'کالای دیجیتال',
    children: ['موبایل', 'لپ‌تاپ', 'هدفون و هندزفری', 'ساعت هوشمند'],
  },
  {
    name: 'لوازم خانگی',
    children: ['یخچال و فریزر', 'ماشین لباسشویی', 'جاروبرقی', 'اجاق گاز'],
  },
  {
    name: 'پوشاک',
    children: ['مردانه', 'زنانه', 'بچگانه'],
  },
  {
    name: 'زیبایی و سلامت',
    children: ['لوازم آرایشی', 'مراقبت پوست و مو'],
  },
  // Deliberately childless: proves a category needs no subcategories.
  { name: 'ورزش و سفر' },
  { name: 'کتاب و لوازم تحریر' },
];

// Idempotent: the slug is unique, so an existing row is reused rather than
// re-inserted. Re-running the seed must never duplicate or overwrite.
async function upsert(
  repository: Repository<Category>,
  name: string,
  parentId: string | null,
  sortOrder: number,
): Promise<Category> {
  const slug = slugify(name);

  const existing = await repository.findOne({ where: { slug } });
  if (existing) {
    console.log(`  = ${name} (already there)`);

    return existing;
  }

  const category = await repository.save(
    repository.create({
      name,
      slug,
      parentId,
      sortOrder,
      isActive: true,
    }),
  );
  console.log(`  + ${name}`);

  return category;
}

async function seedCategories() {
  // Boots the app's providers without opening an HTTP port, so the seed reuses
  // the same entities and connection as the running API.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const repository = app.get<Repository<Category>>(
      getRepositoryToken(Category),
    );

    for (const [index, root] of TREE.entries()) {
      const parent = await upsert(repository, root.name, null, index);

      for (const [childIndex, childName] of (root.children ?? []).entries()) {
        await upsert(repository, childName, parent.id, childIndex);
      }
    }

    const total = await repository.count();
    console.log(`\nDone. ${total} categories in the database.`);
  } finally {
    await app.close();
  }
}

seedCategories().catch((error) => {
  console.error(error);
  process.exit(1);
});
