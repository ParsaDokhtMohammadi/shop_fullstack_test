import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';
import { AdminBannerController } from './admin-banner.controller';
import { Banner } from './entities/banner.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  // SettingsModule, not the settings repository: the bannerToggle is read
  // through its service like any other cross-module value.
  imports: [TypeOrmModule.forFeature([Banner]), SettingsModule],
  controllers: [BannerController, AdminBannerController],
  providers: [BannerService],
})
export class BannerModule {}
