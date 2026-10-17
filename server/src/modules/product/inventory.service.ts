import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { ProductVarient } from './entities/product-varient.entity';
import { SetStockDto } from './dto/set-stock.dto';
import { SettingsService } from '../settings/settings.service';
import { PaginationDto, paginated } from '../../common/dto';
import { PRODUCT_MESSAGES } from '../../common/messages';

// Stock, kept apart from ProductService. Editing a catalogue entry and running
// a warehouse are different jobs: this one is about a number that orders are
// also moving underneath it, which is why nothing in here reads a value into
// JavaScript and writes it back.
@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(ProductVarient)
    private readonly varientRepository: Repository<ProductVarient>,
    private readonly settingsService: SettingsService,
  ) {}

  async setStock(id: string, dto: SetStockDto) {
    // Both or neither is a frontend bug, and guessing which one was meant is
    // how stock ends up wrong.
    const sent = [dto.set, dto.adjust].filter((value) => value !== undefined);
    if (sent.length !== 1)
      throw new BadRequestException(PRODUCT_MESSAGES.STOCK_MODE_REQUIRED);

    const varient = await this.varientRepository.findOne({
      where: { id },
      select: { id: true, productId: true, stock: true },
    });
    if (!varient)
      throw new NotFoundException(PRODUCT_MESSAGES.VARIENT_NOT_FOUND);

    if (dto.adjust !== undefined) await this.adjust(id, dto.adjust);
    else await this.varientRepository.update({ id }, { stock: dto.set });

    const settings = await this.settingsService.get();
    const updated = await this.varientRepository.findOneByOrFail({ id });

    return {
      message: PRODUCT_MESSAGES.STOCK_UPDATED,
      payload: {
        id: updated.id,
        productId: updated.productId,
        stock: updated.stock,
        lowStockThreshold: settings.lowStockThreshold,
        isLow: updated.stock <= settings.lowStockThreshold,
      },
    };
  }

  // What to reorder. Sorted by the emptiest first, because that is the order an
  // admin works the list in.
  async findLowStock(dto: PaginationDto) {
    const settings = await this.settingsService.get();

    const [varients, total] = await this.varientRepository.findAndCount({
      where: {
        // Discontinued variants are excluded: a line that is not for sale does
        // not need restocking, and leaving them in would bury the real ones.
        isActive: true,
        stock: LessThanOrEqual(settings.lowStockThreshold),
      },
      relations: { product: true },
      order: { stock: 'ASC', updatedAt: 'DESC' },
      skip: dto.skip,
      take: dto.take,
    });

    return {
      message: PRODUCT_MESSAGES.LOW_STOCK_FETCHED,
      threshold: settings.lowStockThreshold,
      ...paginated(
        varients.map((varient) => ({
          id: varient.id,
          productId: varient.productId,
          productName: varient.product?.name ?? null,
          productSlug: varient.product?.slug ?? null,
          // The product may be unpublished while its variants still show here —
          // worth knowing before chasing a supplier for it.
          productIsActive: varient.product?.isActive ?? false,
          color: varient.color,
          size: varient.size,
          price: varient.price,
          stock: varient.stock,
        })),
        total,
        dto,
      ),
    };
  }

  // For the admin dashboard, which wants the number without the rows.
  async countLowStock(): Promise<{ threshold: number; count: number }> {
    const settings = await this.settingsService.get();
    const count = await this.varientRepository.count({
      where: {
        isActive: true,
        stock: LessThanOrEqual(settings.lowStockThreshold),
      },
    });

    return { threshold: settings.lowStockThreshold, count };
  }

  // One conditional UPDATE, so the arithmetic happens in Postgres: read-then-
  // write would silently undo an order that decremented the same row in
  // between, and the WHERE is what stops stock going negative.
  private async adjust(id: string, delta: number): Promise<void> {
    const result = await this.varientRepository
      .createQueryBuilder()
      .update(ProductVarient)
      .set({ stock: () => '"stock" + :delta' })
      .where('id = :id', { id })
      .andWhere('"stock" + :delta >= 0')
      .setParameter('delta', delta)
      .execute();

    if (result.affected) return;

    // Nothing was written, so the only reason is the guard above. Re-read to
    // tell the admin what is actually on the shelf.
    const current = await this.varientRepository.findOne({
      where: { id },
      select: { stock: true },
    });

    throw new BadRequestException(
      PRODUCT_MESSAGES.STOCK_INSUFFICIENT(current?.stock ?? 0),
    );
  }
}
