import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { ReorderBannersDto } from './dto/reorder-banners.dto';
import { ListBannersDto } from './dto/list-banners.dto';
import { UploadImage } from '../../common/decorators/upload-image.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Banners')
@Controller('admin/banners')
// Every route here is admin-only, so the guard belongs on the class.
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminBannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Get()
  @ApiOperation({
    summary: 'Every banner',
    description:
      'Includes the switched-off ones, which the public endpoint hides — the panel has to show them to turn them back on.',
  })
  findAll(@Query() query: ListBannersDto) {
    return this.bannerService.findAll(query);
  }

  @Post()
  @UploadImage()
  @ApiOperation({
    summary: 'Create a banner',
    description:
      'Multipart. The image is required — a banner is the image. It is converted to webp and capped at 1920px wide.',
  })
  create(
    @Body() dto: CreateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bannerService.create(dto, file);
  }

  // Declared before PATCH :id so the literal path is never read as an id.
  @Patch('reorder')
  @ApiOperation({
    summary: 'Reorder the banners of one position',
    description:
      'Send every banner id of that position in display order; the index becomes the sortOrder. Applied in one transaction. Refused unless the list is exactly that position\u2019s banners.',
  })
  reorder(@Body() dto: ReorderBannersDto) {
    return this.bannerService.reorder(dto);
  }

  @Patch(':id')
  @UploadImage()
  @ApiOperation({
    summary: 'Edit a banner',
    description:
      'Multipart, every field optional. Send an image only to replace the current one; the old file is deleted. Send linkUrl empty to clear the link. Use isActive to switch a banner off without deleting it.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBannerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.bannerService.update(id, dto, file);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a banner',
    description:
      'A real delete, and the uploaded image goes with it. Nothing references a banner, so there is no history to keep — switch it off with isActive instead if it may come back.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.bannerService.remove(id);
  }
}
