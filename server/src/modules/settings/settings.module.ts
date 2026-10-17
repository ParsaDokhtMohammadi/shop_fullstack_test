import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { Settings } from './entities/settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Settings])],
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  // Orders read shipping from here, inventory reads lowStockThreshold, banners
  // read bannerToggle. They use the service, never the repository.
  exports: [SettingsService],
})
export class SettingsModule {}
