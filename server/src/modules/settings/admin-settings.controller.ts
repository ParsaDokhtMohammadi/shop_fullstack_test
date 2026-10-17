import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { UploadImage } from '../../common/decorators/upload-image.decorator';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AUTH_COOKIE } from '../../common/utils/cookie.util';

@ApiTags('Admin · Settings')
@Controller('admin/settings')
// Every route here is admin-only, so the guard belongs on the class.
@ApiCookieAuth(AUTH_COOKIE)
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'The full shop settings',
    description:
      'The whole row, including the low stock threshold that GET /settings withholds. This is what the settings form in the admin panel loads. The payment gateway and the sms sender are not here and are not settable: both are chosen from env at boot, because each has to agree with a merchant id or api key that never belongs in a table any admin can read.',
  })
  findAdmin() {
    return this.settingsService.findAdmin();
  }

  @Post()
  @UploadImage('logo')
  @ApiOperation({
    summary: 'Save the shop settings',
    description:
      'Multipart, so the logo can be uploaded rather than pasted as a url. There is only one settings row, so this both creates it and updates it: only the fields sent are changed. Sending a new logo replaces the old file. Send freeShippingThreshold empty to turn free shipping off.',
  })
  upsert(
    @Body() dto: UpsertSettingsDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.settingsService.upsert(dto, logo);
  }
}
