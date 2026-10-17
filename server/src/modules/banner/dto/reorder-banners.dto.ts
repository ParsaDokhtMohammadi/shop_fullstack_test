import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { BannerPosition } from '../../../common/enums/banner-position.enum';
import { VALIDATION_MESSAGES } from '../../../common/messages';

export class ReorderBannersDto {
  @ApiProperty({ enum: BannerPosition })
  @IsEnum(BannerPosition, {
    message: VALIDATION_MESSAGES.BANNER_POSITION_INVALID,
  })
  position!: BannerPosition;

  @ApiProperty({
    type: [String],
    description:
      'Every banner id in this position, in display order. The index becomes the sortOrder.',
  })
  @IsArray({ message: VALIDATION_MESSAGES.BANNER_IDS_INVALID })
  @ArrayMinSize(1, { message: VALIDATION_MESSAGES.BANNER_IDS_INVALID })
  @ArrayUnique({ message: VALIDATION_MESSAGES.BANNER_IDS_INVALID })
  @IsUUID('4', { each: true, message: VALIDATION_MESSAGES.BANNER_IDS_INVALID })
  bannerIds!: string[];
}
