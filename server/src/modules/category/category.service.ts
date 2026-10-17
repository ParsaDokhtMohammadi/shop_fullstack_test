import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Not, Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  CATEGORY_MESSAGES,
  COMMON_MESSAGES,
  VALIDATION_MESSAGES,
} from '../../common/messages';
import { slugify } from '../../common/utils/slug.util';

// A category plus the categories nested under it.
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateCategoryDto) {
    // slugify keeps only letters and digits, so a name made of nothing else —
    // "+++" or "🙂🙂" — comes back empty. Left unchecked the first such
    // category takes the empty slug, the next one collides with it on a slug
    // nobody typed, and neither is reachable at /categories/:slug.
    const slug = slugify(dto.slug ?? dto.name);
    if (!slug)
      throw new BadRequestException(VALIDATION_MESSAGES.SLUG_NOT_DERIVABLE);

    const existing = await this.categoryRepository.findOne({
      where: { slug },
      select: { id: true },
    });
    if (existing) throw new ConflictException(CATEGORY_MESSAGES.SLUG_TAKEN);

    if (dto.parentId) {
      const parent = await this.assertCanBeChildOf(dto.parentId);
      if (!parent.isActive && (dto.isActive ?? true)) {
        throw new BadRequestException(CATEGORY_MESSAGES.PARENT_INACTIVE);
      }
    }

    const category = await this.categoryRepository.save(
      this.categoryRepository.create({
        name: dto.name,
        slug,
        parentId: dto.parentId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );

    return { message: CATEGORY_MESSAGES.CREATED, category };
  }

  async toggleActive(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException(COMMON_MESSAGES.NOTFOUND);

    const nextActive = !category.isActive;
    if (nextActive && category.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: category.parentId },
        select: { isActive: true },
      });
      if (parent && !parent.isActive) {
        throw new BadRequestException(CATEGORY_MESSAGES.PARENT_INACTIVE);
      }
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Category);

      category.isActive = nextActive;
      const saved = await repository.save(category);
      if (!nextActive) {
        await repository.update({ parentId: id }, { isActive: false });
      }

      return saved;
    });

    return {
      message: saved.isActive
        ? CATEGORY_MESSAGES.ACTIVATED
        : CATEGORY_MESSAGES.DEACTIVATED,
      category: saved,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException(COMMON_MESSAGES.NOTFOUND);

    if (dto.slug || (dto.name && !dto.slug)) {
      let slug = '';
      if (dto.slug) slug = slugify(dto.slug);
      else if (dto.name) slug = slugify(dto.name);
      if (!slug)
        throw new BadRequestException(VALIDATION_MESSAGES.SLUG_NOT_DERIVABLE);

      const existing = await this.categoryRepository.findOne({
        where: { slug, id: Not(id) },
        select: { id: true },
      });
      if (existing) throw new ConflictException(CATEGORY_MESSAGES.SLUG_TAKEN);
      category.slug = slug;
    }

    // undefined = field not sent, leave the parent alone. null = promote to a
    // root. A uuid = move under that root.
    if (dto.parentId !== undefined && dto.parentId !== category.parentId) {
      if (dto.parentId === null) {
        category.parentId = null;
      } else {
        if (dto.parentId === id)
          throw new BadRequestException(CATEGORY_MESSAGES.PARENT_IS_SELF);

        // Moving a category that already has subcategories under another
        // category would make a third level.
        const childCount = await this.categoryRepository.count({
          where: { parentId: id },
        });
        if (childCount > 0)
          throw new BadRequestException(CATEGORY_MESSAGES.HAS_CHILDREN);

        const parent = await this.assertCanBeChildOf(dto.parentId);
        if (!parent.isActive && category.isActive) {
          throw new BadRequestException(CATEGORY_MESSAGES.PARENT_INACTIVE);
        }

        category.parentId = dto.parentId;
      }
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;

    const saved = await this.categoryRepository.save(category);

    return { message: CATEGORY_MESSAGES.UPDATED, category: saved };
  }
  // A root category's products include its subcategories' products, so the
  // product module needs the whole branch as a flat list of ids.
  async idsWithChildren(id: string): Promise<string[]> {
    const children = await this.categoryRepository.find({
      where: { parentId: id, isActive: true },
      select: { id: true },
    });

    return [id, ...children.map((child) => child.id)];
  }

  // Used by other modules (products) to validate a categoryId without
  // reaching into this module's repository.
  async existsById(id: string): Promise<boolean> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      select: { id: true },
    });

    return category !== null;
  }

  private async assertCanBeChildOf(parentId: string): Promise<Category> {
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId },
    });
    if (!parent)
      throw new NotFoundException(CATEGORY_MESSAGES.PARENT_NOT_FOUND);
    if (parent.parentId)
      throw new BadRequestException(CATEGORY_MESSAGES.MAX_DEPTH);

    return parent;
  }

  async findOne(slug: string) {
    const category = await this.categoryRepository.findOne({
      where: { slug, isActive: true },
    });
    if (!category) throw new NotFoundException(COMMON_MESSAGES.NOTFOUND);

    const children = await this.categoryRepository.find({
      where: { parentId: category.id, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return {
      message: CATEGORY_MESSAGES.FETCHED_ONE,
      category: { ...category, children },
    };
  }

  async findParents() {
    const categories = await this.categoryRepository.find({
      where: { parentId: IsNull(), isActive: true },
      select: { id: true, name: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return { message: CATEGORY_MESSAGES.PARENTS_FETCHED, categories };
  }

  async findAll(includeInactive = false) {
    const categories = await this.categoryRepository.find({
      where: includeInactive ? {} : { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return {
      message: CATEGORY_MESSAGES.FETCHED,
      categories: this.buildTree(categories),
    };
  }

  private buildTree(categories: Category[]): CategoryNode[] {
    const byId = new Map<string, CategoryNode>(
      categories.map((category) => [
        category.id,
        { ...category, children: [] },
      ]),
    );

    const roots: CategoryNode[] = [];
    for (const node of byId.values()) {
      if (!node.parentId) {
        roots.push(node);
        continue;
      }
      byId.get(node.parentId)?.children.push(node);
    }

    return roots;
  }
}
