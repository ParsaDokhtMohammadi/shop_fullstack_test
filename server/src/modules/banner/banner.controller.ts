import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { ListBannersDto } from './dto/list-banners.dto';

@ApiTags('Banners')
@Controller('banners')
// Public: no guard. The storefront renders these before anyone logs in.
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({
    summary: 'Active banners, in display order',
    description:
      'Switched-off banners are never returned, and the whole list comes back empty when bannerToggle is off in the shop settings. Filter to one slot with ?position=, or omit it to get every slot in one call.',
  })
  findActive(@Query() query: ListBannersDto) {
    return this.bannerService.findActive(query);
  }
}
