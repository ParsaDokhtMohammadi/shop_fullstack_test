import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from './entities/settings.entity';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { SETTINGS_MESSAGES } from '../../common/messages';
import { deleteUploadedFile, saveAsWebp } from '../../common/utils/image.util';
import { env } from '../../config/env.config';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  // The single row, created on first use. A fresh client deployment has an
  // empty table, and no caller can cope with null — the storefront needs a shop
  // name to render a header — so the row is made here rather than in a seed
  // script somebody has to remember to run.
  async get(): Promise<Settings> {
    const existing = await this.settingsRepository.findOneBy({ id: true });
    if (existing) return existing;

    return this.settingsRepository.save(
      this.settingsRepository.create({ id: true, name: env.shopName }),
    );
  }

  // The whole row, for the admin panel's settings form: it needs the operational
  // fields the public endpoint withholds.
  async findAdmin() {
    const settings = await this.get();

    return { message: SETTINGS_MESSAGES.FETCHED, payload: settings };
  }

  // Deliberately a subset, not the row: lowStockThreshold is an operational
  // detail, and a public endpoint announcing when you reorder is free
  // reconnaissance.
  async findPublic() {
    const settings = await this.get();

    return {
      message: SETTINGS_MESSAGES.FETCHED,
      payload: {
        name: settings.name,
        logoUrl: settings.logoUrl,
        supportNumber: settings.supportNumber,
        supportEmail: settings.supportEmail,
        address: settings.address,
        socials: settings.socials,
        // The storefront needs both to show "free shipping over X" before
        // checkout, so these two are public on purpose.
        shippingCost: settings.shippingCost,
        freeShippingThreshold: settings.freeShippingThreshold,
        bannerToggle: settings.bannerToggle,
      },
    };
  }

  // There is only ever one row, so create and update are the same operation:
  // the row is fetched (or made), the fields that were sent are applied, and
  // the rest are left alone.
  async upsert(dto: UpsertSettingsDto, logo?: Express.Multer.File) {
    const settings = await this.get();
    const previousLogo = settings.logoUrl;

    if (logo)
      settings.logoUrl = await saveAsWebp(logo, { quality: 90, width: 600 });

    if (dto.name !== undefined) settings.name = dto.name;
    if (dto.supportNumber !== undefined)
      settings.supportNumber = dto.supportNumber;
    if (dto.supportEmail !== undefined)
      settings.supportEmail = dto.supportEmail;
    if (dto.address !== undefined) settings.address = dto.address;
    if (dto.socials !== undefined) settings.socials = dto.socials;
    if (dto.shippingCost !== undefined)
      settings.shippingCost = dto.shippingCost;
    if (dto.lowStockThreshold !== undefined)
      settings.lowStockThreshold = dto.lowStockThreshold;
    if (dto.bannerToggle !== undefined)
      settings.bannerToggle = dto.bannerToggle;

    // An empty string means "never free", which is null in the column — the
    // only way a multipart form can clear a field.
    if (dto.freeShippingThreshold !== undefined)
      settings.freeShippingThreshold = dto.freeShippingThreshold || null;

    const saved = await this.settingsRepository.save(settings);

    // Only once the row is safely written: the old file is unreachable then, so
    // a failed delete leaves a stray file rather than a broken logo.
    if (logo && previousLogo) await deleteUploadedFile(previousLogo);

    return { message: SETTINGS_MESSAGES.UPDATED, payload: saved };
  }
}
