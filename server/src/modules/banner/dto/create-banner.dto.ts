import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { BannerPosition } from '../../../common/enums/banner-position.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';
import { IsLinkUrl } from '../../../common/decorators/is-link-url.decorator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

// Multipart, because the image is uploaded — so every field arrives as a
// string and needs an explicit @Type / @ToBoolean before its validator runs.
export class CreateBannerDto {
  // Swagger only: this is where the file picker comes from. The value is read
  // from the upload, not the body, so it has no validator.
  @ApiProperty({ type: 'string', format: 'binary' })
  image?: unknown;

  @ApiPropertyOptional({
    example: '/category/shoes',
    description:
      'Where the banner links to. Either an in-shop path starting with a single slash, or an absolute http/https url. Omit for a banner that is not clickable.',
  })
  @IsOptional()
  @IsLinkUrl({ message: VALIDATION_MESSAGES.BANNER_LINK_INVALID })
  linkUrl?: string;

  @ApiPropertyOptional({ description: 'Alt text for the image.' })
  @IsOptional()
  @IsString({ message: VALIDATION_MESSAGES.BANNER_TITLE_INVALID })
  @Length(0, 160, { message: VALIDATION_MESSAGES.BANNER_TITLE_INVALID })
  title?: string;

  @ApiPropertyOptional({
    enum: BannerPosition,
    default: BannerPosition.HomeSlider,
  })
  @IsOptional()
  @IsEnum(BannerPosition, {
    message: VALIDATION_MESSAGES.BANNER_POSITION_INVALID,
  })
  position?: BannerPosition;

  @ApiPropertyOptional({ default: 0, description: 'Lower comes first.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: VALIDATION_MESSAGES.SORT_ORDER_INVALID })
  @Min(0, { message: VALIDATION_MESSAGES.SORT_ORDER_INVALID })
  sortOrder?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @ToBoolean()
  @IsBoolean({ message: VALIDATION_MESSAGES.IS_ACTIVE_INVALID })
  isActive?: boolean;
}
