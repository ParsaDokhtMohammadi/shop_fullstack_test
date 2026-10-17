import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@Controller('settings')
// Public: no guard. The storefront calls this before anyone logs in.
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Public shop info',
    description:
      'Branding, contact details, socials and the shipping rule. Deliberately a subset of the settings row: the low stock threshold is not public. Always returns a row, even on a shop where no admin has saved settings yet.',
  })
  findPublic() {
    return this.settingsService.findPublic();
  }
}
