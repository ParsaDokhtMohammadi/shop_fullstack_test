import { PartialType } from '@nestjs/swagger';
import { CreateBannerDto } from './create-banner.dto';

// Everything optional, image included: a banner can be edited without
// re-uploading its picture.
export class UpdateBannerDto extends PartialType(CreateBannerDto) {}
