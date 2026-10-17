import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, IsNull, Not, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVarient } from './entities/product-varient.entity';
import { ProductImage } from './entities/product-image.entity';
import { CategoryService } from '../category/category.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVarientDto } from './dto/create-varient.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVarientDto } from './dto/update-varient.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { ReorderImagesDto } from './dto/reorder-images.dto';
import { paginated } from '../../common/dto';
import { PRODUCT_MESSAGES, VALIDATION_MESSAGES } from '../../common/messages';
import { slugify } from '../../common/utils/slug.util';
import { finalPrice, lowestPrice } from '../../common/utils/price.util';
import {
  deleteUploadedFile,
  saveProductImage,
} from '../../common/utils/image.util';
import { MAX_PRODUCT_IMAGES } from '../../config/multer.config';

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVarient)
    private readonly varientRepository: Repository<ProductVarient>,
    @InjectRepository(ProductImage)
    private readonly imageRepository: Repository<ProductImage>,
    private readonly categoryService: CategoryService,
  ) {}

  async create(dto: CreateProductDto) {
    // slugify keeps only letters and digits, so a name made of nothing else —
    // "+++" or "🙂🙂" — comes back empty. Left unchecked the first such
    // product takes the empty slug, the next one collides with it on a slug
    // nobody typed, and neither is reachable at /products/:slug.
    const slug = slugify(dto.slug ?? dto.name);
    if (!slug)
      throw new BadRequestException(VALIDATION_MESSAGES.SLUG_NOT_DERIVABLE);

    const existing = await this.productRepository.findOne({
      where: { slug },
      select: { id: true },
    });
    if (existing) throw new ConflictException(PRODUCT_MESSAGES.SLUG_TAKEN);
    if (dto.categoryId) {
      const exists = await this.categoryService.existsById(dto.categoryId);
      if (!exists)
        throw new NotFoundException(PRODUCT_MESSAGES.CATEGORY_NOT_FOUND);
    }
    this.assertVarientsAreUnique(dto.varients);
    const product = await this.productRepository.save(
      this.productRepository.create({
        name: dto.name,
        slug,
        content: dto.content ?? null,
        categoryId: dto.categoryId ?? null,
        // Defaults to published, but false is honoured: that is how a product
        // is staged — created unpublished, given its images and the rest of
        // its variants, then published with PATCH :id/toggle. Publishing
        // cannot produce an unbuyable listing either way, because the DTO
        // already requires at least one variant.
        isActive: dto.isActive ?? true,
        varients: dto.varients.map((varient) =>
          Object.assign(new ProductVarient(), {
            color: varient.color ?? null,
            colorCode: varient.colorCode ?? null,
            size: varient.size ?? null,
            price: varient.price,
            discountPercent: varient.discountPercent ?? '0',
            stock: varient.stock ?? 0,
            isActive: true,
          }),
        ),
      }),
    );

    return { message: PRODUCT_MESSAGES.CREATED, product };
  }

  // undefined = not sent, leave it alone. null = clear it (content, categoryId).
  async update(id: string, dto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(PRODUCT_MESSAGES.NOT_FOUND);

    // The slug only changes when one is sent. Renaming a product does not
    // regenerate it, so a typo fix never breaks links already shared.
    if (dto.slug) {
      const slug = slugify(dto.slug);
      if (!slug)
        throw new BadRequestException(VALIDATION_MESSAGES.SLUG_NOT_DERIVABLE);

      const existing = await this.productRepository.findOne({
        where: { slug, id: Not(id) },
        select: { id: true },
      });
      if (existing) throw new ConflictException(PRODUCT_MESSAGES.SLUG_TAKEN);
      product.slug = slug;
    }

    if (dto.categoryId) {
      const exists = await this.categoryService.existsById(dto.categoryId);
      if (!exists)
        throw new NotFoundException(PRODUCT_MESSAGES.CATEGORY_NOT_FOUND);
    }

    if (dto.name) product.name = dto.name;
    if (dto.content !== undefined) product.content = dto.content;
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId;

    const saved = await this.productRepository.save(product);

    return { message: PRODUCT_MESSAGES.UPDATED, product: saved };
  }

  // Publish / unpublish. This is also the product's soft delete.
  async toggleActive(id: string) {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) throw new NotFoundException(PRODUCT_MESSAGES.NOT_FOUND);

    // A published product with no active variant is a listing nobody can buy.
    if (!product.isActive) {
      const activeVarients = await this.varientRepository.count({
        where: { productId: id, isActive: true },
      });
      if (activeVarients === 0)
        throw new BadRequestException(PRODUCT_MESSAGES.NO_ACTIVE_VARIENT);
    }

    product.isActive = !product.isActive;
    const saved = await this.productRepository.save(product);

    return {
      message: saved.isActive
        ? PRODUCT_MESSAGES.ACTIVATED
        : PRODUCT_MESSAGES.DEACTIVATED,
      product: saved,
    };
  }

  async createVarient(productId: string, dto: CreateVarientDto) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(PRODUCT_MESSAGES.NOT_FOUND);

    // Same colour/size pair as an existing variant, inactive ones included —
    // a discontinued variant should be switched back on, not duplicated.
    // A missing colour or size is NULL in the DB, and `= NULL` never matches
    // in SQL, so it needs IsNull().
    const duplicate = await this.varientRepository.findOne({
      where: {
        productId,
        color: dto.color ?? IsNull(),
        size: dto.size ?? IsNull(),
      },
      select: { id: true },
    });
    if (duplicate)
      throw new ConflictException(PRODUCT_MESSAGES.VARIENT_DUPLICATE);

    const varient = await this.varientRepository.save(
      this.varientRepository.create({
        productId,
        color: dto.color ?? null,
        colorCode: dto.colorCode ?? null,
        size: dto.size ?? null,
        price: dto.price,
        discountPercent: dto.discountPercent ?? '0',
        stock: dto.stock ?? 0,
        isActive: true,
      }),
    );

    return { message: PRODUCT_MESSAGES.VARIENT_CREATED, varient };
  }

  // undefined = not sent, leave it alone. null = clear it (color, colorCode, size).
  async updateVarient(id: string, dto: UpdateVarientDto) {
    const varient = await this.varientRepository.findOne({ where: { id } });
    if (!varient)
      throw new NotFoundException(PRODUCT_MESSAGES.VARIENT_NOT_FOUND);

    const color = dto.color !== undefined ? dto.color : varient.color;
    const size = dto.size !== undefined ? dto.size : varient.size;

    // Only re-check uniqueness when the colour/size pair actually changes.
    if (color !== varient.color || size !== varient.size) {
      const duplicate = await this.varientRepository.findOne({
        where: {
          id: Not(id),
          productId: varient.productId,
          color: color ?? IsNull(),
          size: size ?? IsNull(),
        },
        select: { id: true },
      });
      if (duplicate)
        throw new ConflictException(PRODUCT_MESSAGES.VARIENT_DUPLICATE);
    }

    varient.color = color;
    varient.size = size;
    if (dto.colorCode !== undefined) varient.colorCode = dto.colorCode;
    // No colour means no swatch.
    if (color === null) varient.colorCode = null;
    // Required columns: a null here is ignored rather than written.
    if (dto.price) varient.price = dto.price;
    if (dto.discountPercent) varient.discountPercent = dto.discountPercent;
    if (dto.stock != null) varient.stock = dto.stock;

    const saved = await this.varientRepository.save(varient);

    return { message: PRODUCT_MESSAGES.VARIENT_UPDATED, varient: saved };
  }

  // Discontinue / bring back a variant. This is the variant's soft delete.
  async toggleVarientActive(id: string) {
    const varient = await this.varientRepository.findOne({ where: { id } });
    if (!varient)
      throw new NotFoundException(PRODUCT_MESSAGES.VARIENT_NOT_FOUND);

    // Turning off the last active variant of a published product would leave a
    // live listing nobody can buy. Unpublish the product first.
    const productIsActive = await this.productRepository.exists({
      where: { id: varient.productId, isActive: true },
    });
    if (varient.isActive && productIsActive) {
      const activeVarients = await this.varientRepository.count({
        where: { productId: varient.productId, isActive: true },
      });
      if (activeVarients === 1)
        throw new BadRequestException(PRODUCT_MESSAGES.LAST_ACTIVE_VARIENT);
    }

    varient.isActive = !varient.isActive;
    const saved = await this.varientRepository.save(varient);

    return {
      message: saved.isActive
        ? PRODUCT_MESSAGES.VARIENT_ACTIVATED
        : PRODUCT_MESSAGES.VARIENT_DEACTIVATED,
      varient: saved,
    };
  }

  // Public list. Only active products, and only their active variants: the
  // relation condition also filters the joined rows, so a product whose every
  // variant is discontinued drops out of the list entirely.
  async findAll(dto: ProductQueryDto) {
    const categoryIds = dto.categoryId
      ? await this.categoryService.idsWithChildren(dto.categoryId)
      : null;

    const base = {
      isActive: true,
      varients: { isActive: true },
      ...(dto.search && { name: ILike(`%${dto.search}%`) }),
      ...(categoryIds && { categoryId: In(categoryIds) }),
    };

    const [products, total] = await this.productRepository.findAndCount({
      where: this.publicWhere(base, !dto.categoryId),
      relations: { varients: true, images: true },
      // No `images: { sortOrder: 'ASC' }` here on purpose — see sortCollections.
      order: this.orderBy(dto.sort),
      skip: dto.skip,
      take: dto.take,
    });

    return {
      message: PRODUCT_MESSAGES.FETCHED,
      ...paginated(
        products.map((product) => this.toCard(sortCollections(product))),
        total,
        dto,
      ),
    };
  }

  // Public detail. Active variants only, images cover-first.
  async findOne(slug: string) {
    const product = await this.productRepository.findOne({
      where: this.publicWhere({
        slug,
        isActive: true,
        varients: { isActive: true },
      }),
      relations: { category: true, varients: true, images: true },
      order: { varients: { createdAt: 'ASC' }, images: { sortOrder: 'ASC' } },
    });
    if (!product) throw new NotFoundException(PRODUCT_MESSAGES.NOT_FOUND);

    return {
      message: PRODUCT_MESSAGES.FETCHED_ONE,
      product: {
        ...product,
        // Each variant carries what it actually sells for, so the frontend
        // never recomputes a discount.
        varients: product.varients.map((varient) => ({
          ...varient,
          finalPrice: finalPrice(varient.price, varient.discountPercent),
        })),
      },
    };
  }

  // A deactivated category hides its products from the shop. The condition
  // joins to "category", which would also drop products that have none, so
  // those get their own OR branch (an array of wheres is OR in TypeORM).
  // Deactivating a root already deactivates its children, so checking the
  // product's own category is enough.
  private publicWhere(
    base: FindOptionsWhere<Product>,
    includeUncategorised = true,
  ): FindOptionsWhere<Product>[] {
    const withCategory = { ...base, category: { isActive: true } };
    if (!includeUncategorised) return [withCategory];

    return [withCategory, { ...base, categoryId: IsNull() }];
  }

  // What a product card needs: a cover, a "from" price, and whether anything
  // is in stock. The full variant list belongs on the detail page.
  private toCard(product: Product) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      coverImage: product.images[0]?.url ?? null,
      priceFrom: lowestPrice(product.varients),
      inStock: product.varients.some((varient) => varient.stock > 0),
    };
  }

  private orderBy(sort: ProductSort) {
    if (sort === ProductSort.Oldest) return { createdAt: 'ASC' as const };
    if (sort === ProductSort.Name) return { name: 'ASC' as const };

    return { createdAt: 'DESC' as const };
  }

  // Appends after the existing images, so the current cover stays the cover.
  async addImages(productId: string, files: Express.Multer.File[]) {
    if (!files?.length)
      throw new BadRequestException(PRODUCT_MESSAGES.IMAGES_REQUIRED);

    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(PRODUCT_MESSAGES.NOT_FOUND);

    const existing = await this.imageRepository.find({
      where: { productId },
      select: { sortOrder: true },
    });
    if (existing.length + files.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        PRODUCT_MESSAGES.IMAGES_LIMIT(MAX_PRODUCT_IMAGES),
      );
    }

    // Files are written before the rows exist. If any step fails, remove what
    // was already written so no orphan files pile up in the upload folder.
    const urls: string[] = [];
    try {
      for (const file of files) urls.push(await saveProductImage(file));

      const start = existing.length
        ? Math.max(...existing.map((image) => image.sortOrder)) + 1
        : 0;
      const images = await this.imageRepository.save(
        urls.map((url, index) =>
          this.imageRepository.create({
            productId,
            url,
            sortOrder: start + index,
          }),
        ),
      );

      return { message: PRODUCT_MESSAGES.IMAGES_ADDED, images };
    } catch (error) {
      await Promise.all(urls.map((url) => deleteUploadedFile(url)));
      throw error;
    }
  }

  async deleteImage(productId: string, imageId: string) {
    const image = await this.imageRepository.findOne({
      where: { id: imageId, productId },
    });
    if (!image) throw new NotFoundException(PRODUCT_MESSAGES.IMAGE_NOT_FOUND);

    // Row first, file second: a leftover file is harmless, but a row pointing
    // at a missing file is a broken image in the shop.
    await this.imageRepository.remove(image);
    await deleteUploadedFile(image.url);

    return { message: PRODUCT_MESSAGES.IMAGE_DELETED };
  }

  // The frontend sends the full list after a drag-and-drop; index = sortOrder.
  async reorderImages(productId: string, dto: ReorderImagesDto) {
    const images = await this.imageRepository.find({
      where: { productId },
      select: { id: true },
    });
    if (!images.length)
      throw new NotFoundException(PRODUCT_MESSAGES.IMAGE_NOT_FOUND);

    // Must be exactly this product's images: a missing id would leave two
    // images sharing a sortOrder, a foreign one would steal another product's.
    const current = new Set(images.map((image) => image.id));
    const sameSet =
      dto.imageIds.length === current.size &&
      dto.imageIds.every((id) => current.has(id));
    if (!sameSet)
      throw new BadRequestException(PRODUCT_MESSAGES.IMAGES_ORDER_MISMATCH);

    // One transaction, so a failure halfway never leaves a half-applied order.
    await this.imageRepository.manager.transaction(async (manager) => {
      for (const [index, id] of dto.imageIds.entries()) {
        await manager.update(ProductImage, { id }, { sortOrder: index });
      }
    });

    const reordered = await this.imageRepository.find({
      where: { productId },
      order: { sortOrder: 'ASC' },
    });

    return { message: PRODUCT_MESSAGES.IMAGES_REORDERED, images: reordered };
  }

  // Admin list: inactive products and inactive variants included.
  async findAllForAdmin(dto: AdminProductQueryDto) {
    const [products, total] = await this.productRepository.findAndCount({
      where: {
        ...(dto.search && { name: ILike(`%${dto.search}%`) }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
      },
      relations: { category: true, varients: true, images: true },
      // Only scalar columns here on purpose — see sortCollections.
      order: { createdAt: 'DESC' },
      skip: dto.skip,
      take: dto.take,
    });

    return {
      message: PRODUCT_MESSAGES.FETCHED,
      ...paginated(products.map(sortCollections), total, dto),
    };
  }

  // Admin edit page: everything, inactive variants included.
  async findOneForAdmin(id: string) {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true, varients: true, images: true },
      order: { varients: { createdAt: 'ASC' }, images: { sortOrder: 'ASC' } },
    });
    if (!product) throw new NotFoundException(PRODUCT_MESSAGES.NOT_FOUND);

    return { message: PRODUCT_MESSAGES.FETCHED_ONE, product };
  }

  // Two variants with the same colour/size pair are the same thing twice —
  // the frontend picker cannot tell them apart and stock ends up split.
  private assertVarientsAreUnique(varients: CreateVarientDto[]) {
    const seen = new Set<string>();
    for (const varient of varients) {
      const key = `${varient.color ?? ''}|${varient.size ?? ''}`;
      if (seen.has(key))
        throw new BadRequestException(PRODUCT_MESSAGES.VARIENT_DUPLICATE);
      seen.add(key);
    }
  }

  // The cart's definition of "can this be bought", and it has to agree with
  // publicWhere above — a product the storefront 404s because its category was
  // deactivated must not still be addable by variant id, which is what a stale
  // cart, a bookmarked call or the "buy again" button on an old order sends.
  //
  // Same two branches as publicWhere, because an array of wheres is OR in
  // TypeORM: either the category is active, or there is no category at all. An
  // uncategorised product stays buyable; it was never hidden to begin with.
  findBuyableVarient(id: string): Promise<ProductVarient | null> {
    return this.varientRepository.findOne({
      where: [
        {
          id,
          isActive: true,
          product: { isActive: true, category: { isActive: true } },
        },
        {
          id,
          isActive: true,
          product: { isActive: true, categoryId: IsNull() },
        },
      ],
      relations: { product: true },
    });
  }

  // Cover image per product, one row per product instead of the whole gallery.
  // DISTINCT ON is Postgres picking the first row of each productId group,
  // and the ORDER BY decides which row that is.
  async findCoverImages(productIds: string[]): Promise<Map<string, string>> {
    if (!productIds.length) return new Map();

    const images = await this.imageRepository
      .createQueryBuilder('image')
      .distinctOn(['image.productId'])
      .where('image.productId IN (:...productIds)', { productIds })
      .orderBy('image.productId')
      .addOrderBy('image.sortOrder', 'ASC')
      .getMany();

    return new Map(images.map((image) => [image.productId, image.url]));
  }
}

// Sorts a loaded product's images and variants in memory, which is deliberate:
// the two paginated list queries must not put a joined collection's column in
// their `order`.
//
// TypeORM paginates a find that joins a to-many relation with a
// `SELECT DISTINCT <primary keys>, <every order-by column>` subquery. Add
// `images: { sortOrder: 'ASC' }` and sortOrder joins that distinct key, so the
// row being counted by LIMIT is one per image, not one per product: ?limit=3
// came back with two products. The short page then also broke the total,
// because TypeORM skips its COUNT query when a page comes back shorter than
// `take` and reports `skip + rows` instead — an admin saw 14 of 26 products.
//
// So the order stays scalar-only there and the collections are sorted here.
// The detail finds keep their relation order: no skip/take, no subquery.
const sortCollections = (product: Product): Product => {
  product.images?.sort((a, b) => a.sortOrder - b.sortOrder);
  product.varients?.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return product;
};
