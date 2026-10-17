import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './entities/banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { ListBannersDto } from './dto/list-banners.dto';
import { BANNER_MESSAGES } from '../../common/messages';
import { deleteUploadedFile, saveAsWebp } from '../../common/utils/image.util';
import { BannerPosition } from '../../common/enums/banner-position.enum';
import { SettingsService } from '../settings/settings.service';

// Wide and light: a banner is a full-width hero image, so it is worth more
// pixels than a category thumbnail but still must not ship a 4MB photo.
const BANNER_IMAGE = { quality: 80, width: 1920 };

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
    private readonly settingsService: SettingsService,
  ) {}

  // Public: active only, in display order. Honours the bannerToggle in settings
  // so a client can take the strip down without deleting anything — the toggle
  // is read here rather than in the controller, since it is a business rule.
  async findActive(query: ListBannersDto) {
    const settings = await this.settingsService.get();
    if (!settings.bannerToggle)
      return { message: BANNER_MESSAGES.FETCHED, payload: [] };

    const banners = await this.bannerRepository.find({
      where: {
        isActive: true,
        ...(query.position ? { position: query.position } : {}),
      },
      order: { position: 'ASC', sortOrder: 'ASC', createdAt: 'DESC' },
    });

    return {
      message: BANNER_MESSAGES.FETCHED,
      payload: banners.map((banner) => this.toPublic(banner)),
    };
  }

  // Admin: everything, including the banners that are switched off — they have
  // to be visible in the panel to be switched back on. Not paginated: a shop
  // has a handful of banners, so the list is bounded in practice.
  async findAll(query: ListBannersDto) {
    const banners = await this.bannerRepository.find({
      where: query.position ? { position: query.position } : {},
      order: { position: 'ASC', sortOrder: 'ASC', createdAt: 'DESC' },
    });

    return { message: BANNER_MESSAGES.FETCHED, payload: banners };
  }

  // The image is the banner — there is nothing to show without one, so it is
  // required rather than optional.
  async create(dto: CreateBannerDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException(BANNER_MESSAGES.IMAGE_REQUIRED);

    const imageUrl = await saveAsWebp(file, BANNER_IMAGE);

    const banner = await this.bannerRepository.save(
      this.bannerRepository.create({
        imageUrl,
        linkUrl: dto.linkUrl ?? null,
        title: dto.title ?? null,
        position: dto.position ?? BannerPosition.HomeSlider,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );

    return { message: BANNER_MESSAGES.CREATED, payload: banner };
  }

  // Only the fields sent are touched. A new image replaces the old file, but
  // only after the row is saved — see remove() for why.
  async update(id: string, dto: UpdateBannerDto, file?: Express.Multer.File) {
    const banner = await this.findOneOrFail(id);
    const previousImage = banner.imageUrl;

    if (file) banner.imageUrl = await saveAsWebp(file, BANNER_IMAGE);

    // An empty string clears the link — the only way a multipart form can send
    // "no value" rather than "unchanged".
    if (dto.linkUrl !== undefined) banner.linkUrl = dto.linkUrl || null;
    if (dto.title !== undefined) banner.title = dto.title || null;
    if (dto.position !== undefined) banner.position = dto.position;
    if (dto.sortOrder !== undefined) banner.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;

    const saved = await this.bannerRepository.save(banner);

    if (file) await deleteUploadedFile(previousImage);

    return { message: BANNER_MESSAGES.UPDATED, payload: saved };
  }

  // A hard delete, unlike categories: a banner carries no history and nothing
  // references it, so there is nothing to preserve. The file goes too, after
  // the row — a failed unlink then leaves a stray file rather than a banner
  // pointing at an image that is gone.
  async remove(id: string) {
    const banner = await this.findOneOrFail(id);

    await this.bannerRepository.delete({ id });
    await deleteUploadedFile(banner.imageUrl);

    return { message: BANNER_MESSAGES.DELETED, payload: { id } };
  }

  // The frontend sends the full list for one position after a drag-and-drop;
  // index becomes sortOrder.
  async reorder(dto: ReorderBannersDto) {
    const banners = await this.bannerRepository.find({
      where: { position: dto.position },
      select: { id: true },
    });
    if (!banners.length) throw new NotFoundException(BANNER_MESSAGES.NOT_FOUND);

    // Must be exactly this position's banners: a missing id would leave two
    // banners sharing a sortOrder, a foreign one would renumber another slot.
    const current = new Set(banners.map((banner) => banner.id));
    const sameSet =
      dto.bannerIds.length === current.size &&
      dto.bannerIds.every((id) => current.has(id));
    if (!sameSet) throw new BadRequestException(BANNER_MESSAGES.ORDER_MISMATCH);

    // One transaction, so a failure halfway never leaves a half-applied order.
    await this.bannerRepository.manager.transaction(async (manager) => {
      for (const [index, id] of dto.bannerIds.entries()) {
        await manager.update(Banner, { id }, { sortOrder: index });
      }
    });

    const reordered = await this.bannerRepository.find({
      where: { position: dto.position },
      order: { sortOrder: 'ASC' },
    });

    return { message: BANNER_MESSAGES.REORDERED, payload: reordered };
  }

  private async findOneOrFail(id: string) {
    const banner = await this.bannerRepository.findOneBy({ id });
    if (!banner) throw new NotFoundException(BANNER_MESSAGES.NOT_FOUND);

    return banner;
  }

  // sortOrder and isActive are admin bookkeeping: the storefront gets the list
  // already filtered and in order, so it has no use for them.
  private toPublic(banner: Banner) {
    return {
      id: banner.id,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      title: banner.title,
      position: banner.position,
    };
  }
}
